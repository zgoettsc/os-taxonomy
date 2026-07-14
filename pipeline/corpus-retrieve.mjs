// Retrieve the most relevant ingested passages for a topic, from a corpus source
// (coreknowledge / ck12 / openstax). Hybrid: embeds the topic query (if a Voyage
// key is present) and calls the DB's match_source_documents() RPC, which fuses
// full-text and vector ranks. Degrades to FTS-only if embedding is unavailable.
//
// Runs where SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (the generation
// Action). Returns [] elsewhere so live-fetch dispatch stays safe. Logs WHY it's
// empty to stderr (visible in the Action log) — silent [] hid real failures.

import { embedQuery } from './embed.mjs';

// Common words that shouldn't drive retrieval. Kept small; FTS stemming does the rest.
const STOP = new Set(('a an and are as at be by for from how in into is it its of on or over such that the their them then '
  + 'these they this to under up use used using what when which who why will with your you about can each other than').split(' '));

// Build an OR full-text query from the topic's meaningful words. websearch_to_tsquery
// ANDs terms by default — far too strict for a whole sentence, so we OR the keywords
// (any match, ranked by ts_rank) instead of requiring every one in a single passage.
function ftsQuery(topic) {
  const words = `${topic.name} ${topic.description || ''}`.toLowerCase().match(/[a-z]{3,}/g) || [];
  const uniq = [...new Set(words)].filter((w) => !STOP.has(w));
  return uniq.join(' OR ');
}

export async function corpusRetrieve(source, topic, { k = 3 } = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error(`  corpus[${source}]: no SUPABASE creds — skipped`); return []; }
  const natural = `${topic.name}. ${topic.description || ''}`.trim(); // for the vector half
  const ftsText = ftsQuery(topic) || topic.name;                     // OR-joined, for the FTS half

  let embedding = null;
  try { embedding = await embedQuery(natural); } // FTS-only fallback if throttled/no key
  catch (e) { console.error(`  corpus[${source}]: query embed failed (${e.message}) — FTS only`); }
  const embStr = embedding ? '[' + embedding.join(',') + ']' : null; // pgvector text format for the cast

  try {
    const res = await fetch(`${url}/rest/v1/rpc/match_source_documents`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_text: ftsText, query_embedding: embStr, src: source, match_count: k }),
    });
    if (!res.ok) { console.error(`  corpus[${source}]: RPC HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); return []; }
    const rows = await res.json();
    if (!rows || !rows.length) { console.error(`  corpus[${source}]: 0 passages matched "${topic.name}" (${embedding ? 'hybrid' : 'FTS-only'})`); return []; }
    console.error(`  corpus[${source}]: ${rows.length} passage(s) (${embedding ? 'hybrid' : 'FTS-only'})`);
    return rows.map((r) => ({ text: r.text, url: r.url || '', verified: true, title: r.title || source }));
  } catch (e) { console.error(`  corpus[${source}]: RPC error ${e.message}`); return []; }
}
