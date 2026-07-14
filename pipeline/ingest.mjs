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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { embedDocuments } from './embed.mjs';

const hashOf = (source, text) => crypto.createHash('sha256').update(source + '\n' + text).digest('hex');

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const source = argv.source;
if (!source) { console.error('Usage: node pipeline/ingest.mjs --source coreknowledge'); process.exit(1); }

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error('needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sbHeaders = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const subjects = argv.subjects ? argv.subjects.split(',') : null;
const grades = argv.grades ? argv.grades.split(',') : null;
const limit = Number(argv.limit) || 0;

let docs;
if (process.argv.includes('--auto') && source === 'coreknowledge') {
  console.log('Auto-discovering Core Knowledge units…');
  const { discoverCoreKnowledge } = await import('./discover-coreknowledge.mjs');
  docs = await discoverCoreKnowledge({ subjects, grades, limit });
} else {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'corpus', `${source}.json`), 'utf8'));
  docs = manifest.documents || [];
}
if (!docs.length) { console.error(`No documents to ingest for '${source}'.`); process.exit(1); }
console.log(`${docs.length} document(s) to ingest.`);

// --- pdf + zip extraction (dynamic import so the module loads without the deps) ---
// Import pdf-parse's internal lib directly: it default-exports the parse function
// (v1.1.1) and skips index.js's debug-mode test-file read. The workflow pins
// pdf-parse@1.1.1 — v2 dropped the default-function export for a class.
const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
const AdmZip = (await import('adm-zip')).default;

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

async function getFile(doc) {
  if (doc.url) {
    const r = await fetch(doc.url, { headers: { 'User-Agent': 'MarbleEdu/1.0' } });
    if (!r.ok) throw new Error(`download ${r.status} ${doc.url}`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (doc.storagePath) { // "<bucket>/<path>" in Supabase Storage (uploaded via dashboard)
    const r = await fetch(`${SB}/storage/v1/object/authenticated/${doc.storagePath}`, { headers: { Authorization: 'Bearer ' + KEY } });
    if (!r.ok) throw new Error(`storage ${r.status} ${doc.storagePath}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('manifest doc needs a url or storagePath');
}

// --replace wipes the whole source first (full rebuild). Then EVERY write is an
// upsert on (source, content_hash) with ignore-duplicates — so a chunked/streamed
// run, subject slices, and re-runs all accumulate without collisions.
const replace = process.argv.includes('--replace');
if (replace) {
  const del = await fetch(`${SB}/rest/v1/source_documents?source=eq.${encodeURIComponent(source)}`, { method: 'DELETE', headers: sbHeaders });
  if (!del.ok && del.status !== 404) {
    console.error(`\n>>> DELETE for --replace failed HTTP ${del.status}: ${(await del.text()).slice(0, 200)}`);
    console.error('>>> Likely the API statement timeout. Apply db/corpus.sql (it raises service_role statement_timeout), then re-run.\n');
    process.exit(1); // don't ingest onto stale rows and produce a dirty mix
  }
  console.log(`--replace: cleared existing '${source}' rows.`);
}

// Stream: embed + upsert each chunk as we go, so memory stays bounded on the full
// catalog (~100k passages), progress persists if the run is interrupted, and the
// embed rate-limiter makes steady headway instead of one giant batch at the end.
const FLUSH_EVERY = Number(process.env.INGEST_FLUSH_EVERY || 800);
const insertUrl = `${SB}/rest/v1/source_documents?on_conflict=source,content_hash`;
const prefer = 'return=minimal,resolution=ignore-duplicates';
const seenHash = new Set();     // global dedupe across the whole run
let buffer = [];                // passages awaiting flush
let totalUnique = 0, stored = 0, embFail = false;

async function flush() {
  if (!buffer.length) return;
  let embeddings = null;
  if (!embFail) {
    try { embeddings = await embedDocuments(buffer.map((p) => p.text)); }
    catch (e) { console.error(`Embeddings failed (${e.message}) — continuing FTS-only.`); embFail = true; }
  }
  const rows = buffer.map((p, i) => ({ ...p, embedding: embeddings ? '[' + embeddings[i].join(',') + ']' : null }));
  const INSERT_BATCH = Number(process.env.INGEST_INSERT_BATCH || 50); // small: HNSW upserts are slow
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const res = await fetch(insertUrl, { method: 'POST', headers: { ...sbHeaders, Prefer: prefer }, body: JSON.stringify(batch) });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes('42P10')) console.error('\n>>> The (source, content_hash) unique index is missing. Apply db/corpus.sql in the Supabase SQL editor.\n');
      console.error(`insert failed HTTP ${res.status}: ${body}`); process.exit(1);
    }
    stored += batch.length;
  }
  console.log(`  …stored ${stored} passage(s) so far${embeddings ? ' (with embeddings)' : ' (FTS only)'}`);
  buffer = [];
}

// --- stream over docs: extract → dedupe → buffer → flush ---
for (const doc of docs) {
  try {
    const buf = await getFile(doc);
    // A zip (magic bytes 'PK' or .zip url) → extract every PDF inside; else it's a PDF.
    const pdfs = [];
    if ((buf[0] === 0x50 && buf[1] === 0x4B) || /\.zip($|\?)/i.test(doc.url || '')) {
      for (const e of new AdmZip(buf).getEntries()) {
        if (!e.isDirectory && /\.pdf$/i.test(e.entryName)) pdfs.push(e.getData());
      }
    } else { pdfs.push(buf); }

    let n = 0;
    for (const pbuf of pdfs) {
      try {
        const { text } = await pdfParse(pbuf);
        for (const c of chunk(text)) {
          const content_hash = hashOf(source, c);
          if (seenHash.has(content_hash)) continue;   // dedupe boilerplate across the run
          seenHash.add(content_hash);
          buffer.push({ source, title: doc.title || null, url: doc.cite || doc.url || null, grade: doc.grade || null, subjects: doc.subjects || [], text: c, content_hash });
          n++; totalUnique++;
        }
      } catch (e) { console.error(`    (skipped a PDF in ${doc.title}: ${e.message})`); }
    }
    console.log(`  ${doc.title || doc.url}: ${pdfs.length} pdf(s), ${n} new passage(s)`);
    if (buffer.length >= FLUSH_EVERY) await flush();
  } catch (e) { console.error(`  SKIP ${doc.title || doc.url}: ${e.message}`); }
}
await flush(); // remainder

if (!totalUnique) { console.error('No passages ingested.'); process.exit(1); }
console.log(`Done: ${stored} unique passage(s) ${replace ? 'ingested (replaced)' : 'upserted'} for '${source}'${embFail ? ' (FTS only)' : ' (with embeddings)'}.`);
