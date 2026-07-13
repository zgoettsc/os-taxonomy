// Embeddings via Voyage AI (Anthropic's recommended embeddings partner).
// Reads VOYAGE_API_KEY from env; NEVER hard-code. Used both at ingest time
// (embed each passage) and at generation time (embed the topic query).

export const EMBED_MODEL = 'voyage-3.5-lite';
export const EMBED_DIM = 1024;

async function voyage(texts, inputType) {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('embeddings need VOYAGE_API_KEY in env');
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL, input_type: inputType, output_dimension: EMBED_DIM }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.data || []).map((d) => d.embedding);
}

// Batch-embed corpus passages (input_type=document). Chunks into safe batch sizes.
export async function embedDocuments(texts, { batch = 96 } = {}) {
  const out = [];
  for (let i = 0; i < texts.length; i += batch) {
    out.push(...await voyage(texts.slice(i, i + batch), 'document'));
  }
  return out;
}

// Embed one search query (input_type=query).
export async function embedQuery(text) {
  return (await voyage([text], 'query'))[0];
}
