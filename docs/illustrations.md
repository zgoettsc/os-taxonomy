# Illustration Strategy

Kids need images that feel unique and engaging, not stock clip-art. We use a
**two-track** approach so there's always a safe, dependency-free option, with a
richer track that layers in without changing any callers.

## Track 1 — Procedural (always available)

`pipeline/illustrate.mjs` generates friendly "study buddy" characters and badges
as **SVG**, varying deterministically by seed:

- **Unique per topic/child** — a stable seed from the topic id gives each topic
  its own buddy; a child seed can personalize further. Shape, color, eyes,
  spots, and antenna all vary.
- **Subject-tuned palettes** so a math buddy and a science buddy feel related but
  distinct.
- **Zero dependency, zero copyright risk, zero cost.** Pure code; prints cleanly;
  works offline.
- Best for: decorative warmth, page headers, progress stickers, rewards,
  and the concrete *diagrams* that are the correct illustration for math
  (dot-groups, number bonds — see `engine/lesson-page.mjs`).

This track's job is to guarantee every page can be engaging *right now*, with no
external service and nothing to review.

## Track 2 — AI-generated art (the richer track, gated)

For true picture-book illustration (a scene, an animal, a historical moment), the
production pipeline calls an **image-generation model**, then treats the result
exactly like any other content:

- **Art direction for consistency** — a fixed style prompt / reference so the
  whole binder looks like one book, not a random mixture.
- **Reviewed before use** — generated images pass the same `reviewed` gate as
  text (age-appropriateness, accuracy of depicted facts, no artifacts).
- **Stored + licensed** — images live in Supabase Storage with provenance
  (model, prompt, review status). Our own generated art is ours; any third-party
  or OER art carries its license.
- **Public-domain / OER fallback** — NASA, Smithsonian, Wikimedia Commons, etc.
  for real photographs and historical images where generation isn't appropriate.

Track 2 slots in beside Track 1: callers ask for "an illustration for topic X,"
and the layer returns a reviewed AI image if one exists, else the procedural
buddy. No caller changes when the richer art arrives.

## Why not AI images everywhere from day one

Generated images add cost, latency, a review burden, and accuracy risk (a
six-fingered hand, a wrong historical uniform). The procedural track means the
product is never *blocked* on any of that — it's engaging on day one — and the AI
track is added deliberately, topic by topic, behind the same integrity gates as
every other piece of content.

## Status

- **Built:** the procedural SVG engine (`pipeline/illustrate.mjs`), wired into the
  content pipeline and lesson pages.
- **To build:** the AI-image track (generation call + art-direction + review
  queue + Storage), and the OER image sourcing.
