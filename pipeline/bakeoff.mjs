// Multi-vendor image bake-off + Claude vision judge.
//
// For the `generate` strategy: fan a brief out to several image vendors, then
// have Claude LOOK AT the candidates and rank them against a rubric. Best-of-N
// with a vision judge — the image analog of our text verify pass.
//
// Use it at LIBRARY-BUILD time, not per request (N× cost). Best used to SELECT a
// primary vendor per style category from a sample, then generate the library
// with the winner — that keeps the house style consistent. Claude's ranking is a
// pre-filter that cuts the human reviewer's load; a human still passes the final
// `reviewed` gate (accuracy + child-safety).

const VENDORS = ['firefly', 'imagen', 'flux', 'recraft', 'ideogram'];

// A vendor adapter: prompt -> { vendor, url }. Real ones call the vendor SDK/API;
// the mock returns a deterministic placeholder so the flow runs offline.
export function mockVendor(name) {
  return { name, async generate(prompt) { return { vendor: name, url: `mock://${name}/${encodeURIComponent(prompt).slice(0, 24)}.png` }; } };
}

// ---- Claude vision judge -------------------------------------------------
const RANK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['ranking', 'winner'],
  properties: {
    ranking: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['vendor', 'score', 'reasons', 'flags'],
      properties: { vendor: { type: 'string' }, score: { type: 'number' },
        reasons: { type: 'string' }, flags: { type: 'array', items: { type: 'string' } } } } },
    winner: { type: 'string' },
  },
};
const RUBRIC =
  'Score each candidate image 0-10 for a children\'s learning page. Criteria: '
  + '(1) age-appropriate and friendly; (2) factually accurate to the subject; '
  + '(3) matches the requested house style; (4) NO artifacts (extra fingers/limbs, '
  + 'uncanny faces, garbled text); (5) clean, uncluttered composition. Flag any '
  + 'child-safety or accuracy problem. Pick the single best winner.';

export async function claudeJudge(brief, candidates) {
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { throw new Error('claudeJudge needs @anthropic-ai/sdk'); }
  const client = new Anthropic();
  const content = [{ type: 'text', text: `${RUBRIC}\n\nBRIEF: ${brief.prompt}` }];
  for (const c of candidates) {
    content.push({ type: 'text', text: `Candidate vendor="${c.vendor}":` });
    content.push({ type: 'image', source: { type: 'url', url: c.url } }); // Claude reads the image
  }
  const res = await client.messages.create({
    model: 'claude-opus-4-8', max_tokens: 4000, thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: RANK_SCHEMA } },
  });
  return JSON.parse(res.content.find((b) => b.type === 'text')?.text || '{}');
}

// Deterministic offline judge (no model): stands in so the flow runs.
export function mockJudge() {
  return async (brief, candidates) => ({
    ranking: candidates.map((c, i) => ({ vendor: c.vendor, score: 9 - i,
      reasons: 'mock score', flags: [] })),
    winner: candidates[0]?.vendor,
    _mock: true,
  });
}

// Orchestrate: generate from all vendors, judge, return winner + provenance.
export async function runBakeoff(brief, { vendors, judge } = {}) {
  vendors = vendors || VENDORS.map(mockVendor);
  judge = judge || mockJudge();
  const candidates = (await Promise.all(vendors.map((v) => v.generate(brief.prompt).catch(() => null)))).filter(Boolean);
  const verdict = await judge(brief, candidates);
  const winner = candidates.find((c) => c.vendor === verdict.winner) || candidates[0];
  return {
    ...brief,
    status: 'pending-review', // human still confirms
    asset: winner?.url, chosenVendor: winner?.vendor,
    provenance: {
      candidates: candidates.map((c) => c.vendor),
      ranking: verdict.ranking, judgedBy: verdict._mock ? 'mock' : 'claude-opus-4-8',
    },
  };
}
