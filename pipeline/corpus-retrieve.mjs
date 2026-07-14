// Retrieve the relevant ingested passages for a topic, from a corpus source
// (coreknowledge / ck12 / openstax) via full-text (keyword) search.
//
// Retrieval is FTS-only by design: the corpus (100k+ passages) is too large to
// carry a vector index on small DB compute without draining Disk IO, and keyword
// search over curriculum text is proven to surface the right passages. The
// match_source_documents() RPC still supports a vector half — pass an embedding
// via CORPUS_QUERY_EMBEDDING wiring if you later move to bigger compute — but by
// default we send no embedding and it runs pure FTS.
//
// How MUCH we return is governed by a TOKEN BUDGET, not a fixed count: passages
// come back in relevance order and we keep taking them until we've gathered
// ~CORPUS_MAX_TOKENS of grounding (default 16k ≈ a whole unit) or the material
// runs out. A rich topic contributes many passages, a thin one few.
//
// Runs where SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (the generation
// Action). Returns [] elsewhere so live-fetch dispatch stays safe.

const MAX_TOKENS = Number(process.env.CORPUS_MAX_TOKENS || 16000); // grounding budget per source
const CANDIDATES = Number(process.env.CORPUS_CANDIDATES || 60);    // ranked rows to pull, then trim by budget
const approxTokens = (s) => Math.ceil((s || '').length / 4);

// Common words that shouldn't drive retrieval. FTS stemming does the rest.
const STOP = new Set(('a an and are as at be by for from how in into is it its of on or over such that the their them then '
  + 'these they this to under up use used using what when which who why will with your you about can each other than').split(' '));

// OR the topic's meaningful words (websearch_to_tsquery ANDs by default — far too
// strict for a whole sentence).
function ftsQuery(topic) {
  const words = `${topic.name} ${topic.description || ''}`.toLowerCase().match(/[a-z]{3,}/g) || [];
  const uniq = [...new Set(words)].filter((w) => !STOP.has(w));
  return uniq.join(' OR ');
}

export async function corpusRetrieve(source, topic, { maxTokens = MAX_TOKENS, candidates = CANDIDATES } = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error(`  corpus[${source}]: no SUPABASE creds — skipped`); return []; }
  const ftsText = ftsQuery(topic) || topic.name;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/match_source_documents`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      // query_embedding: null → the RPC's vector half is skipped, pure FTS.
      body: JSON.stringify({ query_text: ftsText, query_embedding: null, src: source, match_count: candidates }),
    });
    if (!res.ok) { console.error(`  corpus[${source}]: RPC HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); return []; }
    const rows = await res.json();
    if (!rows || !rows.length) { console.error(`  corpus[${source}]: 0 passages matched "${topic.name}" (FTS)`); return []; }

    // Take passages in relevance order up to the token budget — as much real
    // material as exists, not a fixed count.
    const out = []; let tok = 0;
    for (const r of rows) {
      const t = approxTokens(r.text);
      if (out.length && tok + t > maxTokens) break; // always keep at least one
      out.push({ text: r.text, url: r.url || '', verified: true, title: r.title || source });
      tok += t;
    }
    console.error(`  corpus[${source}]: ${out.length}/${rows.length} passage(s), ~${tok} tokens (FTS)`);
    return out;
  } catch (e) { console.error(`  corpus[${source}]: RPC error ${e.message}`); return []; }
}
