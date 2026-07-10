#!/usr/bin/env node
// Turn the taxonomy into a homeschool plan.
//
//   node scripts/homeschool-plan.mjs --age 6 --name "Ada"
//   node scripts/homeschool-plan.mjs --age 8 --subject Mathematics
//   node scripts/homeschool-plan.mjs --age 7 --mastered mt_VBl1T1sFCM,mt__00ZSLnB7p
//
// For a given age it lists, subject by subject, the micro-topics that are
// "ready to learn" — every hard prerequisite is either below-age or already
// in your --mastered list — ordered so foundations come before what builds
// on them. Each topic prints its mastery check so you know when it's done.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', f), 'utf8'));
const topics = read('topics.json').topics;
const deps = read('dependencies.json').dependencies;

// --- args -----------------------------------------------------------------
const argv = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[++i];
}
const age = Number(argv.age);
if (!age) {
  console.error('Usage: node scripts/homeschool-plan.mjs --age <n> [--name "Kid"] [--subject Science] [--mastered id,id]');
  process.exit(1);
}
const name = argv.name || 'your child';
const onlySubject = argv.subject || null;
const mastered = new Set((argv.mastered || '').split(',').filter(Boolean));

// --- graph ----------------------------------------------------------------
const byId = new Map(topics.map((t) => [t.id, t]));
const hardPrereqs = new Map(); // topicId -> [prereqId...] (hard edges only)
for (const d of deps) {
  if (d.strength !== 'hard') continue;
  if (!hardPrereqs.has(d.topicId)) hardPrereqs.set(d.topicId, []);
  hardPrereqs.get(d.topicId).push(d.prerequisiteId);
}

// A topic is "assumed known" if the child is past its age band, or you marked it mastered.
const known = (t) => mastered.has(t.id) || t.ageRangeEnd < age;

// "Ready now": in-band for this age, not already known, and every hard
// prerequisite is known (or itself out of scope).
const inBand = (t) => t.ageRangeStart <= age && t.ageRangeEnd >= age;
const ready = topics.filter((t) => {
  if (!inBand(t) || known(t)) return false;
  if (onlySubject && t.subject !== onlySubject) return false;
  const pre = hardPrereqs.get(t.id) || [];
  return pre.every((p) => { const pt = byId.get(p); return !pt || known(pt); });
});

// Order within a subject: central foundations first, then younger start ages.
ready.sort((a, b) =>
  a.subject.localeCompare(b.subject) ||
  a.domain.localeCompare(b.domain) ||
  a.ageRangeStart - b.ageRangeStart ||
  (b.centrality || 0) - (a.centrality || 0)
);

// --- output ---------------------------------------------------------------
const bySubject = {};
for (const t of ready) (bySubject[t.subject] ||= []).push(t);

console.log(`\nHomeschool plan — age ${age}${onlySubject ? ' · ' + onlySubject : ''}`);
console.log(`Ready-to-learn micro-topics for ${name}: ${ready.length}\n`);

for (const [subject, list] of Object.entries(bySubject)) {
  console.log(`\n=== ${subject} (${list.length}) ===`);
  let domain = null;
  for (const t of list) {
    if (t.domain !== domain) { domain = t.domain; console.log(`\n  ${domain}`); }
    console.log(`  • ${t.name}  [${t.ageRangeStart}-${t.ageRangeEnd}]`);
    const check = (t.assessmentPrompt || (t.evidence && t.evidence[0]) || '')
      .replaceAll('{{name}}', name);
    if (check) console.log(`      ✓ ${check}`);
  }
}
console.log(`\nWhen ${name} masters something, add its id to --mastered to unlock what it gates.\n`);
