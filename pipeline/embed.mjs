// Embeddings for the corpus (ingest time) and topic queries (generation time).
//
// Two interchangeable providers behind one interface; the DB column is vector(1024)
// and BOTH providers emit 1024 dims, so switching needs no schema change:
//   - openai: text-embedding-3-small (dimensions=1024). High limits, cheap.
//   - voyage: voyage-3.5-lite (output_dimension=1024).
// Selection: EMBED_PROVIDER env, else 'openai' if OPENAI_API_KEY is set, else 'voyage'.
//
// Batches are sized by an approximate token budget (per provider) and 429s retry
// with backoff, so ingest survives throttling and flies when limits are generous.

export const EMBED_DIM = 1024;

const PROVIDER = process.env.EMBED_PROVIDER
  || (process.env.OPENAI_API_KEY ? 'openai' : 'voyage');

const CONF = {
  openai: { url: 'https://api.openai.com/v1/embeddings', model: 'text-embedding-3-small', keyEnv: 'OPENAI_API_KEY', tokenBudget: 200000, maxItems: 512 },
  voyage: { url: 'https://api.voyageai.com/v1/embeddings', model: 'voyage-3.5-lite', keyEnv: 'VOYAGE_API_KEY', tokenBudget: 9000, maxItems: 96 },
};
const conf = CONF[PROVIDER] || CONF.voyage;

const TOKEN_BUDGET = Number(process.env.EMBED_TOKEN_BUDGET || conf.tokenBudget);
const MAX_ITEMS = Number(process.env.EMBED_MAX_ITEMS || conf.maxItems);
const approxTokens = (s) => Math.ceil((s || '').length / 4); // ~4 chars/token
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requestBody(texts, inputType) {
  if (PROVIDER === 'openai') return { input: texts, model: conf.model, dimensions: EMBED_DIM };
  return { input: texts, model: conf.model, input_type: inputType, output_dimension: EMBED_DIM };
}

async function embedOnce(texts, inputType) {
  const key = process.env[conf.keyEnv];
  if (!key) throw new Error(`embeddings need ${conf.keyEnv} in env`);
  const res = await fetch(conf.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody(texts, inputType)),
  });
  if (res.status === 429) { const e = new Error(`${PROVIDER} 429`); e.rateLimited = true; e.body = await res.text(); throw e; }
  if (!res.ok) throw new Error(`${PROVIDER} ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.data || []).map((d) => d.embedding);
}

// One request with retry/backoff on rate-limit.
async function embed(texts, inputType, { retries = 10 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await embedOnce(texts, inputType); }
    catch (e) {
      if (!e.rateLimited || attempt >= retries) throw e;
      const wait = Math.min(60000, 5000 * 2 ** attempt);
      console.error(`  ${PROVIDER} rate-limited; waiting ${wait / 1000}s (attempt ${attempt + 1}/${retries})`);
      await sleep(wait);
    }
  }
}

// Group items into batches under both the item cap and the token budget.
function batchByTokens(texts) {
  const batches = []; let cur = []; let tok = 0;
  for (const t of texts) {
    const n = approxTokens(t);
    if (cur.length && (cur.length >= MAX_ITEMS || tok + n > TOKEN_BUDGET)) { batches.push(cur); cur = []; tok = 0; }
    cur.push(t); tok += n;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

// Batch-embed corpus passages.
export async function embedDocuments(texts) {
  const batches = batchByTokens(texts);
  const out = [];
  for (let i = 0; i < batches.length; i++) {
    out.push(...await embed(batches[i], 'document'));
    if (i % 10 === 0 || i === batches.length - 1) console.error(`  [${PROVIDER}] embedded batch ${i + 1}/${batches.length}`);
  }
  return out;
}

// Embed one search query. Fails fast so generation drops to FTS if throttled.
export async function embedQuery(text) {
  return (await embed([text], 'query', { retries: 0 }))[0];
}
