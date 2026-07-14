// Retrieve the most relevant ingested passages for a topic, from a corpus source
// (coreknowledge / ck12 / openstax). Hybrid: embeds the topic query (if a Voyage
// key is present) and calls the DB's match_source_documents() RPC, which fuses
// full-text and vector ranks. Degrades to FTS-only if embedding is unavailable.
//
// Runs where SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (the generation
// Action). Returns [] elsewhere so live-fetch dispatch stays safe. Logs WHY it's
// empty to stderr (visible in the Action log) — silent [] hid real failures.

import { embedQuery } from './embed.mjs';

export async function corpusRetrieve(source, topic, { k = 3 } = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error(`  corpus[${source}]: no SUPABASE creds — skipped`); return []; }
  const query = `${topic.name}. ${topic.description || ''}`.trim();

  let embedding = null;
  try { embedding = await embedQuery(query); } // FTS-only fallback if throttled/no key
  catch (e) { console.error(`  corpus[${source}]: query embed failed (${e.message}) — FTS only`); }
  const embStr = embedding ? '[' + embedding.join(',') + ']' : null; // pgvector text format for the cast

  try {
    const res = await fetch(`${url}/rest/v1/rpc/match_source_documents`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_text: query, query_embedding: embStr, src: source, match_count: k }),
    });
    if (!res.ok) { console.error(`  corpus[${source}]: RPC HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); return []; }
    const rows = await res.json();
    if (!rows || !rows.length) { console.error(`  corpus[${source}]: 0 passages matched "${topic.name}" (${embedding ? 'hybrid' : 'FTS-only'})`); return []; }
    console.error(`  corpus[${source}]: ${rows.length} passage(s) (${embedding ? 'hybrid' : 'FTS-only'})`);
    return rows.map((r) => ({ text: r.text, url: r.url || '', verified: true, title: r.title || source }));
  } catch (e) { console.error(`  corpus[${source}]: RPC error ${e.message}`); return []; }
}
