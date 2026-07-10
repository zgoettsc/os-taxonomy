# Illustration Strategy

Kids need images that feel real and engaging. The right image for a topic is
often **not** an AI generation — for a *factual* product, a real photograph or a
NASA image is more accurate, safer, and free. So we route each topic to the best
source rather than generating everything.

> **Architecture note:** image *generation* is a separate provider from Claude —
> Claude reads images, it doesn't create them. Generation is its own seam
> (`pipeline/image-provider.mjs`), distinct from the text/Claude pipeline.

## The source router (`pipeline/image-brief.mjs`)

Per topic, pick the source that gives the best, safest, correctly-licensed image:

| Strategy | When | Source | Why |
|---|---|---|---|
| **nasa** | space, planets, stars | NASA image library (public domain) | Real Hubble/Webb/Apollo imagery — free, stunning, accurate. Never fake a nebula. |
| **photo** | real animals, plants, places, artifacts | Wikimedia Commons, Smithsonian Open Access, iNaturalist (CC), Flickr Commons | A child identifying a barn owl needs a *real* owl. Generated animals get anatomy subtly wrong. Free + accurate + safe. |
| **generate** | scenes, characters, feelings, concepts with no real photo | AI image generation, art-directed + reviewed | The illustrated/stylized layer — where generation genuinely shines. |
| **diagram** | math + language concepts | code-drawn SVG (`pipeline/illustrate.mjs`) | Dot-groups, number bonds, word visuals — the correct illustration is a diagram, not a picture. |

Verified on real topics: *Birds Evolved from Dinosaurs* → **photo**, *Dinosaur
Sizes* → **photo**, *Animal Camouflage* → **photo**, planets → **nasa**,
*Inferring Characters' Feelings* → **generate**, *adding within 5* → **diagram**.

## Track 2 — AI generation (the `generate` strategy)

For the illustrated layer, the pipeline calls an image-generation model, then
treats the result like any other content — **gated, stored, licensed**.

- **Art direction for consistency.** A fixed house style (`ART_DIRECTION` in
  `image-brief.mjs`) is baked into every prompt so the whole binder looks like
  one book, not a random mixture. Style-lock / reference images / a fine-tune
  strengthen this further.
- **Model options** (pick by licensing / style / safety):
  - **Adobe Firefly** — trained on licensed + public-domain data
    ("commercially safe"); the safest choice if this ever goes commercial.
  - **Google Imagen / Gemini** — high quality.
  - **Black Forest FLUX** — open weights, self-hostable (full cost/control).
  - **Recraft / Ideogram** — illustration + style-lock + reliable in-image text.
- **Reviewed before use** — age-appropriateness, factual accuracy of anything
  depicted, and no artifacts (extra fingers, uncanny faces). `status:
  pending-review` until a human passes it.
- **Stored + licensed** — assets live in Supabase Storage with provenance
  (source, prompt, license, review status). Generated art is ours; photo assets
  carry their upstream license (CC0/CC-BY preferred; attribution recorded).

## Track 1 — Procedural (always available)

`pipeline/illustrate.mjs` still provides seed-varied SVG "study buddies" and the
math diagrams. Its job is to guarantee every page is engaging **on day one**,
offline, with nothing to review and zero cost — decorative warmth, headers,
progress stickers, and the concrete math visuals. Rich imagery (Tracks nasa /
photo / generate) layers in beside it without changing any caller.

## Cost, safety, licensing

- **Generate-once, shared library.** Like text, images are produced once per
  topic, reviewed, and reused across *all* families — so cost is bounded per
  topic, not per child.
- **Child-safety** filters on every generated image; human review is the backstop.
- **Licensing** is tracked per asset; commercial-incompatible sources are avoided
  by default (matters more if the product goes commercial).

## Free photo adapters (`pipeline/photo-sources.mjs`)

Real, working adapters for the `nasa` and `photo` strategies:

- **NASA Image Library** — `searchNasa()` hits the public images API; results are
  public domain, attributed `NASA/<center>`.
- **Wikimedia Commons** — `searchCommons()` queries the Commons API and keeps only
  permissive licenses, **ranked CC0/PD > CC-BY > CC-BY-SA**, skipping NC/ND
  (commercial-safe posture); records license + attribution (HTML stripped).

Each has a **pure parser** (`parseNasaResponse` / `parseCommonsResponse`) that is
unit-tested against representative payloads, so the extraction is verified even
where live network is unavailable.

## The generation bake-off (`pipeline/bakeoff.mjs`)

For `generate` topics, `runBakeoff()` fans the brief out to several vendors
(Firefly / Imagen / FLUX / Recraft / Ideogram), then **Claude looks at the
candidates** (`claudeJudge`, vision + structured-output ranking) and scores each
0–10 on age-appropriateness, factual accuracy, house-style match, artifacts, and
composition — picking a winner and flagging problems. Design rules:

- **Library-build time, not per request** (N× cost; images are generate-once and
  shared across all families, so it's bounded per topic).
- **Best used to select a primary vendor per style category** from a sample, then
  generate the library with the winner — keeps the house style consistent instead
  of a patchwork.
- **Pre-filter, not final word:** Claude's ranking cuts the reviewer's load; a
  human still passes the `reviewed` gate.
- Stores full provenance: candidate vendors, Claude's scores + reasons, winner.

## Honest status

- **Built & runnable offline (mock):** source router (`image-brief.mjs`), provider
  seam (`image-provider.mjs`), the bake-off + judge flow (`bakeoff.mjs`), Track-1
  procedural art, and the photo-source **parsers** (unit-tested).
- **Needs network + credentials to produce real assets:** the live NASA/Wikimedia
  fetches and the vendor image-gen + Claude-judge calls. The code is written to
  real API shapes; only the endpoints/keys are pending.
- *This dev environment's network policy blocks external hosts (NASA, Wikimedia,
  and image vendors all 403 at the proxy), so live images are produced when the
  code runs with network access — or after switching the environment's network
  policy to allow those hosts. The seams and parsers are done and tested.*
