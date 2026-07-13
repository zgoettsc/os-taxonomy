// Live source fetchers — the network adapters behind gatherGrounding({live:true}).
//
// Each adapter returns [{ text, url, verified:true, title }] or [] if nothing was
// found. These hit real source APIs, so they run where egress is open (the GitHub
// Action / grounding dump), NOT in the dev sandbox (org egress policy blocks these
// hosts).
//
// Honest state of "all sources": the MediaWiki-family sources (Wikipedia, Simple
// Wikipedia, Wikijunior) and Wikidata expose clean, key-free passage APIs, so they
// fetch live now. The government / institutional / OER sources either need an API
// key, expose no topic-passage API, or are subject-specific — see ADAPTER_STATUS.
// They slot in as adapters are written (and keys added).

import { corpusRetrieve } from './corpus-retrieve.mjs';

const UA = 'MarbleEdu/1.0 (homeschool content pipeline; +https://withmarble.com)';

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Generic MediaWiki adapter: search for the best-matching page, then pull the
// FULL plain-text article (not just the intro). Used for Wikipedia / Simple
// Wikipedia / Wikibooks(Wikijunior).
async function mwFetch(apiBase, wikiBase, topic, { cap = 6000 } = {}) {
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`${apiBase}?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`);
  const hit = s?.query?.search?.[0];
  if (!hit) return [];
  const title = hit.title;
  const e = await getJSON(`${apiBase}?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
  const page = Object.values(e?.query?.pages || {})[0];
  const text = (page?.extract || '').trim();
  if (!text) return [];
  const url = `${wikiBase}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return [{ text: text.slice(0, cap), url, verified: true, title }];
}

const fetchWikipedia  = (t) => mwFetch('https://en.wikipedia.org/w/api.php',      'https://en.wikipedia.org',   t, { cap: 8000 });
const fetchSimpleWiki = (t) => mwFetch('https://simple.wikipedia.org/w/api.php',  'https://simple.wikipedia.org', t, { cap: 4000 });
const fetchWikijunior = (t) => mwFetch('https://en.wikibooks.org/w/api.php',      'https://en.wikibooks.org',   t, { cap: 4000 });

// Wikidata: structured facts — entity description + a few statement labels.
async function fetchWikidata(topic) {
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=en&format=json&limit=1&origin=*`);
  const hit = s?.search?.[0];
  if (!hit) return [];
  const bits = [hit.label];
  if (hit.description) bits.push(`— ${hit.description}`);
  const url = `https://www.wikidata.org/wiki/${hit.id}`;
  return [{ text: bits.join(' ') + '.', url, verified: true, title: hit.label }];
}

// NASA Image & Video Library — keyless; returns titled image records with
// descriptions. Good for space / earth-science topics.
async function fetchNasa(topic) {
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`https://images-api.nasa.gov/search?q=${q}&media_type=image`);
  const items = s?.collection?.items || [];
  const out = [];
  for (const it of items.slice(0, 2)) {
    const d = it?.data?.[0]; if (!d) continue;
    const text = [d.title, d.description].filter(Boolean).join(' — ');
    if (text) out.push({ text: text.slice(0, 1200), url: d.nasa_id ? `https://images.nasa.gov/details/${d.nasa_id}` : 'https://images.nasa.gov', verified: true, title: d.title });
  }
  return out;
}

// Library of Congress — keyless loc.gov JSON. Catalog items (books, photos,
// primary sources) — best for History / English primary-source topics.
async function fetchLoc(topic) {
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`https://www.loc.gov/search/?q=${q}&fo=json&c=3&at=results`);
  const results = s?.results || [];
  const out = [];
  for (const r of results.slice(0, 2)) {
    const desc = Array.isArray(r.description) ? r.description.join(' ') : (r.description || '');
    const text = [r.title, desc].filter(Boolean).join(' — ');
    if (text) out.push({ text: text.slice(0, 1000), url: r.id || r.url || 'https://www.loc.gov', verified: true, title: r.title });
  }
  return out;
}

// Smithsonian Open Access — needs a free api.data.gov key in SMITHSONIAN_API_KEY.
// Returns object/specimen records with notes. Science / History.
async function fetchSmithsonian(topic) {
  const key = process.env.SMITHSONIAN_API_KEY;
  if (!key) return []; // no key configured — reported in ADAPTER_STATUS
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`https://api.si.edu/openaccess/api/v1.0/search?q=${q}&rows=3&api_key=${key}`);
  const rows = s?.response?.rows || [];
  const out = [];
  for (const r of rows.slice(0, 2)) {
    const dn = r?.content?.descriptiveNonRepeating;
    const title = dn?.title?.content || r.title;
    const notes = (r?.content?.freetext?.notes || []).map((n) => n.content).filter(Boolean).join(' ');
    const text = [title, notes].filter(Boolean).join(' — ');
    if (text) out.push({ text: text.slice(0, 1200), url: dn?.record_link || 'https://www.si.edu', verified: true, title });
  }
  return out;
}

const ADAPTERS = {
  wikipedia: fetchWikipedia,
  simplewiki: fetchSimpleWiki,
  wikijunior: fetchWikijunior,
  wikidata: fetchWikidata,
  nasa: fetchNasa,
  loc: fetchLoc,
  smithsonian: fetchSmithsonian,
  // corpus sources: retrieved from our ingested source_documents (hybrid FTS+vector)
  coreknowledge: (t) => corpusRetrieve('coreknowledge', t),
  ck12: (t) => corpusRetrieve('ck12', t),
  openstax: (t) => corpusRetrieve('openstax', t),
};

// Honest per-source status, so the grounding dump shows exactly what each source
// does (and why it's empty when it is).
export const ADAPTER_STATUS = {
  wikipedia:     'live — full article via MediaWiki API',
  simplewiki:    'live — full article via MediaWiki API',
  wikijunior:    'live — searches Wikibooks (Wikijunior is a subset); may miss',
  wikidata:      'live — entity label + description via wbsearchentities',
  nasa:          'live — NASA Image & Video Library (keyless); science topics',
  loc:           'live — Library of Congress loc.gov JSON (keyless); History/English',
  smithsonian:   'live IF SMITHSONIAN_API_KEY set (free api.data.gov key); else skipped',
  noaa:          'no topic-passage API (data feeds only) — needs corpus ingestion',
  usgs:          'no topic-passage API (data feeds only) — needs corpus ingestion',
  openstax:      'live from ingested corpus (run ingest for openstax first)',
  ck12:          'live from ingested corpus (run ingest for ck12 first)',
  coreknowledge: 'live from ingested corpus (run ingest for coreknowledge first)',
};

// The fetchImpl passed to gatherGrounding: dispatch by source id, fail soft to [].
export async function liveFetch(source, topic) {
  const fn = ADAPTERS[source.id];
  if (!fn) return []; // no live adapter yet — the dump reports ADAPTER_STATUS[source.id]
  try { return await fn(topic); } catch { return []; }
}
