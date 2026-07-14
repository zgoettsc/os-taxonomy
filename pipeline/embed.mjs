// Embeddings via Voyage AI (Anthropic's recommended embeddings partner).
// Reads VOYAGE_API_KEY from env; NEVER hard-code. Used both at ingest time
// (embed each passage) and at generation time (embed the topic query).
//
// Batches are sized by an approximate token budget (not just item count) so a
// single request stays under Voyage's per-minute token cap, and 429s are retried
// with backoff — so ingest survives the free tier (10K TPM / 3 RPM) slowly and
// flies once a payment method unlocks standard limits (free tokens still apply).

export const EMBED_MODEL = 'voyage-3.5-lite';
export const EMBED_DIM = 1024;

// Free tier is 10K tokens/min; keep a request comfortably under that. Overridable.
const TOKEN_BUDGET = Number(process.env.VOYAGE_TOKEN_BUDGET || 9000);
const MAX_ITEMS = Number(process.env.VOYAGE_MAX_ITEMS || 96);
const approxTokens = (s) => Math.ceil((s || '').length / 4); // ~4 chars/token
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function voyageOnce(texts, inputType) {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('embeddings need VOYAGE_API_KEY in env');
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL, input_type: inputType, output_dimension: EMBED_DIM }),
  });
  if (res.status === 429) { const e = new Error(`voyage 429`); e.rateLimited = true; e.body = await res.text(); throw e; }
  if (!res.ok) throw new Error(`voyage ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.data || []).map((d) => d.embedding);
}

// One request with retry/backoff on rate-limit. Waits out the per-minute window.
async function voyage(texts, inputType, { retries = 10 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await voyageOnce(texts, inputType); }
    catch (e) {
      if (!e.rateLimited || attempt >= retries) throw e;
      const wait = Math.min(60000, 5000 * 2 ** attempt); // 5s,10s,20s,40s,60s…
      console.error(`  voyage rate-limited; waiting ${wait / 1000}s (attempt ${attempt + 1}/${retries})`);
      await sleep(wait);
    }
  }
}

// Group items into batches that stay under both the item cap and the token budget.
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

// Batch-embed corpus passages (input_type=document).
export async function embedDocuments(texts) {
  const batches = batchByTokens(texts);
  const out = [];
  for (let i = 0; i < batches.length; i++) {
    out.push(...await voyage(batches[i], 'document'));
    if (i % 10 === 0 || i === batches.length - 1) console.error(`  embedded batch ${i + 1}/${batches.length}`);
  }
  return out;
}

// Embed one search query (input_type=query).
export async function embedQuery(text) {
  return (await voyage([text], 'query'))[0];
}
