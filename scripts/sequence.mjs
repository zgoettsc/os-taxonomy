#!/usr/bin/env node
/**
 * sequence.mjs — deterministic teaching-order generator for the Marble taxonomy.
 *
 * Problem it fixes: ordering topics by `centrality` (descending) is NOT a
 * topological sort. Wherever a hard prerequisite has lower-or-equal centrality
 * than the topic that depends on it, the centrality sort emits them backwards.
 *
 * Fix: Kahn's algorithm over the HARD-edge subgraph, with centrality (and soft
 * edges + age) used only as a TIEBREAKER among topics whose hard prerequisites
 * are already satisfied. Result: "most important first" feel, but no topic can
 * ever precede a hard prerequisite.
 *
 * Two exports:
 *   sequenceTopics(topics, deps, opts)  -> ordered array of topic objects
 *   validateOrder(orderIds, deps, opts) -> { hardViolations, softViolations, unscheduledPrereqs }
 *
 * Pure Node, no dependencies. Semantics: an edge {topicId, prerequisiteId}
 * means `prerequisiteId` MUST be taught before `topicId`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---------------------------------------------------------------------------
// Core: build a teaching order.
// ---------------------------------------------------------------------------

/**
 * @param {Array} topics  topic objects (already filtered to the cohort you want to emit)
 * @param {Array} deps    ALL dependency edges (unfiltered — we intersect internally)
 * @param {Object} [opts]
 * @param {boolean} [opts.respectSoft=true]  prefer emitting a topic once its soft
 *        prerequisites are also satisfied (a preference, never a hard block)
 * @param {(a,b)=>number} [opts.tiebreak]    custom comparator among ready topics;
 *        defaults to centrality desc, then younger age first, then id for stability
 * @returns {{ order: Array, cycleNodes: string[] }}
 */
export function sequenceTopics(topics, deps, opts = {}) {
  const respectSoft = opts.respectSoft !== false;
  const cohort = new Set(topics.map(t => t.id));
  const byId = new Map(topics.map(t => [t.id, t]));

  // Hard/soft prerequisite sets, restricted to in-cohort prereqs.
  // (A hard prereq that lives outside the cohort is assumed already taught.)
  const hardPrereq = new Map();   // topicId -> Set(prereqId)
  const softPrereq = new Map();   // topicId -> Set(prereqId)
  const hardDependents = new Map(); // prereqId -> [topicId,...]
  let externalHardPrereqs = 0;

  for (const t of topics) { hardPrereq.set(t.id, new Set()); softPrereq.set(t.id, new Set()); }

  for (const e of deps) {
    if (!cohort.has(e.topicId)) continue;           // dependent not in this cohort
    if (!cohort.has(e.prerequisiteId)) {            // prereq outside cohort -> assume satisfied
      if (e.strength === 'hard') externalHardPrereqs++;
      continue;
    }
    if (e.strength === 'hard') {
      hardPrereq.get(e.topicId).add(e.prerequisiteId);
      (hardDependents.get(e.prerequisiteId) ?? hardDependents.set(e.prerequisiteId, []).get(e.prerequisiteId))
        .push(e.topicId);
    } else {
      softPrereq.get(e.topicId).add(e.prerequisiteId);
    }
  }

  const indegree = new Map(topics.map(t => [t.id, hardPrereq.get(t.id).size]));
  const emitted = new Set();
  const order = [];

  const tiebreak = opts.tiebreak ?? defaultTiebreak;

  // Priority among ready nodes:
  //   1. (if respectSoft) topics whose soft prereqs are all emitted come first
  //   2. caller tiebreak (centrality desc -> younger age -> id)
  const pick = (ready) => {
    let best = null;
    for (const id of ready) {
      if (best === null) { best = id; continue; }
      if (compare(id, best) < 0) best = id;
    }
    return best;
  };
  const softReady = (id) => {
    for (const p of softPrereq.get(id)) if (!emitted.has(p)) return false;
    return true;
  };
  const compare = (a, b) => {
    if (respectSoft) {
      const sa = softReady(a), sb = softReady(b);
      if (sa !== sb) return sa ? -1 : 1;
    }
    return tiebreak(byId.get(a), byId.get(b));
  };

  let ready = new Set([...indegree].filter(([, d]) => d === 0).map(([id]) => id));

  while (ready.size) {
    const id = pick(ready);
    ready.delete(id);
    emitted.add(id);
    order.push(byId.get(id));
    for (const dep of hardDependents.get(id) ?? []) {
      const d = indegree.get(dep) - 1;
      indegree.set(dep, d);
      if (d === 0) ready.add(dep);
    }
  }

  // Anything left has an unsatisfiable hard prereq => a cycle in the hard graph.
  const cycleNodes = topics.filter(t => !emitted.has(t.id)).map(t => t.id);

  return { order, cycleNodes, externalHardPrereqs };
}

function defaultTiebreak(a, b) {
  // centrality descending (structural importance first)
  const c = (b.centrality ?? 0) - (a.centrality ?? 0);
  if (c) return c;
  // then younger-appropriate first
  const age = (a.ageRangeStart ?? 0) - (b.ageRangeStart ?? 0);
  if (age) return age;
  // then stable by id
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Validator: does a given order ever place a hard prereq AFTER its dependent?
// ---------------------------------------------------------------------------

/**
 * @param {string[]} orderIds  topic ids in the order they will be taught
 * @param {Array} deps         all dependency edges
 * @param {Object} [opts]
 * @param {Map<string,object>} [opts.byId]  id->topic, for nicer messages
 * @returns {{hardViolations:Array, softViolations:Array, unscheduledPrereqs:Array}}
 */
export function validateOrder(orderIds, deps, opts = {}) {
  const pos = new Map(orderIds.map((id, i) => [id, i]));
  const inOrder = (id) => pos.has(id);
  const name = (id) => opts.byId?.get(id)?.name ?? id;

  const hardViolations = [];
  const softViolations = [];
  const unscheduledPrereqs = [];

  for (const e of deps) {
    if (!inOrder(e.topicId)) continue;            // dependent not in this binder
    if (!inOrder(e.prerequisiteId)) {
      if (e.strength === 'hard') unscheduledPrereqs.push({
        topic: name(e.topicId), prerequisite: name(e.prerequisiteId),
        note: 'hard prerequisite not scheduled in this order (ok only if taught in an earlier binder)'
      });
      continue;
    }
    if (pos.get(e.prerequisiteId) > pos.get(e.topicId)) {
      const rec = {
        topic: name(e.topicId), topicPos: pos.get(e.topicId) + 1,
        prerequisite: name(e.prerequisiteId), prerequisitePos: pos.get(e.prerequisiteId) + 1,
        reason: e.reason ?? ''
      };
      (e.strength === 'hard' ? hardViolations : softViolations).push(rec);
    }
  }
  return { hardViolations, softViolations, unscheduledPrereqs };
}

// ---------------------------------------------------------------------------
// Convenience: filter a cohort by subject / age.
// ---------------------------------------------------------------------------

export function cohort(topics, { subject, age } = {}) {
  return topics.filter(t =>
    (subject == null || t.subject === subject) &&
    (age == null || (t.ageRangeStart <= age && age <= t.ageRangeEnd))
  );
}

// ---------------------------------------------------------------------------
// CLI:  node sequence.mjs [--data ../data] [--subject Mathematics] [--age 4]
// ---------------------------------------------------------------------------

function loadData(dir) {
  const topics = JSON.parse(readFileSync(join(dir, 'topics.json'), 'utf8')).topics;
  const deps = JSON.parse(readFileSync(join(dir, 'dependencies.json'), 'utf8')).dependencies;
  return { topics, deps };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = Object.fromEntries(
    process.argv.slice(2).join(' ').split('--').filter(Boolean)
      .map(s => s.trim().split(/\s+/)).map(([k, ...v]) => [k, v.join(' ') || true])
  );
  const dataDir = args.data || join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const { topics, deps } = loadData(dataDir);
  const byId = new Map(topics.map(t => [t.id, t]));

  const sub = cohort(topics, { subject: args.subject, age: args.age ? Number(args.age) : undefined });
  const { order, cycleNodes, externalHardPrereqs } = sequenceTopics(sub, deps);

  console.log(`# ${args.subject ?? 'All subjects'}${args.age ? ` · age ${args.age}` : ''} — ${order.length} topics`);
  if (externalHardPrereqs) console.log(`# (${externalHardPrereqs} hard prereqs live outside this cohort; assumed already taught)`);
  order.forEach((t, i) =>
    console.log(`${String(i + 1).padStart(2)}. ${t.name}  ·  cen=${(t.centrality ?? 0).toFixed(3)}  age${t.ageRangeStart}-${t.ageRangeEnd}`));

  const v = validateOrder(order.map(t => t.id), deps, { byId });
  console.log(`\n# self-check — hard violations: ${v.hardViolations.length}, soft: ${v.softViolations.length}`);
  if (cycleNodes.length) console.log(`# WARNING: hard-edge cycle among: ${cycleNodes.join(', ')}`);
}
