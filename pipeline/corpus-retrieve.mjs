// Retrieve the most relevant ingested passages for a topic, from a corpus source
// (coreknowledge / ck12 / openstax). Hybrid: embeds the topic query (if a Voyage
// key is present) and calls the DB's match_source_documents() RPC, which fuses
// full-text and vector ranks. Degrades to FTS-only if embedding is unavailable.
//
// Runs where SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (the generation
// Action). Returns [] elsewhere so live-fetch dispatch stays safe.

import { embedQuery } from './embed.mjs';

export async function corpusRetrieve(source, topic, { k = 3 } = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const query = `${topic.name}. ${topic.description || ''}`.trim();

  let embedding = null;
  try { embedding = await embedQuery(query); } catch { embedding = null; } // FTS-only fallback
  const embStr = embedding ? '[' + embedding.join(',') + ']' : null; // pgvector text format for the cast

  try {
    const res = await fetch(`${url}/rest/v1/rpc/match_source_documents`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_text: query, query_embedding: embStr, src: source, match_count: k }),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows || []).map((r) => ({ text: r.text, url: r.url || '', verified: true, title: r.title || source }));
  } catch { return []; }
}
