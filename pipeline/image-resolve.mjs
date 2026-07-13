// Unified image resolver — ONE call, both tracks wired.
//
//   const asset = await resolveTopicImage(topic, config)
//
// The source router (image-brief) decides the strategy; this dispatches it:
//   nasa / photo -> real public-domain fetch (photo-sources)
//   generate     -> multi-vendor bake-off + Claude judge (bakeoff)
//   diagram      -> code-drawn (illustrate / lesson-page)
//
// Runs fully offline in MOCK by default. Flip `config.live.photo` /
// `config.live.generate` (with the needed credentials) to produce real assets —
// see docs/image-setup.md. Everything non-diagram returns `pending-review`;
// nothing reaches a child until a human passes the review gate.

import { buildImageBrief } from './image-brief.mjs';
import { fetchPhoto } from './photo-sources.mjs';
import { runBakeoff } from './bakeoff.mjs';
import { mascotSVG, seedFromId } from './illustrate.mjs';

export async function resolveTopicImage(topic, config = {}) {
  const brief = buildImageBrief(topic);
  const live = config.live || {};

  switch (brief.strategy) {
    case 'nasa':
    case 'photo':
      if (live.photo) return fetchPhoto(brief, { fetchImpl: config.fetchImpl });
      return { ...brief, status: 'pending-review', asset: `mock://${brief.strategy}/${topic.id}`,
        note: 'set config.live.photo + network to fetch the real photo' };

    case 'generate':
      if (live.generate) return runBakeoff(brief, { vendors: config.vendors, judge: config.judge });
      return { ...brief, status: 'pending-review', asset: `mock://generate/${topic.id}`,
        note: 'set config.live.generate + vendors + judge to run the bake-off' };

    case 'diagram':
    default:
      // Real math/language diagrams are drawn by engine/lesson-page.mjs; this is
      // the always-available decorative fallback.
      return { ...brief, status: 'ready', asset: mascotSVG(seedFromId(topic.id), topic.subject),
        note: 'code-drawn — no external call needed' };
  }
}
