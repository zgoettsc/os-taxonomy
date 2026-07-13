#!/usr/bin/env node
// End-to-end demo of the content pipeline for a single topic.
//
//   node scripts/demo-content.mjs mt_ghF3Vv6taM   # math: code-checked answers
//   node scripts/demo-content.mjs mt_yBJyCfhtem    # reading: rubric-judged
//
// Shows: parent-app view → student lesson → generated practice → auto-graded
// assessment. The point is to prove that numeric answers are correct by
// construction (a wrong student answer is caught by code, no model involved)
// and that constructed items carry an evidence-derived rubric a judge can use.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS, grade } from './generators.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const id = process.argv[2] || 'mt_ghF3Vv6taM';
const c = JSON.parse(fs.readFileSync(path.join(dir, '..', 'content', `${id}.json`), 'utf8'));
const SEED = 42; // fixed so the demo is reproducible

const rule = (s) => console.log('\n' + '─'.repeat(64) + `\n${s}`);

console.log(`\n### ${c.name}  (${c.subject} · age ${c.ageRange.join('–')})`);
console.log(`standards: ${c.standards.join(', ')}  |  reviewed: ${c.provenance.reviewed}`);

rule('PARENT APP');
console.log('Why it matters:', c.parent.whyItMatters);
console.log('\nWatch for:');
c.parent.watchFor?.forEach((w) => console.log('  ⚠', w));

rule('STUDENT — lesson');
console.log(c.student.intro);
c.student.examples?.forEach((e) => console.log(`  ${e.show}\n     ${e.say}`));

rule('STUDENT — practice');
let practice = c.practice.items || [];
if (c.practice.generator) {
  practice = GENERATORS[c.practice.generator](SEED, c.practice.count);
  console.log(`(${practice.length} items from generator "${c.practice.generator}", seed ${SEED})`);
}
practice.forEach((p, i) => console.log(`  ${i + 1}. ${p.prompt}${p.answer !== undefined ? `   → answer: ${p.answer}` : ''}`));

rule('ASSESSMENT — auto-grading a simulated attempt');
console.log('Mastery = ' + c.assessment.masteryCriteria.length + ' criteria from the topic\'s evidence.\n');
let autoGraded = 0, correct = 0, needsJudge = 0;
for (const item of c.assessment.items) {
  if (item.kind === 'numeric' && item.generator) {
    // A generated quick-fire set: grade code-computed answers. Simulate a kid
    // who gets one fact wrong to show the checker actually catches it.
    const set = GENERATORS[item.generator](SEED + 1, 5);
    const responses = set.map((q, i) => (i === 2 ? q.answer + 1 : q.answer)); // #3 wrong on purpose
    const results = set.map((q, i) => grade(q, responses[i]));
    const got = results.filter(Boolean).length;
    console.log(`  [${item.id}] quick-fire set (${item.kind}):`);
    set.forEach((q, i) => console.log(`        ${q.prompt.padEnd(10)} kid said ${responses[i]}  ${results[i] ? '✓' : '✗ (key ' + q.answer + ')'}`));
    console.log(`        → ${got}/${set.length} correct, all checked by code`);
    autoGraded += set.length; correct += got;
  } else if (item.kind === 'numeric' || item.kind === 'mcq') {
    const right = item.kind === 'mcq' ? item.answerIndex : item.answer;
    const ok = grade(item, right); // simulate a correct answer
    console.log(`  [${item.id}] ${item.prompt}  → auto-graded ${ok ? '✓' : '✗'} (evidence #${item.evidenceRef})`);
    autoGraded++; if (ok) correct++;
  } else if (item.kind === 'constructed') {
    console.log(`  [${item.id}] ${item.prompt}`);
    console.log('        needs a judge (parent checkbox / LLM-as-judge). Rubric:');
    item.rubric.forEach((r) => console.log(`          ☐ ${r}`));
    needsJudge++;
  }
}

rule('SUMMARY');
console.log(`  auto-graded items: ${correct}/${autoGraded} correct — zero model involvement in the answer key`);
console.log(`  items needing a rubric judge: ${needsJudge}`);
console.log(`  provenance: ${c.provenance.verification.join('; ')}`);
console.log(`  ⚠ reviewed:${c.provenance.reviewed} — would NOT ship to a child until a human signs off.\n`);
