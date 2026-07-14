#!/usr/bin/env node
// Resolve ONE image per lesson picture-card and store it (review-gated).
//   node pipeline/resolve-images.mjs --topic mt_XXX [--provider claude] [--no-ai] [--store]
//
// Per card (student.examples[i].show), a directive decides photo vs illustration:
//   • photo        → a real, correctly-licensed image from Openverse (CC0/PD/CC-BY),
//                     mirrored into our Storage bucket with attribution.
//   • illustration → an AI image (OpenAI gpt-image-1) in a LOCKED house style so a
//                     day's cards look like one set; single subject, plain bg, ink-light.
// A photo card with no clean match falls back to AI (unless --no-ai). With --no-ai
// and no photo, the card is left imageless and the packet keeps its text placeholder.
//
// Consistency across a day comes from the fixed HOUSE_STYLE below (same look/params
// for every card, every topic). Keep it uncluttered — one clear object.
//
// Needs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (directives),
// OPENAI_API_KEY (AI images). Apply db/images.sql first. Runs in the "Resolve
// images" Action.

import crypto from 'node:crypto';
import { imageProvider } from './provider.mjs';

const HOUSE_STYLE =
  "Children's picture-book illustration: a clean, simple line drawing with a soft, light watercolor wash. "
  + 'A SINGLE clear subject, centered, on a plain off-white background with generous empty margin. '
  + 'No text, no letters, no words, no numbers, no borders or frames. Bright but gentle palette, calm and '
  + 'uncluttered so a young child instantly sees what it is. Consistent, friendly house style. Subject: ';

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]; }
const topicId = argv.topic;
if (!topicId) { console.error('Usage: --topic mt_XXX [--provider claude] [--no-ai] [--store]'); process.exit(1); }
const AI_ON = !argv['no-ai'] && String(process.env.AI_IMAGES || 'on').toLowerCase() !== 'off';

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const OPENAI = process.env.OPENAI_API_KEY;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const BUCKET = 'lesson-images';
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function get(path) { const r = await fetch(SB + path, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); }

// --- storage: ensure the public bucket, then upload bytes and return a public URL
async function ensureBucket() {
  const r = await fetch(`${SB}/storage/v1/bucket`, { method: 'POST', headers: H, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }) });
  if (!r.ok && r.status !== 409) { const t = await r.text(); if (!/already exists/i.test(t)) console.warn(`bucket create: ${r.status} ${t}`); }
}
async function upload(path, buf, contentType) {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': contentType, 'x-upsert': 'true' }, body: buf,
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`);
  return `${SB}/storage/v1/object/public/${BUCKET}/${path}`;
}

// --- real photo via Openverse (CC0 / Public Domain / CC-BY only) ---
async function findPhoto(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5&license=cc0,pdm,by&mature=false`;
  const r = await fetch(url, { headers: { 'User-Agent': 'MarbleLearning/1.0 (education)' } });
  if (!r.ok) return null;
  const j = await r.json();
  for (const it of (j.results || [])) {
    const src = it.url || it.thumbnail; if (!src) continue;
    try {
      const ir = await fetch(src, { headers: { 'User-Agent': 'MarbleLearning/1.0 (education)' } });
      if (!ir.ok) continue;
      const ct = ir.headers.get('content-type') || 'image/jpeg';
      if (!/^image\//.test(ct)) continue;
      const buf = Buffer.from(await ir.arrayBuffer());
      if (buf.length < 2000) continue; // skip tiny/placeholder
      const credit = it.attribution || `${it.title || 'Image'}${it.creator ? ' by ' + it.creator : ''} (${it.license?.toUpperCase() || ''} ${it.license_version || ''})`.trim();
      return { buf, ct, license: `${(it.license || '').toUpperCase()} ${it.license_version || ''}`.trim(), attribution: credit, source_url: it.foreign_landing_url || src, source: 'openverse' };
    } catch { /* try next */ }
  }
  return null;
}

// --- AI illustration via OpenAI gpt-image-1 ---
async function makeIllustration(subject) {
  if (!OPENAI) return null;
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: 'Bearer ' + OPENAI, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: HOUSE_STYLE + subject, size: '1024x1024', quality: 'low', n: 1 }),
  });
  if (!r.ok) { console.warn(`  openai image ${r.status}: ${(await r.text()).slice(0, 200)}`); return null; }
  const j = await r.json();
  const b64 = j.data?.[0]?.b64_json; if (!b64) return null;
  return { buf: Buffer.from(b64, 'base64'), ct: 'image/png' };
}

// --- main ---
const trows = await get(`/rest/v1/topics?id=eq.${encodeURIComponent(topicId)}&select=id,name,subject,age_range_start,age_range_end`);
if (!trows.length) { console.error('topic not found'); process.exit(1); }
const t = trows[0];
const topic = { name: t.name, subject: t.subject, ageRangeStart: t.age_range_start, ageRangeEnd: t.age_range_end };

const crows = await get(`/rest/v1/content_items?topic_id=eq.${encodeURIComponent(topicId)}&select=body&limit=1`);
if (!crows.length) { console.error('no lesson for this topic — generate one first'); process.exit(1); }
let body = crows[0].body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
const examples = (body?.student?.examples || []).filter((e) => e && (e.show || e.say));
if (!examples.length) { console.error('lesson has no picture cards (student.examples)'); process.exit(1); }

console.log(`Topic: ${topic.name} · ${examples.length} card(s) · AI ${AI_ON ? 'on' : 'off'}`);
const provider = await imageProvider(argv.provider || 'mock');
const directives = await provider.imageDirectives({ topic, examples });

if (argv.store) await ensureBucket();
const rows = [];
for (let i = 0; i < examples.length; i++) {
  const d = directives[i] || { kind: 'illustration', subject: examples[i].show || examples[i].say || topic.name, query: examples[i].show || topic.name, alt: examples[i].show || '' };
  const base = `${slug(topicId)}/${i}-${slug(d.subject).slice(0, 24) || 'card'}`;
  let asset = null, meta = {};
  if (d.kind === 'photo') {
    console.log(`  [${i}] photo · "${d.query}"`);
    const p = await findPhoto(d.query);
    if (p) { asset = p; meta = { kind: 'photo', source: p.source, license: p.license, attribution: p.attribution, source_url: p.source_url, prompt: d.query }; }
  }
  if (!asset && AI_ON) {
    console.log(`  [${i}] illustration · "${String(d.subject).slice(0, 60)}"`);
    const a = await makeIllustration(d.subject);
    if (a) { asset = a; meta = { kind: 'illustration', source: 'ai', prompt: HOUSE_STYLE + d.subject }; }
  }
  if (!asset) { console.log(`  [${i}] no image (skipped)`); continue; }

  let url = null;
  if (argv.store) {
    const ext = asset.ct.includes('png') ? 'png' : asset.ct.includes('webp') ? 'webp' : 'jpg';
    url = await upload(`${base}.${ext}`, asset.buf, asset.ct);
  }
  // Every row MUST have an identical key set — PostgREST bulk insert rejects
  // ragged objects (PGRST102). Fill the photo-only fields with null on AI rows.
  rows.push({
    topic_id: topicId, slot: i, status: 'approved',
    kind: meta.kind, source: meta.source, prompt: meta.prompt || null,
    url: url || 'pending://not-stored', storage_path: url ? new URL(url).pathname : null,
    alt: d.alt || '',
    license: meta.license || null, attribution: meta.attribution || null, source_url: meta.source_url || null,
    width: meta.kind === 'illustration' ? 1024 : null, height: meta.kind === 'illustration' ? 1024 : null,
  });
}

console.log(`Resolved ${rows.length}/${examples.length} card(s): ` + rows.map((r) => r.kind).join(', '));
if (argv.store && rows.length) {
  const res = await fetch(`${SB}/rest/v1/lesson_images?on_conflict=topic_id,slot`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal,resolution=merge-duplicates' }, body: JSON.stringify(rows) });
  if (!res.ok) { console.error(`store failed HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
  console.log(`Done: stored ${rows.length} image(s) for ${topicId}.`);
} else if (!argv.store) {
  console.log('(dry run — pass --store to upload + save)');
}
