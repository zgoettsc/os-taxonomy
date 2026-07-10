#!/usr/bin/env node
// Content pipeline — generate a reviewed-gated content file for ANY topic.
//
//   node pipeline/generate.mjs --topic mt_xxxx [--provider mock|claude]
//   node pipeline/generate.mjs --age 6 --subject Science   # pick a topic for you
//
// Stages (docs/content-pipeline.md):
//   1. Ground   — gather authoritative source text for the topic (standards +
//                 OER stubs). Nothing is generated from thin air.
//   2. Generate — provider adapts the grounding into the content schema.
//   3. Fill-in  — attach code-generated math (correct by construction) and a
//                 procedural illustration.
//   4. Verify   — check citations + structure; flag anything unsupported.
//   5. Gate     — stamp provenance, set reviewed:false, write to pipeline/out/.
//
// This is the COVERAGE answer: run it over the taxonomy and every topic gets a
// content file — no hand-authoring per topic.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProvider } from './provider.mjs';
import { verify } from './verify.mjs';
import { mascotSVG, seedFromId } from './illustrate.mjs';
import { GENERATORS } from '../scripts/generators.mjs';
import { americanizeDeep } from '../scripts/americanize.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const topics = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'topics.json'), 'utf8')).topics;
const standards = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'curriculum-standards.json'), 'utf8'));

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }

// Pick the topic.
let topic;
if (argv.topic) topic = topics.find((t) => t.id === argv.topic);
else {
  const age = Number(argv.age) || 6, subj = argv.subject || 'Science';
  topic = topics.find((t) => t.subject === subj && t.ageRangeStart <= age && t.ageRangeEnd >= age);
}
if (!topic) { console.error('No topic found. Use --topic <id> or --age/--subject.'); process.exit(1); }

// --- 1. Ground: collect authoritative source text -------------------------
// Real pipeline runs RAG over OER; here we ground in the standards the topic is
// distilled from (already in the repo), which are authoritative by definition.
function findStandard(key) {
  // curriculum-standards.json is grouped by curriculum; do a shallow search.
  const flat = JSON.stringify(standards);
  const idx = flat.indexOf(key.split(':').pop());
  return idx >= 0 ? key : null;
}
const grounding = (topic.standards || []).map((s) => ({
  source: s,
  text: findStandard(s) ? `Curriculum standard ${s} (see data/curriculum-standards.json).` : `Standard ${s}.`,
  verified: !!findStandard(s),
}));
if (topic.description) grounding.push({ source: 'taxonomy:description', text: topic.description, verified: true });

// --- 2. Generate ----------------------------------------------------------
const provider = await getProvider(argv.provider || 'mock');
const gen = await provider.generateLesson({ topic, grounding });

// --- 3. Fill-in: code-checked math + illustration -------------------------
const mathGen = topic.subject === 'Mathematics' && /within 5|within 10|within 20|number bond/i.test(topic.name);
let practice = { generator: null, items: gen.practice || [] };
if (mathGen) {
  const key = /within 5/i.test(topic.name) ? 'addSubWithin5' : /within 10/i.test(topic.name) ? 'addSubWithin10' : /within 20/i.test(topic.name) ? 'addSubWithin20' : 'numberBondsTo10';
  practice = { generator: key, count: 10, items: [] }; // answers computed by code, never the model
}
const illustration = mascotSVG(seedFromId(topic.id), topic.subject);

// --- assemble the content record (matches content/schema/content.schema.json)
let content = {
  topicId: topic.id, name: topic.name, subject: topic.subject, domain: topic.domain,
  ageRange: [topic.ageRangeStart, topic.ageRangeEnd], standards: topic.standards || [],
  prerequisites: [],
  parent: gen.parent,
  student: { ...gen.student, illustrationSVG: illustration },
  practice,
  assessment: {
    masteryCriteria: topic.evidence || [],
    items: gen.assessment || [],
  },
  provenance: {
    generatedBy: `content pipeline · provider=${provider.name}`,
    grounding: grounding.map((g) => ({ title: g.source, license: 'source', verified: g.verified })),
    citations: gen.citations || [],
    verification: [],
    reviewed: false, reviewer: null,
  },
  license: 'CC-BY-SA-4.0',
};
content = americanizeDeep(content); // normalize on the way out

// --- 4. Verify ------------------------------------------------------------
const report = verify(content, { grounding, mathGen });
content.provenance.verification = report.passed;

// --- 5. Gate + write ------------------------------------------------------
const outDir = path.join(dir, 'out');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${topic.id}.json`);
fs.writeFileSync(outPath, JSON.stringify(content, null, 2) + '\n');

console.log(`\nGenerated content for: ${topic.name} (${topic.subject}, age ${content.ageRange.join('-')})`);
console.log(`  provider:      ${provider.name}`);
console.log(`  grounded on:   ${grounding.length} source(s) (${grounding.filter((g) => g.verified).length} verified)`);
console.log(`  math practice: ${mathGen ? 'code-generated (answers correct by construction)' : 'n/a'}`);
console.log(`  illustration:  procedural SVG (unique, dependency-free)`);
console.log(`  verify:        ${report.passed.length} check(s) passed${report.flags.length ? ', ' + report.flags.length + ' FLAG(s)' : ''}`);
report.flags.forEach((f) => console.log(`     ⚠ ${f}`));
console.log(`  reviewed:      false  →  will NOT ship to a child until a human signs off`);
console.log(`  wrote:         ${path.relative(path.join(dir, '..'), outPath)}\n`);
