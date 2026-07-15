#!/usr/bin/env node
// Readiness backfill — keep every child's upcoming frontier generated AHEAD of time,
// so the app never generates on-demand (it only ever reads ready content).
//
//   node pipeline/backfill.mjs [--buffer 20] [--max 8] [--dry]
//
// For each child we compute the ready-frontier (age-appropriate, hard-prereqs met,
// not yet mastered), take the next `buffer` topics, and union across children —
// content is GLOBAL per topic, so a topic shared by many kids is generated once.
// Then, up to `max` items this run (cost cap):
//   • a frontier topic with no reviewed lesson → generate it (generate.mjs)
//   • a topic with a lesson but no images       → resolve images (resolve-images.mjs)
// A freshly generated lesson also gets its images in the same pass.
//
// Runs in the scheduled "Backfill readiness" Action (open network + all keys).
// Needs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ the keys generate/resolve need).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const dir = path.dirname(fileURLToPath(import.meta.url));
const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]; }
const BUFFER = Number(argv.buffer) || 20;   // ready topics kept ahead per child
const MAX = Number(argv.max) || 8;          // max generate/resolve actions per run (cost cap)
const PRACTICE_TARGET = Number(argv.practice) || 18;   // keep each topic's bank at ≥ this (3 six-question sheets)
const DRY = !!argv.dry;

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
async function get(p) { const r = await fetch(SB + p, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); }
// Paginated read — PostgREST caps a single response at ~1000 rows regardless of a
// &limit= in the URL. A one-shot GET therefore silently truncates big tables (deps,
// mastery, practice_items), which was under-counting banks and dropping prereq edges.
async function getAll(pathBase, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const r = await fetch(SB + pathBase, { headers: { ...H, Range: `${from}-${from + pageSize - 1}`, 'Range-Unit': 'items' } });
    if (!r.ok) { if (from === 0) throw new Error(`${r.status} ${await r.text()}`); break; }
    const rows = await r.json(); out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// --- taxonomy (offline) + graph/mastery (DB) ---
const topics = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'topics.json'), 'utf8')).topics;
const byId = new Map(topics.map((t) => [t.id, t]));
const [children, deps, masteredRows, doneLessons, doneImages, donePractice] = await Promise.all([
  getAll('/rest/v1/children?select=id,first_name,birth_year'),
  getAll('/rest/v1/dependencies?select=topic_id,prerequisite_id&strength=eq.hard&order=topic_id'),
  getAll('/rest/v1/mastery?select=child_id,topic_id&status=eq.mastered&order=child_id'),
  getAll('/rest/v1/content_items?select=topic_id&reviewed=eq.true&order=topic_id'),
  getAll('/rest/v1/lesson_images?select=topic_id&order=topic_id'),
  getAll('/rest/v1/practice_items?select=topic_id&order=topic_id').catch(() => []),
]);
const practiceCount = {}; for (const r of donePractice) practiceCount[r.topic_id] = (practiceCount[r.topic_id] || 0) + 1;
const hard = new Map(); for (const d of deps) { (hard.get(d.topic_id) || hard.set(d.topic_id, []).get(d.topic_id)).push(d.prerequisite_id); }
const masteredBy = {}; for (const m of masteredRows) { (masteredBy[m.child_id] ||= new Set()).add(m.topic_id); }
const haveLesson = new Set(doneLessons.map((r) => r.topic_id));
const haveImages = new Set(doneImages.map((r) => r.topic_id));

const YEAR = new Date().getFullYear();
// frontier: ready = age fits, not "known" (mastered or aged past), all hard prereqs known
function frontier(age, mastered) {
  const known = (t) => mastered.has(t.id) || t.ageRangeEnd < age;
  return topics
    .filter((t) => t.ageRangeStart <= age && t.ageRangeEnd >= age && !known(t)
      && (hard.get(t.id) || []).every((p) => { const pt = byId.get(p); return !pt || known(pt); }))
    .sort((a, b) => (b.centrality || 0) - (a.centrality || 0) || a.ageRangeStart - b.ageRangeStart)
    .slice(0, BUFFER);
}

// What to keep ready. Two modes:
//  --age N : the WHOLE grade band (every topic available at age N) — one-time
//            batch so a grade is perfect end-to-end, never "Basics".
//  default : each child's next `buffer` ready-frontier topics — ongoing maintenance.
let need;
if (argv.age) {
  const age = Number(argv.age);
  need = topics.filter((t) => t.ageRangeStart <= age && t.ageRangeEnd >= age);
  console.log(`GRADE mode · age ${age}: ${need.length} topic(s) in band`);
} else {
  const wanted = new Map();
  for (const c of children) {
    const age = YEAR - c.birth_year;
    for (const t of frontier(age, masteredBy[c.id] || new Set())) wanted.set(t.id, t);
  }
  need = [...wanted.values()];
  console.log(`FRONTIER mode · ${children.length} child(ren) · union ${need.length} topic(s) · buffer ${BUFFER}`);
}
const needLesson = need.filter((t) => !haveLesson.has(t.id));
const needImages = need.filter((t) => haveLesson.has(t.id) && !haveImages.has(t.id));
// Practice top-up: knowledge + non-arithmetic-math topics with a lesson but a thin
// bank. Arithmetic math is code-generated (infinite) so it needs no stored bank.
const isArith = (t) => t.subject === 'Mathematics' && /\badd|subtract|division|divide|multipl|\bsum|take away|combin/i.test(t.name);
const needPractice = need.filter((t) => haveLesson.has(t.id) && !isArith(t) && (practiceCount[t.id] || 0) < PRACTICE_TARGET);
console.log(`  missing lesson: ${needLesson.length} · lesson-but-no-images: ${needImages.length} · thin practice bank: ${needPractice.length} · this run caps at ${MAX}`);

if (DRY) {
  needLesson.slice(0, MAX).forEach((t) => console.log(`  would generate: ${t.id} ${t.name}`));
  needImages.slice(0, Math.max(0, MAX - needLesson.length)).forEach((t) => console.log(`  would image:    ${t.id} ${t.name}`));
  needPractice.forEach((t) => console.log(`  would top-up practice (${practiceCount[t.id] || 0}/${PRACTICE_TARGET}): ${t.id} ${t.name}`));
  process.exit(0);
}

const run = (script, args) => { try { execFileSync('node', [path.join(dir, script), ...args], { stdio: 'inherit', env: process.env }); return true; } catch (e) { console.error(`  ${script} failed for ${args[1]}: ${e.message}`); return false; } };
let budget = MAX;
// 1) generate missing lessons, then image them in the same pass
for (const t of needLesson) {
  if (budget <= 0) break; budget--;
  console.log(`\n=== generate ${t.id} · ${t.name} ===`);
  if (run('generate.mjs', ['--topic', t.id, '--provider', 'claude', '--live', '--store'])) {
    run('resolve-images.mjs', ['--topic', t.id, '--provider', 'claude', '--store']);
  }
}
// 2) top up images for topics that already had a lesson
for (const t of needImages) {
  if (budget <= 0) break; budget--;
  console.log(`\n=== images ${t.id} · ${t.name} ===`);
  run('resolve-images.mjs', ['--topic', t.id, '--provider', 'claude', '--store']);
}
// 3) top up thin practice banks (generate only the shortfall — existing items are reused)
for (const t of needPractice) {
  if (budget <= 0) break; budget--;
  const short = PRACTICE_TARGET - (practiceCount[t.id] || 0);
  console.log(`\n=== practice ${t.id} · ${t.name} (+${short}) ===`);
  run('generate-practice.mjs', ['--topic', t.id, '--count', String(short), '--provider', 'claude', '--store']);
}
console.log(`\nBackfill done. Actions used: ${MAX - budget}/${MAX}.`);
