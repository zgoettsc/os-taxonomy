#!/usr/bin/env node
// Auto-discover every Core Knowledge free-curriculum unit and its download links.
//   node pipeline/discover-coreknowledge.mjs [--subjects Science,History] [--grades 1,2] [--limit 5]
//
// Runs where egress is open (the ingest Action). Best-effort crawler over the
// WordPress site: enumerate resource posts via the WP REST API, then scrape each
// resource page for its wp-content .zip/.pdf download links. VERBOSE on stderr so
// we can tune it from the Action log; prints the discovered manifest on stdout.

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
  if (/ckla|language arts|reading|listening|literature/.test(s)) return 'English';
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

// Enumerate resource posts via the WP REST API (find the right post type first).
async function enumerateResources() {
  let candidates = ['free-resource', 'free_resource', 'resource', 'resources', 'free-resources', 'curriculum'];
  try {
    const types = await get(`${BASE}/wp-json/wp/v2/types`, true);
    const found = Object.values(types).map((t) => t.rest_base).filter(Boolean)
      .filter((rb) => /resource|free|curriculum|download/i.test(rb));
    if (found.length) { candidates = [...new Set([...found, ...candidates])]; console.error('REST post types:', found.join(', ')); }
  } catch (e) { console.error('types probe failed:', e.message); }

  for (const rb of candidates) {
    const items = [];
    try {
      for (let page = 1; page <= 60; page++) {
        const r = await fetch(`${BASE}/wp-json/wp/v2/${rb}?per_page=100&page=${page}&_fields=link,title`, { headers: { 'User-Agent': UA } });
        if (!r.ok) break;
        const arr = await r.json();
        if (!Array.isArray(arr) || !arr.length) break;
        for (const it of arr) items.push({ link: it.link, title: (it.title && it.title.rendered) || '' });
        const totalPages = Number(r.headers.get('x-wp-totalpages') || 0);
        if (totalPages && page >= totalPages) break;
        await sleep(120);
      }
    } catch (e) { console.error(`rest_base '${rb}' failed:`, e.message); }
    if (items.length) { console.error(`Post type '${rb}': ${items.length} resource(s)`); return items; }
  }
  throw new Error('No resource posts found via REST — the crawler needs tuning (inspect the site / this log).');
}

export async function discoverCoreKnowledge({ subjects = null, grades = null, limit = 0 } = {}) {
  const items = await enumerateResources();
  const docs = [];
  const seen = new Set();
  let visited = 0;
  for (const it of items) {
    const subj = subjectFromTitle(it.title);
    if (subjects && subj && !subjects.includes(subj)) continue;
    const grade = gradeFromTitle(it.title);
    if (grades && grade && !grades.map(String).includes(String(grade))) continue;
    if (limit && visited >= limit) break;
    try {
      const html = await get(it.link);
      const links = [...html.matchAll(/https:\/\/www\.coreknowledge\.org\/wp-content\/uploads\/[^"'\s)]+\.(?:zip|pdf)/gi)].map((m) => m[0]);
      for (const dl of [...new Set(links)]) {
        if (seen.has(dl)) continue; seen.add(dl);
        docs.push({ url: dl, cite: it.link, title: it.title, grade, subjects: subj ? [subj] : [] });
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
