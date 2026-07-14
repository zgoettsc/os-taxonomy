#!/usr/bin/env node
// Generate MORE grounded, auto-checkable practice for a topic, and store it.
//   node pipeline/generate-practice.mjs --topic mt_XXX --count 8 --provider claude --store
//
// Facts come from the topic's ALREADY-STORED lesson citations (cheap — no source
// re-fetch), so new questions stay factual and cited. Dedupes against existing
// practice_items so re-running keeps producing FRESH questions (unlimited over
// repeated runs). Math needs none of this — it's code-generated in the app.
//
// Needs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY. Runs in the
// "Generate practice" Action. Apply db/practice.sql first.

import crypto from 'node:crypto';
import { practiceProvider } from './provider.mjs';

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1]; }
const topicId = argv.topic; const count = Number(argv.count) || 8;
if (!topicId) { console.error('Usage: --topic mt_XXX [--count 8] [--provider claude] [--store]'); process.exit(1); }

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
async function get(path) { const r = await fetch(SB + path, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); }

// --- the topic ---
const trows = await get(`/rest/v1/topics?id=eq.${encodeURIComponent(topicId)}&select=id,name,subject,age_range_start,age_range_end`);
if (!trows.length) { console.error('topic not found'); process.exit(1); }
const t = trows[0];
const topic = { name: t.name, subject: t.subject, ageRangeStart: t.age_range_start, ageRangeEnd: t.age_range_end };

// --- grounding: the lesson's cited spans (must have a lesson first) ---
const crows = await get(`/rest/v1/content_items?topic_id=eq.${encodeURIComponent(topicId)}&select=provenance&limit=1`);
let facts = [];
if (crows.length) { let p = crows[0].provenance; if (typeof p === 'string') { try { p = JSON.parse(p); } catch {} } facts = ((p && p.citations) || []).map((c) => c.span).filter(Boolean); }
if (!facts.length) { console.error('No grounded facts for this topic — generate a lesson for it first.'); process.exit(1); }

// --- existing items → avoid list + dedupe ---
const existing = await get(`/rest/v1/practice_items?topic_id=eq.${encodeURIComponent(topicId)}&select=prompt,content_hash&limit=1000`);
const seen = new Set(existing.map((x) => x.content_hash));
const avoid = existing.map((x) => x.prompt);
console.log(`Topic: ${topic.name} · ${facts.length} facts · ${existing.length} existing item(s) · generating ${count}…`);

// --- generate + validate (auto-checkable only) ---
const provider = await practiceProvider(argv.provider || 'mock');
const items = await provider.generatePractice({ topic, facts, count, avoid });
const clean = [];
for (const it of items || []) {
  const prompt = String(it.prompt || '').trim(); if (!prompt) continue;
  const ch = sha(topicId + '|' + norm(prompt)); if (seen.has(ch)) continue; seen.add(ch);
  if (it.kind === 'mcq') {
    const choices = Array.isArray(it.choices) ? it.choices.map(String) : [];
    if (choices.length < 2 || typeof it.answerIndex !== 'number' || it.answerIndex < 0 || it.answerIndex >= choices.length) continue;
    clean.push({ topic_id: topicId, kind: 'mcq', prompt, choices, answer_index: it.answerIndex, answer: null, content_hash: ch, source: 'llm' });
  } else {
    const answer = String(it.answer || '').trim(); if (!answer) continue;
    clean.push({ topic_id: topicId, kind: 'short', prompt, choices: null, answer_index: null, answer, content_hash: ch, source: 'llm' });
  }
}
console.log(`  ${clean.length} valid new item(s) — mcq: ${clean.filter((x) => x.kind === 'mcq').length}, short: ${clean.filter((x) => x.kind === 'short').length}`);
clean.slice(0, 4).forEach((x) => console.log(`   • ${x.prompt}`));

// --- store ---
if (process.argv.includes('--store') && clean.length) {
  const res = await fetch(`${SB}/rest/v1/practice_items?on_conflict=topic_id,content_hash`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal,resolution=ignore-duplicates' }, body: JSON.stringify(clean) });
  if (!res.ok) { console.error(`store failed HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
  console.log(`Done: stored ${clean.length} practice item(s) for ${topicId}.`);
} else if (!clean.length) {
  console.log('Nothing new to store (the model returned only duplicates — try again for more variety).');
}
