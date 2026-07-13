// Image providers — resolve an image brief into an actual asset.
//
// Same seam pattern as the text provider: a MOCK for offline runs, and real
// adapters that slot in with a vendor key. Which adapter runs is decided by the
// brief's `strategy` (see pipeline/image-brief.mjs). Every resolved asset lands
// as `status: 'pending-review'` — nothing reaches a child until a human passes
// the review gate.
//
// NOTE: image GENERATION is a separate provider from Claude (Claude reads images,
// it doesn't create them). Candidate generators for the `generate` strategy —
// pick by licensing/style/safety needs:
//   • Adobe Firefly     — trained on licensed + public-domain data ("commercially
//                          safe"); strong for a product that may go commercial.
//   • Google Imagen      — high quality; Gemini image APIs.
//   • Black Forest FLUX  — open weights, self-hostable (full control/cost).
//   • Recraft / Ideogram — illustration + style-lock + reliable in-image text.
// Photo strategies use open APIs: NASA Images, Wikimedia Commons, Smithsonian
// Open Access, iNaturalist (CC).

// ---- MOCK (offline, deterministic) ---------------------------------------
export function mockImageProvider() {
  return {
    name: 'mock',
    async resolve(brief) {
      return {
        ...brief,
        status: 'pending-review',
        asset: `mock://${brief.strategy}/${brief.topicId}.png`,
        note: 'placeholder — wire a real provider/photo API to produce the actual image',
      };
    },
  };
}

// ---- REAL adapters (require a vendor/key; documented, not run here) -------
// Each returns an asset descriptor { url|path, license, attribution } for review.

// AI illustration for the `generate` strategy. Shape shown; fill in the chosen
// vendor's SDK/endpoint. Keep the art-direction prompt from the brief intact for
// house-style consistency.
export async function generateImageProvider(callVendor) {
  // callVendor(prompt, {aspect}) -> { url, bytes } from your image-gen vendor.
  if (typeof callVendor !== 'function') throw new Error('generateImageProvider needs a vendor call fn');
  return {
    name: 'generate',
    async resolve(brief) {
      const out = await callVendor(brief.prompt, { aspect: '4:3' });
      return { ...brief, status: 'pending-review', asset: out.url,
        license: 'generated (ours)', attribution: null };
    },
  };
}

// Real public-domain photo fetch (animals/plants/places) or NASA (space).
// searchOpenLibrary(query, sources) -> { url, license, attribution } from an
// open image API. Returns the best licensed match for review.
export async function photoProvider(searchOpenLibrary) {
  if (typeof searchOpenLibrary !== 'function') throw new Error('photoProvider needs a search fn');
  return {
    name: 'photo',
    async resolve(brief) {
      const hit = await searchOpenLibrary(brief.query, brief.source);
      return { ...brief, status: 'pending-review', asset: hit.url,
        license: hit.license, attribution: hit.attribution };
    },
  };
}

// Dispatch a brief to the right provider by strategy.
export async function resolveImage(brief, providers = {}) {
  const p = providers[brief.strategy] || providers.default || mockImageProvider();
  return p.resolve(brief);
}
