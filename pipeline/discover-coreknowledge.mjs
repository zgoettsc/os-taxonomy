#!/usr/bin/env node
// Auto-discover every Core Knowledge free-curriculum unit and its download links.
//   node pipeline/discover-coreknowledge.mjs [--subjects Science,History] [--grades 1,2] [--limit 5]
//
// Runs where egress is open (the ingest Action). Crawls the WordPress site two
// ways and merges: (1) the WP REST API post type `library` (fast, structured),
// (2) an HTML fallback over the server-rendered listing at
// /download-free-curriculum/page/N/ scraping `a.card-contain` -> /free-resource/
// cards. Then visits each resource page and collects its download links,
// preferring the single "Download Entire Unit" .zip over the individual .pdfs
// (so a unit ingests once, not twice). VERBOSE on stderr so we can tune it from
// the Action log; prints the discovered manifest on stdout.

const BASE = 'https://www.coreknowledge.org';
const UA = 'MarbleEdu/1.0 (homeschool content; +https://withmarble.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, json = false) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html' } });
  if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; e.res = r; throw e; }
  return json ? r.json() : r.text();
}

const subjectFromTitle = (t) => {
  const s = (t || '').toLowerCase();
  if (/cksci|science/.test(s)) return 'Science';
  if (/ckhg|history|geograph/.test(s)) return 'History';
  if (/ckla|language arts|reading|listening|literature|read[\s-]?aloud/.test(s)) return 'English';
  if (/ckmath|math/.test(s)) return 'Mathematics';
  return null;
};
const gradeFromTitle = (t) => {
  const s = t || '';
  let m = s.match(/grade\s*(\d+)/i) || s.match(/\bG(\d)\b/) || s.match(/_G(\d)_/) || s.match(/\bG(\d)U\d/);
  if (m) return m[1];
  if (/\b(pre[\s-]?k|preschool)\b/i.test(s)) return 'PreK';
  if (/\bkindergarten\b/i.test(s) || /\bGK\b/.test(s)) return 'K';
  return null;
};

const decode = (s) => (s || '')
  .replace(/&#8217;|&#039;|&#39;/g, '’').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
  .replace(/<[^>]+>/g, '').trim();

// (1) WP REST API — post type `library` (revealed by <link .../wp-json/wp/v2/library/ID>).
async function enumerateViaRest() {
  const items = [];
  for (let page = 1; page <= 60; page++) {
    let r;
    try {
      r = await fetch(`${BASE}/wp-json/wp/v2/library?per_page=100&page=${page}&_fields=link,title`, { headers: { 'User-Agent': UA } });
    } catch (e) { console.error('REST library fetch failed:', e.message); break; }
    if (!r.ok) { if (page === 1) console.error(`REST /library -> HTTP ${r.status}`); break; }
    const arr = await r.json();
    if (!Array.isArray(arr) || !arr.length) break;
    for (const it of arr) items.push({ link: it.link, title: decode(it.title && it.title.rendered) });
    const totalPages = Number(r.headers.get('x-wp-totalpages') || 0);
    if (totalPages && page >= totalPages) break;
    await sleep(120);
  }
  if (items.length) console.error(`REST post type 'library': ${items.length} resource(s)`);
  return items;
}

// (2) HTML fallback — server-rendered listing, paginated /download-free-curriculum/page/N/.
// Cards: <a href=".../free-resource/<slug>/" class="card-contain ..."> ... <span class="taxonomy">Grade 1</span>
async function enumerateViaHtml() {
  const items = [];
  const seen = new Set();
  for (let page = 1; page <= 60; page++) {
    const url = page === 1 ? `${BASE}/download-free-curriculum/` : `${BASE}/download-free-curriculum/page/${page}/`;
    let html;
    try { html = await get(url); }
    catch (e) { if (e.status === 404) break; console.error(`  listing page ${page} failed: ${e.message}`); break; }
    // Each card anchor to a /free-resource/ page; capture its inner HTML to read title + taxonomy.
    const cards = [...html.matchAll(/<a\b[^>]*href="(https:\/\/www\.coreknowledge\.org\/free-resource\/[^"]+)"[^>]*class="[^"]*card-contain[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
    if (!cards.length) {
      // Looser: any anchor to a free-resource page on this listing.
      const loose = [...html.matchAll(/href="(https:\/\/www\.coreknowledge\.org\/free-resource\/[^"]+)"/gi)].map((m) => m[1]);
      for (const link of loose) { if (!seen.has(link)) { seen.add(link); items.push({ link, title: '' }); } }
      if (!loose.length) break;
    } else {
      for (const [, link, inner] of cards) {
        if (seen.has(link)) continue; seen.add(link);
        const gradeM = inner.match(/<span[^>]*class="[^"]*taxonomy[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const titleM = inner.match(/<(?:h\d|div|span)[^>]*class="[^"]*(?:card-title|title)[^"]*"[^>]*>([\s\S]*?)<\/(?:h\d|div|span)>/i);
        items.push({
          link,
          title: decode(titleM ? titleM[1] : inner),
          gradeHint: gradeM ? decode(gradeM[1]) : null,
        });
      }
    }
    await sleep(120);
  }
  if (items.length) console.error(`HTML listing: ${items.length} resource card(s)`);
  return items;
}

async function enumerateResources() {
  const byLink = new Map();
  for (const src of [await enumerateViaRest(), await enumerateViaHtml()]) {
    for (const it of src) {
      const cur = byLink.get(it.link);
      if (!cur) byLink.set(it.link, it);
      else { // merge — keep any title/gradeHint we have
        if (!cur.title && it.title) cur.title = it.title;
        if (!cur.gradeHint && it.gradeHint) cur.gradeHint = it.gradeHint;
      }
    }
  }
  const items = [...byLink.values()];
  if (!items.length) throw new Error('No resource posts found via REST or HTML — the crawler needs tuning (inspect this log).');
  console.error(`Merged ${items.length} unique resource page(s).`);
  return items;
}

// A resource page carries a "Download Entire Unit" .zip AND individual .pdf buttons.
// Prefer the zip (one download == the whole unit); fall back to the PDFs if there's no zip.
function downloadLinksFor(html) {
  const all = [...html.matchAll(/https:\/\/www\.coreknowledge\.org\/wp-content\/uploads\/[^"'\s)]+\.(?:zip|pdf)/gi)]
    .map((m) => m[0]);
  const uniq = [...new Set(all)];
  const zips = uniq.filter((u) => /\.zip$/i.test(u));
  return zips.length ? zips : uniq.filter((u) => /\.pdf$/i.test(u));
}

export async function discoverCoreKnowledge({ subjects = null, grades = null, limit = 0 } = {}) {
  const items = await enumerateResources();
  const docs = [];
  const seen = new Set();
  let visited = 0;
  for (const it of items) {
    const subj = subjectFromTitle(it.title);
    if (subjects && subj && !subjects.includes(subj)) continue;
    const grade = gradeFromTitle(it.title) || gradeFromTitle(it.gradeHint);
    if (grades && grade && !grades.map(String).includes(String(grade))) continue;
    if (limit && visited >= limit) break;
    try {
      const html = await get(it.link);
      const links = downloadLinksFor(html);
      if (!links.length) { console.error(`  no downloads on ${it.link}`); }
      for (const dl of links) {
        if (seen.has(dl)) continue; seen.add(dl);
        docs.push({ url: dl, cite: it.link, title: it.title || it.link, grade, subjects: subj ? [subj] : [] });
      }
      visited++;
      await sleep(120);
    } catch (e) { console.error(`  page failed ${it.link}: ${e.message}`); }
  }
  console.error(`Discovered ${docs.length} download(s) across ${visited} resource page(s).`);
  return docs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = {};
  for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1]; }
  const docs = await discoverCoreKnowledge({
    subjects: argv.subjects ? argv.subjects.split(',') : null,
    grades: argv.grades ? argv.grades.split(',') : null,
    limit: Number(argv.limit) || 0,
  });
  process.stdout.write(JSON.stringify({ source: 'coreknowledge', generated: 'auto-discovered', documents: docs }, null, 2) + '\n');
}
