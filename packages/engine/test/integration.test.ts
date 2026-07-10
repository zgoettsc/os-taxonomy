// Integration test — drive the engine over the REAL taxonomy for many days and
// assert the invariants hold. This is the regression guard for "the whole loop
// still works" on real data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../src/graph.ts';
import { assemblePacket, record, readyToStart, stats, inScope } from '../src/scheduler.ts';
import type { Topic, Dependency, MasteryState } from '../src/types.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const topics = JSON.parse(fs.readFileSync(path.join(root, 'data/topics.json'), 'utf8')).topics as Topic[];
const deps = JSON.parse(fs.readFileSync(path.join(root, 'data/dependencies.json'), 'utf8')).dependencies as Dependency[];
const graph = buildGraph(topics, deps);

// Seeded RNG so the run is deterministic.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('30-day simulation on the real graph holds all invariants', () => {
  const opts = { age: 6, subjects: ['Mathematics'], maxNew: 2 };
  const state: MasteryState = new Map();
  const r = rng(12345);
  const masteredOverTime: number[] = [];

  for (let day = 0; day < 30; day++) {
    const packet = assemblePacket(state, graph, day, { ...opts, rng: r });
    for (const item of packet) record(state, item.id, day, r() < 0.85);
    masteredOverTime.push(stats(state).mastered);
  }

  const s = stats(state);
  // Progress happened.
  assert.ok(s.mastered > 0, 'some topics mastered');
  assert.ok(masteredOverTime[29] >= masteredOverTime[9], 'mastery is non-decreasing over the run');

  // Gating invariant: no topic was introduced before its in-scope hard prereqs.
  for (const id of state.keys()) {
    const pre = graph.hardPrereqs.get(id) ?? [];
    for (const p of pre) {
      const pt = graph.byId.get(p);
      if (pt && inScope(pt, opts)) {
        assert.ok(state.has(p), `prereq ${p} of ${id} was introduced before ${id}`);
      }
    }
  }

  // Spaced review actually recurs: at least one topic reviewed 3+ times.
  const maxReviews = Math.max(...[...state.values()].map((rec) => rec.history.length));
  assert.ok(maxReviews >= 3, 'at least one topic accrued repeated reviews');

  // readyToStart never returns an already-tracked topic.
  const ready = readyToStart(state, graph, opts);
  assert.ok(ready.every((id) => !state.has(id)), 'ready set excludes tracked topics');
});
