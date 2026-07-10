# Image Pipeline — What's Needed to Run It Live

Everything is wired and runs offline in **mock** today. To produce real assets,
supply the items below and pass a `config` to `resolveTopicImage(topic, config)`
(`pipeline/image-resolve.mjs`). Both tracks (photo + generation) dispatch
automatically by topic; you only wire the pieces you want live.

## 1. Network access (the current blocker in this dev env)

Outbound HTTPS must be allowed to these hosts. This dev environment's network
policy blocks them (all 403 at the proxy), so live fetch happens elsewhere or
after switching the environment's network policy
(https://code.claude.com/docs/en/claude-code-on-the-web).

| For | Hosts |
|---|---|
| Claude (judge + text pipeline) | `api.anthropic.com` |
| NASA photos | `images-api.nasa.gov`, `images-assets.nasa.gov` |
| Wikimedia photos | `commons.wikimedia.org`, `upload.wikimedia.org` |
| Image generation | the chosen vendor's API host(s) |

## 2. Credentials / env vars

| Piece | Needs | Notes |
|---|---|---|
| **Claude** (bake-off judge + text generation) | `ANTHROPIC_API_KEY` (or `ant auth login`) | Model `claude-opus-4-8`. |
| **NASA** photos | *nothing* | `images-api.nasa.gov` needs no key. |
| **Wikimedia** photos | *nothing* (descriptive `User-Agent`, already set) | Be a good API citizen; cache results. |
| **Firefly** (generate) | Adobe API client id + secret | "Commercially safe" training data — best if going commercial. |
| **Imagen** (generate) | Google Cloud creds / API key | |
| **FLUX** (generate) | BFL API key, or self-host the open weights | Most control over cost. |
| **Recraft / Ideogram** (generate) | vendor API key | Illustration + style-lock. |

Only wire the generation vendor(s) you actually use — the bake-off runs over
whichever adapters you pass.

## 3. Node dependency

- `@anthropic-ai/sdk` — for the Claude judge and the text content provider.
  (Nothing else; photo fetch uses built-in `fetch`.)

```bash
npm i @anthropic-ai/sdk
```

## 4. How to turn it on

```js
import { resolveTopicImage } from './pipeline/image-resolve.mjs';
import { claudeJudge } from './pipeline/bakeoff.mjs';

const asset = await resolveTopicImage(topic, {
  live: { photo: true, generate: true },
  // generation vendors: each is { name, generate(prompt) -> { vendor, url } }
  vendors: [fireflyAdapter, imagenAdapter /* … */],
  judge: claudeJudge,          // Claude vision ranks the candidates
});
// asset.status === 'pending-review'  → goes to the human review gate
```

Wiring a generation vendor = implement one small adapter:
`{ name, async generate(prompt) { /* call vendor API */ return { vendor: name, url } } }`.

## 5. Operational notes

- **Generate-once, shared library.** Resolve each topic's image once, review it,
  store it (Supabase Storage) with provenance; reuse across all families. Cost is
  bounded per topic, not per child.
- **Run the bake-off at build time**, ideally to pick a primary vendor per style
  category from a sample — then generate the library with the winner for a
  consistent look.
- **Review gate is mandatory.** Claude's ranking is a pre-filter; a human confirms
  every non-diagram asset before it can ship (accuracy + child-safety).
- **Attribution / license** are recorded on every photo asset (NASA public
  domain; Wikimedia per-file license). Keep them with the stored image.

## Status recap

- **Done & tested (offline):** router, unified resolver, photo-source parsers,
  bake-off + judge flow, procedural + diagram fallbacks, review gating.
- **Add to go live:** network access + the keys above + a generation-vendor
  adapter or two. No code redesign — just credentials and endpoints.
