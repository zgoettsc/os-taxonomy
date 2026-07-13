#!/usr/bin/env node
// One-time sensitivity classification sweep (heuristic first pass).
//
//   node scripts/sensitivity-sweep.mjs
//
// Scans every taxonomy topic for signals in four policy axes (see
// docs/content-architecture.md D10) and writes a CANDIDATE list for a human to
// confirm — most candidates will be real, a few will be false positives; the
// human keeps/drops each and sets gate_default + stances. This heuristic pass is
// tuned for recall (surface anything plausible); precision is the human's job.
// Later this can be swapped for/augmented with an LLM classifier once a key is
// wired — the output shape is the same.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const topics = JSON.parse(fs.readFileSync(path.join(root, 'data/topics.json'), 'utf8')).topics;

// Word-boundary term sets per axis. Lowercase; matched against name+description+domain.
const AXES = {
  'religion/origins': ['religion', 'religious', 'god', 'gods', 'faith', 'church', 'temple', 'mosque',
    'synagogue', 'bible', 'quran', 'torah', 'prayer', 'worship', 'sacred', 'ritual', 'deity', 'myth',
    'mythology', 'creation', 'evolution', 'evolutionary', 'natural selection', 'christmas', 'easter',
    'diwali', 'hanukkah', 'ramadan', 'saint', 'heaven', 'soul', 'belief', 'beliefs'],
  'body/reproduction': ['reproduction', 'reproductive', 'reproduce', 'reproducing', 'puberty', 'mating',
    'pregnancy', 'pregnant', 'sperm', 'ovum', 'fertilisation', 'fertilization', 'gender', 'sexual', 'sex',
    'genital', 'menstru'],
  'politics/current-events': ['government', 'governance', 'election', 'voting', 'president', 'presidential',
    'political', 'politics', 'democracy', 'parliament', 'monarchy', 'citizenship', 'immigration', 'protest',
    'revolution', 'colonial', 'colonialism', 'colony', 'empire', 'slavery', 'slave', 'treaty', 'constitution',
    'civil rights'],
  'violence/mature': ['war', 'warfare', 'battle', 'weapon', 'soldier', 'genocide', 'holocaust', 'famine',
    'plague', 'massacre', 'conquest', 'invasion'],
};

const wb = (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
const MATCHERS = Object.fromEntries(Object.entries(AXES).map(([a, ts]) => [a, ts.map((t) => [t, wb(t)])]));

const candidates = [];
for (const t of topics) {
  const hay = `${t.name} ${t.description || ''} ${t.domain || ''}`;
  const axes = {};
  for (const [axis, matchers] of Object.entries(MATCHERS)) {
    const hits = matchers.filter(([, re]) => re.test(hay)).map(([term]) => term);
    if (hits.length) axes[axis] = hits;
  }
  if (Object.keys(axes).length) {
    candidates.push({
      id: t.id, name: t.name, subject: t.subject, domain: t.domain,
      ageRange: [t.ageRangeStart, t.ageRangeEnd],
      axes: Object.keys(axes),
      matched: axes,
      description: (t.description || '').slice(0, 140),
      // to be filled by the human confirm step:
      confirmed: null, gate_default: null, stances: [],
    });
  }
}

candidates.sort((a, b) => a.axes[0].localeCompare(b.axes[0]) || a.subject.localeCompare(b.subject) || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(root, 'data/sensitivity-candidates.json'),
  JSON.stringify({ generated: 'heuristic-sweep', total: candidates.length, candidates }, null, 2) + '\n');

// --- summary ---
const byAxis = {}; const bySubject = {};
for (const c of candidates) { for (const a of c.axes) byAxis[a] = (byAxis[a] || 0) + 1; bySubject[c.subject] = (bySubject[c.subject] || 0) + 1; }
process.stderr.write(`Sensitivity sweep: ${candidates.length} candidate topics of ${topics.length} (${(candidates.length / topics.length * 100).toFixed(1)}%)\n`);
process.stderr.write(`  by axis:    ${Object.entries(byAxis).map(([a, n]) => `${a}=${n}`).join('  ')}\n`);
process.stderr.write(`  by subject: ${Object.entries(bySubject).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}=${n}`).join('  ')}\n`);
process.stderr.write(`  written to data/sensitivity-candidates.json (confirm each: keep/drop, gate_default, stances)\n`);
