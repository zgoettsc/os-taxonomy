#!/usr/bin/env node
// Compose a balanced, WHOLE-CURRICULUM learning session from the taxonomy.
//
//   node scripts/session.mjs --age 8 --name "Simon"
//   node scripts/session.mjs --age 8 --size 6 --mastered mt_x,mt_y
//   node scripts/session.mjs --age 8 --allow mt_pu2mmK27UA   (opt in to a gated topic)
//
// This is the engine behind the child's Home screen. Where homeschool-plan.mjs
// lists everything ready per subject, this picks ONE balanced session that spans
// subjects — never math-only. It also tags each card with how its content is
// produced (code generator vs. the knowledge pipeline) and honors the parent
// sensitivity gates (data/sensitivity-flags.json): gate_default:'hide' topics are
// withheld unless the parent opts in via --allow / the per-child setting.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { americanize as A } from './americanize.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', f), 'utf8'));

// --- lane / content-source classification ---------------------------------
// A card's LANE is what the child does; its SOURCE is how content is produced.
//   practice (procedural) → code generators, live today, zero AI  (Math + some skills)
//   lesson  (conceptual)  → the knowledge pipeline (real once the backend has keys)
export function laneOf(topic) {
  const procedural = topic.type === 'PROCEDURAL' ||
    (topic.subject === 'Mathematics' && topic.type !== 'CONCEPTUAL');
  return procedural
    ? { lane: 'practice', source: 'generator' }   // correct-by-construction
    : { lane: 'lesson',   source: 'pipeline'   };  // grounded + verified content
}

// --- readiness (shared with homeschool-plan.mjs) --------------------------
export function readyBySubject(topics, deps, age, { mastered = new Set(), gates } = {}) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const hardPrereqs = new Map();
  for (const d of deps) {
    if (d.strength !== 'hard') continue;
    (hardPrereqs.get(d.topicId) || hardPrereqs.set(d.topicId, []).get(d.topicId)).push(d.prerequisiteId);
  }
  const known = (t) => mastered.has(t.id) || t.ageRangeEnd < age;
  const inBand = (t) => t.ageRangeStart <= age && t.ageRangeEnd >= age;

  const ready = topics.filter((t) => {
    if (!inBand(t) || known(t)) return false;
    if (gates && gates.hidden.has(t.id) && !gates.allowed.has(t.id)) return false; // sensitivity gate
    const pre = hardPrereqs.get(t.id) || [];
    return pre.every((p) => { const pt = byId.get(p); return !pt || known(pt); });
  });
  // Foundations first: higher centrality, then earlier start age.
  ready.sort((a, b) => (b.centrality || 0) - (a.centrality || 0) || a.ageRangeStart - b.ageRangeStart);

  const bySubject = {};
  for (const t of ready) (bySubject[t.subject] ||= []).push(t);
  return bySubject;
}

// --- the composer ---------------------------------------------------------
// Guarantee the daily core (English, Mathematics, Science) every session, then
// rotate the remaining subjects so History / PSD / Life Skills / Computing /
// Learning to Learn all get their turn across sessions. `seed` rotates the mix.
const CORE = ['English', 'Mathematics', 'Science'];
const ROTATE = ['History', 'Personal & Social Development', 'Life Skills', 'Computing', 'Learning to Learn'];

export function composeSession(topics, deps, age, opts = {}) {
  const { mastered = new Set(), size = 6, seed = 0, gates } = opts;
  const bySubject = readyBySubject(topics, deps, age, { mastered, gates });
  // Subjects with something ready, CORE-first; each gets a distinct-topic queue
  // rotated by the day seed. Round-robin one per subject → breadth before repeats.
  const order = [...CORE, ...ROTATE].filter((s) => bySubject[s]?.length);
  const q = {};
  for (const s of order) { const l = bySubject[s], off = l.length ? seed % l.length : 0; q[s] = l.slice(off).concat(l.slice(0, off)); }

  const cards = []; let progressed = true;
  while (cards.length < size && progressed) {
    progressed = false;
    for (const s of order) {
      if (cards.length >= size) break;
      if (q[s].length) { cards.push(q[s].shift()); progressed = true; }
    }
  }
  return cards.map((t) => ({ topic: t, ...laneOf(t) }));
}

// --- CLI ------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[++i];
  }
  const age = Number(argv.age);
  if (!age) { console.error('Usage: node scripts/session.mjs --age <n> [--name X] [--size 6] [--seed 0] [--mastered id,id] [--allow id,id]'); process.exit(1); }
  const name = argv.name || 'your child';
  const topics = read('topics.json').topics;
  const deps = read('dependencies.json').dependencies;

  // sensitivity gates
  let gates = { hidden: new Set(), allowed: new Set((argv.allow || '').split(',').filter(Boolean)) };
  try {
    const flags = read('sensitivity-flags.json').flags;
    for (const f of flags) if (f.sensitivity.gate_default === 'hide') gates.hidden.add(f.id);
  } catch {}

  const session = composeSession(topics, deps, age, {
    mastered: new Set((argv.mastered || '').split(',').filter(Boolean)),
    size: Number(argv.size) || 6, seed: Number(argv.seed) || 0, gates,
  });

  console.log(`\nToday's session — ${name}, age ${age}   (${session.length} cards across ${new Set(session.map(c=>c.topic.subject)).size} subjects)\n`);
  for (const { topic: t, lane, source } of session) {
    const badge = lane === 'practice' ? 'PRACTICE (code-generated)' : 'LESSON  (knowledge pipeline)';
    console.log(`  ${A(t.subject).padEnd(30)} ${badge}`);
    console.log(`    ${A(t.name)}  [${t.ageRangeStart}-${t.ageRangeEnd}] · ${A(t.domain)}`);
    console.log(`      ${A(t.description || '').slice(0, 110)}...`);
    console.log('');
  }
  const hiddenCount = gates.hidden.size - [...gates.hidden].filter(id=>gates.allowed.has(id)).length;
  if (hiddenCount) console.log(`  (${hiddenCount} parent-gated topic(s) withheld — opt in per child to include.)\n`);
}
