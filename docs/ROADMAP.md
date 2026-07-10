# Build Roadmap

Turns [`PHILOSOPHY.md`](PHILOSOPHY.md) into a sequenced engineering plan. This is
the map, not a commitment to build today. Each phase names its deliverables, the
philosophy it serves, and the decisions it settles.

## Sequencing rules

- **Thin vertical slice first.** Get one subject working end-to-end (learn →
  practice → test → schedule → track) before adding breadth. Proves the engine
  before we scale content.
- **Math is the flagship.** Encompassing, automaticity, and code-checked
  correctness are strongest in math, and it has zero fabrication risk — so the
  first slice is lowest-risk and most convincing.
- **Start simple, add sophistication later.** Micro-topic grain, plain spaced
  repetition, age+checklist placement in v1; knowledge points, FIRe, and adaptive
  diagnostics come later, driven by real need (the deferred decisions in
  `PHILOSOPHY.md`).
- **Paper before app.** The value is in the material + the schedule; prove those
  with printable output and simple tracking before investing in the iPad/phone UI.

## What already exists

- Taxonomy: `data/` (topics, dependencies, clusters, standards).
- Content layer: `content/schema/content.schema.json` + 2 sample topics.
- `scripts/generators.mjs` — code-checked math practice.
- `scripts/worksheet.mjs` — printable worksheet + parent guide + answer key.
- `scripts/homeschool-plan.mjs` — prerequisite-aware, age-based planner.
- `scripts/americanize.mjs` — British→American normalizer.
- Policy/philosophy docs, incl. `content-sourcing.md`.

## Phase 1 — Data model (foundations)

The objects the rest of the system needs.

- **Per-child state**: `{child → topic → {status, mastery, box, dueDate,
  history[]}}`. The record the scheduler reads/writes.
- **Content schema v2**: add lane tag (`skill` | `knowledge`), theme/costume
  support, policy domain tags, and knowledge-callback links between topics.
- **Placement input**: age prior + a short parent "can they already…?" checklist.
- *Settles:* granularity = micro-topic grain (start simple).
- *Serves:* structured autonomy, coverage tracking.

## Phase 2 — The scheduler (the brain)

The "inhuman bookkeeping" that makes this more than a worksheet printer.

- Mastery gate: promote only on representative, unassisted evidence (≥ threshold,
  on ≥2 spaced occasions).
- Plain spaced repetition (expanding intervals; reset on failure). **No
  encompassing yet.**
- Interleaving of Lane 1 skill types within a session.
- "Today's packet" assembler: due reviews + newly-ready topics, interest-biased
  ordering.
- *Settles:* implicit-repetition = plain spaced rep in v1.
- *Serves:* the physics of learning; the daily loop.

## Phase 3 — Thin vertical slice (Milestone: the loop works)

Wire Phases 1–2 to existing generators/worksheets for **math only, one child**,
parent tracking via a simple interface (CLI/JSON is fine at first).

- Daily: generate packet → print → child does it closed-book → parent grades with
  key → record → scheduler updates → tomorrow adapts.
- *This is the first genuinely usable thing.* Everything after is breadth + polish.

## Phase 4 — Content pipeline (grounded + safe, at scale)

Move beyond 2 hand-made topics to generate Lane 1 content across subjects — the
biggest lift, and where `content-sourcing.md` becomes real.

- Grounded (RAG) generation for skill lessons; cite-or-abstain.
- Independent fact-verification pass + human review queue (`reviewed` gate).
- Theme/costume layer (interest re-skins problems; core stays code-checked).
- Content policy engine + safety classifier on the interest box.
- *Serves:* accuracy, anti-fabrication, parent values control.

## Phase 5 — Output surfaces

- **Binder mode**: paginated, indexed, dated cumulative document — skills workbook
  + unit booklets, open-to-learn/closed-to-test.
- **Student screen**: calm, finite, active testing app that feeds the scheduler
  (no autoplay/feed/reward-juice); screen share scales with age.
- **Parent app (iPad/phone)**: choose material, print, record results, see
  progress, set content policy. Holds the scheduler bookkeeping.

## Phase 6 — Lane 2 thematic units

- Unit assembler: cross-subject content around one elastic primary theme.
- Coverage mapping (theme → required standards) + gap surfacing.
- Exploration lane (tracked) + knowledge callbacks.
- *Serves:* integrated learning, guaranteed coverage, structured autonomy.

## Phase 7 — Sophistication (the deferred upgrades)

Add only when the simple version proves it's worth it:

- **Knowledge points**: lazily sub-decompose topics where kids get stuck.
- **Encompassing / FIRe**: annotate the encompassing layer; add trickle-down
  review credit + review minimization.
- **Adaptive diagnostic**: replace age+checklist placement with frontier-finding.
- **Targeted remediation**: key-prerequisite links + auto-remedial reviews.

## Build decisions — resolved

See [`architecture.md`](architecture.md) for the full decision record.

- **Tech stack** — Supabase (Postgres + Auth + Storage) backend; shared
  TypeScript engine; React Native + Expo apps (iOS first, App Store path) with a
  native PencilKit module for pencil tracing; offline content pipeline. The
  engine (Phases 1–4) is still built stack-agnostic and can be validated on a CLI
  or throwaway web view before the mobile build.
- **Where per-child data lives** — cloud (Supabase), multi-tenant with row-level
  security; **not** on-device (survives lost devices, multi-device, multi-family).
- **Privacy/compliance** — COPPA/FERPA/GDPR-K now in scope because we store
  children's data for multiple families; build privacy-first (consent, data
  minimization, isolation, no ad tracking).

## Still open

- **Reviewer workflow at scale** — who reviews generated content beyond the
  parent as the shared content library grows.

## Suggested next concrete step

When ready to build: **Phase 1 + a sliver of Phase 2/3** — the per-child state
model plus a minimal spaced-repetition scheduler, demonstrated on math using the
generators and worksheet output we already have. That makes the daily loop real
without any app or new content pipeline.
