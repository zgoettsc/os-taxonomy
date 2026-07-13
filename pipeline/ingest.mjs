#!/usr/bin/env node
// Ingest a corpus source into source_documents.
//   node pipeline/ingest.mjs --source coreknowledge
//
// Reads data/corpus/<source>.json (a manifest of PDFs), downloads/extracts each,
// chunks into passages, embeds them (Voyage, if VOYAGE_API_KEY set — else FTS
// only), and upserts into public.source_documents (delete-then-insert per source,
// so re-running is idempotent). Runs in the "Ingest corpus" Action.
//
// Needs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (write), VOYAGE_API_KEY (embed,
// optional). npm i pdf-parse in the workflow.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedDocuments } from './embed.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const source = argv.source;
if (!source) { console.error('Usage: node pipeline/ingest.mjs --source coreknowledge'); process.exit(1); }

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sbHeaders = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'corpus', `${source}.json`), 'utf8'));
const docs = manifest.documents || [];
if (!docs.length) { console.error(`No documents in data/corpus/${source}.json — add PDF urls first.`); process.exit(1); }

// --- pdf text extraction (dynamic import so the module loads without the dep) ---
const pdfParse = (await import('pdf-parse')).default;

function chunk(text, { size = 1000 } = {}) {
  const clean = text.replace(/\r/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  const paras = clean.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim()).filter((p) => p.length > 40);
  const out = []; let cur = '';
  for (const p of paras) {
    if ((cur + ' ' + p).length > size) { if (cur) out.push(cur.trim()); cur = p; }
    else cur = cur ? cur + '\n\n' + p : p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((c) => c.length > 60);
}

async function getPdf(doc) {
  if (doc.url) {
    const r = await fetch(doc.url, { headers: { 'User-Agent': 'MarbleEdu/1.0' } });
    if (!r.ok) throw new Error(`download ${r.status} ${doc.url}`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (doc.storagePath) { // a file in a Supabase Storage bucket
    const r = await fetch(`${SB}/storage/v1/object/${doc.storagePath}`, { headers: { Authorization: 'Bearer ' + KEY } });
    if (!r.ok) throw new Error(`storage ${r.status} ${doc.storagePath}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('manifest doc needs a url or storagePath');
}

// --- collect passages across all docs ---
const passages = [];
for (const doc of docs) {
  try {
    const buf = await getPdf(doc);
    const { text } = await pdfParse(buf);
    const chunks = chunk(text);
    for (const c of chunks) passages.push({ source, title: doc.title || null, url: doc.url || doc.pageUrl || null, grade: doc.grade || null, subjects: doc.subjects || [], text: c });
    console.log(`  ${doc.title || doc.url}: ${chunks.length} passage(s)`);
  } catch (e) { console.error(`  SKIP ${doc.title || doc.url}: ${e.message}`); }
}
console.log(`Total passages: ${passages.length}`);
if (!passages.length) process.exit(1);

// --- embed (optional) ---
let embeddings = null;
try {
  embeddings = await embedDocuments(passages.map((p) => p.text));
  console.log(`Embedded ${embeddings.length} passage(s).`);
} catch (e) { console.error(`Embeddings skipped (${e.message}) — FTS-only ingest.`); }

// --- replace this source's rows (idempotent) ---
{
  const del = await fetch(`${SB}/rest/v1/source_documents?source=eq.${encodeURIComponent(source)}`, { method: 'DELETE', headers: sbHeaders });
  if (!del.ok && del.status !== 404) console.error(`delete warned HTTP ${del.status}`);
}

// --- insert in batches ---
const rows = passages.map((p, i) => ({ ...p, embedding: embeddings ? '[' + embeddings[i].join(',') + ']' : null }));
let inserted = 0;
for (let i = 0; i < rows.length; i += 200) {
  const batch = rows.slice(i, i + 200);
  const res = await fetch(`${SB}/rest/v1/source_documents`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(batch) });
  if (!res.ok) { console.error(`insert failed HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
  inserted += batch.length;
  console.log(`  inserted ${inserted}/${rows.length}`);
}
console.log(`Done: ${inserted} passages ingested for '${source}'${embeddings ? ' (with embeddings)' : ' (FTS only)'}.`);
