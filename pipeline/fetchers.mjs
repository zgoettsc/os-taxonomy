// Live source fetchers — the network adapters behind gatherGrounding({live:true}).
//
// Each adapter returns [{ text, url, verified:true }] or [] if nothing was found.
// These hit real source APIs, so they run where egress is open (the GitHub Action),
// NOT in the dev sandbox (org egress policy blocks these hosts — see docs).
//
// Start small: Simple English Wikipedia covers almost any subject at a kid-reading
// level and is CC-BY-SA (commercial-OK with attribution). More adapters (Wikidata,
// Smithsonian, NASA, OpenStax…) slot in the same shape.

const UA = 'MarbleEdu/1.0 (homeschool content pipeline; +https://withmarble.com)';

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Simple English Wikipedia — search for the best page, then pull its intro extract.
async function fetchSimpleWiki(topic) {
  const api = 'https://simple.wikipedia.org/w/api.php';
  const q = encodeURIComponent(topic.name);
  const s = await getJSON(`${api}?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`);
  const hit = s?.query?.search?.[0];
  if (!hit) return [];
  const title = hit.title;
  const e = await getJSON(`${api}?action=query&prop=extracts&explaintext=1&exintro=1&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
  const page = Object.values(e?.query?.pages || {})[0];
  const text = (page?.extract || '').trim();
  if (!text) return [];
  const url = `https://simple.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return [{ text: text.slice(0, 1800), url, verified: true, title }];
}

const ADAPTERS = {
  simplewiki: fetchSimpleWiki,
  // wikidata, smithsonian, nasa, openstax … slot in here as they're implemented.
};

// The fetchImpl passed to gatherGrounding: dispatch by source id, fail soft to [].
export async function liveFetch(source, topic) {
  const fn = ADAPTERS[source.id];
  if (!fn) return []; // no live adapter yet for this source — skip it in live mode
  try { return await fn(topic); } catch { return []; }
}
