#!/usr/bin/env node
// Dump the RAW grounding we would pull for a topic, from EVERY source.
//   node pipeline/ground-dump.mjs --topic mt_xxx [--commercial]
//
// Fetch-only — no model call, no keys, no DB write. Just runs every source
// adapter live and shows exactly what came back. Needs open egress, so run it in
// the "Dump grounding" GitHub Action (the dev sandbox blocks these hosts). Writes
// the full grounding JSON to pipeline/out/grounding-<id>.json and prints a
// per-source summary so you can judge the raw material before generating.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gatherGrounding, sourcesForTopic } from './sources.mjs';
import { liveFetch, ADAPTER_STATUS } from './fetchers.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const topics = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'topics.json'), 'utf8')).topics;

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1]; }
const topic = topics.find((t) => t.id === argv.topic);
if (!topic) { console.error('Usage: node pipeline/ground-dump.mjs --topic mt_... [--commercial]'); process.exit(1); }
const allowNonCommercial = !process.argv.includes('--commercial');

const chosen = sourcesForTopic(topic, { allowNonCommercial });
const sourced = await gatherGrounding(topic, { allowNonCommercial, live: true, fetchImpl: liveFetch });

const bySource = {};
for (const g of sourced.grounding) (bySource[g.source] ||= []).push(g);

console.log(`\nGrounding dump — ${topic.name} (${topic.subject} · ${topic.domain} · age ${topic.ageRangeStart}-${topic.ageRangeEnd})`);
console.log(`Sources consulted: ${chosen.length}  (${allowNonCommercial ? 'personal' : 'commercial'} mode)\n`);
let liveCount = 0, totalChars = 0;
for (const s of chosen) {
  const got = bySource[s.id] || [];
  const chars = got.reduce((n, g) => n + (g.text || '').length, 0);
  if (got.length) { liveCount++; totalChars += chars; }
  const status = got.length ? `LIVE   ${got.length} passage(s) · ${chars} chars · ${got[0].title || ''}`
                            : `—      ${ADAPTER_STATUS[s.id] || 'no adapter'}`;
  console.log(`  ${s.id.padEnd(14)} ${status}`);
}
console.log(`\n${liveCount} of ${chosen.length} sources returned live passages · ${totalChars} chars of grounding total`);
console.log('(Plus the taxonomy description, which the generator also uses as an anchor.)\n');

const out = {
  topic: { id: topic.id, name: topic.name, subject: topic.subject, domain: topic.domain, ageRange: [topic.ageRangeStart, topic.ageRangeEnd], description: topic.description },
  mode: sourced.mode,
  sourcesConsulted: chosen.map((s) => s.id),
  adapterStatus: ADAPTER_STATUS,
  grounding: sourced.grounding, // the FULL raw passages, per source, with text + url
};
const outDir = path.join(dir, 'out'); fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `grounding-${topic.id}.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`Full raw grounding (every passage, verbatim) → ${path.relative(path.join(dir, '..'), outPath)}\n`);
