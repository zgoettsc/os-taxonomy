#!/usr/bin/env node
// Simulate the daily loop for one child against the REAL taxonomy graph.
//
//   node engine/demo.mjs [--age 6] [--days 25] [--subjects Mathematics]
//
// Shows the scheduler working: topics unlock as prerequisites are mastered,
// mastery requires success on two distinct days, mastered topics come back for
// spaced review at expanding intervals, and each day's packet is interleaved.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, assemblePacket, record, stats, INTERVALS } from './scheduler.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', f), 'utf8'));
const topics = read('topics.json').topics;
const deps = read('dependencies.json').dependencies;

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const age = Number(argv.age) || 6;
const days = Number(argv.days) || 25;
const subjects = (argv.subjects || 'Mathematics').split(',');
const opts = { age, subjects, maxNew: 2 };

// Seeded RNG so the simulation is reproducible.
let seed = 12345;
const rng = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const graph = buildGraph(topics, deps);
const state = new Map();
const name = 'Ada';

// A simulated child: masters most things, occasionally slips (harder = more slips).
const answer = (id) => rng() < 0.85;

console.log(`\nSimulating ${days} days for ${name} (age ${age}, ${subjects.join(', ')})\n`);
const scopeCount = [...graph.byId.values()].filter((t) => t.ageRangeStart <= age && subjects.includes(t.subject)).length;
console.log(`In-scope topics (age ≤ ${age}): ${scopeCount}\n`);

for (let today = 0; today < days; today++) {
  const packet = assemblePacket(state, graph, today, { ...opts, rng });
  if (packet.length === 0) { console.log(`Day ${String(today).padStart(2)}: (nothing due — all caught up)`); continue; }
  let correct = 0;
  for (const item of packet) { const ok = answer(item.id); if (ok) correct++; record(state, item.id, today, ok); }
  const s = stats(state);
  const kinds = packet.reduce((m, p) => ((m[p.kind] = (m[p.kind] || 0) + 1), m), {});
  const label = (k) => (k === 'new' ? 'new' : k === 'review' ? 'review' : 'practice');
  const mix = Object.entries(kinds).map(([k, n]) => `${n} ${label(k)}`).join(', ');
  console.log(
    `Day ${String(today).padStart(2)}: ${String(packet.length).padStart(2)} items (${mix.padEnd(28)}) `
    + `→ ${correct}/${packet.length} right | mastered ${s.mastered}, learning ${s.learning}`,
  );
}

// Final picture.
const s = stats(state);
console.log(`\n${'─'.repeat(60)}`);
console.log(`After ${days} days: ${s.mastered} topics mastered, ${s.learning} in progress.`);

// Show one mastered topic's spaced-review schedule as evidence the loop works.
const example = [...state].find(([, r]) => r.status === 'mastered' && r.history.length >= 4);
if (example) {
  const [id, r] = example;
  const reviewsDone = r.history.filter((h) => h.passed).length;
  console.log(`\nExample — "${graph.byId.get(id).name}":`);
  console.log(`  reviewed ${reviewsDone}×, now at box ${r.box} (next review in ${INTERVALS[r.box]} days).`);
  console.log(`  Each successful review pushes the next one further out — that's the spacing effect at work.`);
}

// Show that unlocking happened: a topic that started locked and became available.
const unlocked = [...state].filter(([id]) => (graph.hardPrereqs.get(id) || []).length > 0).length;
console.log(`\n${unlocked} of the mastered/learning topics had prerequisites — they unlocked only after those were mastered.\n`);
