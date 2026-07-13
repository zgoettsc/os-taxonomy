// Write a generated content record to the GLOBAL content_items table.
//
// Uses the Supabase SERVICE ROLE key (server-side only — bypasses RLS, since this
// is global content shared by all families). Reads SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY from the environment; NEVER hard-code a key. This runs
// in the GitHub Action, not the app and not the dev sandbox.
//
// Idempotent: upserts on (topic_id, version) so re-running a topic updates it.

export async function storeContentItem(content, { reviewed = false } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('storeContentItem needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env');

  const lane = (content.subject === 'Mathematics' || content.practice?.generator) ? 'skill' : 'knowledge';
  const row = {
    topic_id: content.topicId,
    lane,
    age_min: content.ageRange?.[0] ?? null,
    age_max: content.ageRange?.[1] ?? null,
    standards: content.standards || [],
    body: content,
    provenance: content.provenance || {},
    reviewed,
    reviewer: reviewed ? 'auto' : null,
    version: 1,
  };

  const res = await fetch(`${url}/rest/v1/content_items?on_conflict=topic_id,version`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`store failed HTTP ${res.status}: ${text}`);
  const rows = text ? JSON.parse(text) : [];
  return rows[0] || null;
}
