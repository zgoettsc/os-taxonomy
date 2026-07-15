#!/usr/bin/env node
// READ-ONLY diagnostic: print the live practice_items bank count per topic for an
// age band, so we can SEE the truth in the database instead of guessing.
//
//   node pipeline/audit-practice.mjs --age 4
//   node pipeline/audit-practice.mjs --age 4 --target 18   (flag banks under target)
//
// Prints, per topic: raw bank count, DISTINCT-by-normalized-prompt count (what the
// app actually renders after its dedupe), plus a histogram. Writes nothing.
//
// Needs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read only).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]; }
const AGE = argv.age !== undefined ? Number(argv.age) : null;
const TARGET = Number(argv.target) || 18;

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// Paginated fetch — never trust a single request to return every row. PostgREST caps
// a response (commonly 1000 rows) regardless of &limit=, so we walk with Range until a
// short page comes back. This is exactly what a naive one-shot count would get wrong.
async function getAll(pathBase, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const r = await fetch(SB + pathBase, { headers: { ...H, Range: `${from}-${to}`, 'Range-Unit': 'items' } });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const topics = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'topics.json'), 'utf8')).topics;
const byId = new Map(topics.map((t) => [t.id, t]));

// Pull EVERY practice row (prompt included so we can compute the app's distinct count).
const rows = await getAll('/rest/v1/practice_items?select=topic_id,prompt&order=topic_id');
console.log(`Fetched ${rows.length} practice_items row(s) total (paginated).\n`);

const raw = {};         // topic_id -> raw row count
const prompts = {};     // topic_id -> Set of normalized prompts (app-visible distinct)
for (const r of rows) {
  raw[r.topic_id] = (raw[r.topic_id] || 0) + 1;
  (prompts[r.topic_id] ||= new Set()).add(norm(r.prompt));
}

const inBand = (t) => AGE === null || (t.ageRangeStart <= AGE && t.ageRangeEnd >= AGE);
const band = topics.filter(inBand);
console.log(AGE === null ? `All ${band.length} topic(s):` : `Age ${AGE} band: ${band.length} topic(s)\n`);

const rowsOut = band.map((t) => ({
  id: t.id, name: t.name, subject: t.subject,
  raw: raw[t.id] || 0,
  distinct: prompts[t.id] ? prompts[t.id].size : 0,
})).sort((a, b) => a.distinct - b.distinct || a.raw - b.raw);

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(pad('raw', 5) + pad('uniq', 5) + pad('topic', 40) + 'subject');
console.log('-'.repeat(80));
for (const r of rowsOut) {
  const flag = r.distinct < TARGET ? ' ⚠' : '';
  console.log(pad(r.raw, 5) + pad(r.distinct, 5) + pad(r.name + flag, 40) + r.subject);
}

// Histograms — the "3/6/18" fingerprint, from the DB.
const hist = (key) => rowsOut.reduce((m, r) => { m[r[key]] = (m[r[key]] || 0) + 1; return m; }, {});
console.log('\nDistribution by RAW bank count:     ', JSON.stringify(hist('raw')));
console.log('Distribution by DISTINCT (app-view):', JSON.stringify(hist('distinct')));
const under = rowsOut.filter((r) => r.distinct < TARGET);
console.log(`\n${under.length}/${band.length} topic(s) below target ${TARGET} distinct (these need top-up).`);
if (under.length) console.log('  ' + under.map((r) => r.name).join(' · '));
