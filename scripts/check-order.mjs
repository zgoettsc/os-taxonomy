#!/usr/bin/env node
// CI guard: the full taxonomy must sequence into a hard-violation-free, cycle-free
// teaching order. Fails (exit 1) if any hard prerequisite would be taught after its
// dependent, or if the hard-edge graph has a cycle. Run: node scripts/check-order.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sequenceTopics, validateOrder } from './sequence.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const topics = JSON.parse(readFileSync(join(dir, 'topics.json'), 'utf8')).topics;
const deps = JSON.parse(readFileSync(join(dir, 'dependencies.json'), 'utf8')).dependencies;
const byId = new Map(topics.map((t) => [t.id, t]));

const { order, cycleNodes } = sequenceTopics(topics, deps);
const v = validateOrder(order.map((t) => t.id), deps, { byId });
console.log(`Sequenced ${order.length}/${topics.length} topics · hard violations: ${v.hardViolations.length} · soft: ${v.softViolations.length} · cycles: ${cycleNodes.length}`);

if (cycleNodes.length) { console.error('FAIL — hard-edge cycle among:', cycleNodes.slice(0, 20).join(', ')); process.exit(1); }
if (v.hardViolations.length) {
  console.error('FAIL — hard prerequisite ordered after its dependent:');
  v.hardViolations.slice(0, 20).forEach((x) => console.error(`  • ${x.prerequisite} must precede ${x.topic} — ${x.reason}`));
  process.exit(1);
}
console.log('OK — clean DAG; the sequencer emits a hard-violation-free order.');
