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

const ADAPTERS = {
  wikipedia: fetchWikipedia,
  simplewiki: fetchSimpleWiki,
  wikijunior: fetchWikijunior,
  wikidata: fetchWikidata,
};

// Honest per-source status, so the grounding dump shows exactly what each source
// does (and why it's empty when it is).
export const ADAPTER_STATUS = {
  wikipedia:     'live — full article via MediaWiki API',
  simplewiki:    'live — full article via MediaWiki API',
  wikijunior:    'live — searches Wikibooks (Wikijunior is a subset); may miss',
  wikidata:      'live — entity label + description via wbsearchentities',
  nasa:          'needs API key (api.nasa.gov); space/earth-science topics only',
  noaa:          'no topic-passage API; weather/ocean-science topics only',
  usgs:          'no topic-passage API; geology/water topics only',
  smithsonian:   'needs API key (api.si.edu via data.gov); object/specimen metadata',
  loc:           'catalog API returns items, not topic prose',
  openstax:      'books are PDF/CNXML; no per-topic passage API',
  ck12:          'no public passage API (NonCommercial)',
  coreknowledge: 'no public passage API (NonCommercial)',
};

// The fetchImpl passed to gatherGrounding: dispatch by source id, fail soft to [].
export async function liveFetch(source, topic) {
  const fn = ADAPTERS[source.id];
  if (!fn) return []; // no live adapter yet — the dump reports ADAPTER_STATUS[source.id]
  try { return await fn(topic); } catch { return []; }
}
