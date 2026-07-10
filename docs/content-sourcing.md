# Content Sourcing, Accuracy & Safety Policy

Where the material we teach comes from, how we keep it accurate, how we stop an
AI from fabricating facts, and how a parent controls what may and may not be
taught. This is a core trust commitment — every content file carries provenance
(see `content/schema/content.schema.json`) so any page can answer "where did this
come from and who checked it."

## Principle 0: content is not one thing

The scary version of "AI-generated curriculum" assumes one pipeline inventing
everything. We don't do that. Different content types have different sources and
different accuracy guarantees:

| Content type | Where it comes from | Fabrication risk | Guarantee |
|---|---|---|---|
| **What to teach & in what order** (the skill spine) | The Marble taxonomy, distilled from published **standards** (Common Core, NGSS, UK NC) | none | anchored to real standards, not AI whim |
| **Math / procedural practice + answers** (Lane 1) | **Code generators** — answers computed, not written | **none** | correct by construction |
| **Skill lesson prose** (how to add, what a noun is) | AI **adapts** stable, textbook-level facts, grounded + reviewed | low (facts are simple & stable) | grounded + human-reviewed |
| **Knowledge facts** (cats, history, science — Lane 2) | **Grounded** in authoritative sources, cite-or-abstain, verified | this is the real risk zone | RAG + verify + review gate |
| **Reading passages / stories** | Public-domain/OER libraries, or AI-written fiction | low (fiction isn't "wrong") | age + appropriateness review |

The upshot: the majority of actual practice volume (math drills) has **zero**
fabrication risk, and the highest-risk material (Lane 2 facts) gets the strongest
controls.

## The sourcing hierarchy (preference order)

We prefer sources in this order, and only fall back down the list when necessary:

- **Tier 0 — Deterministic generation.** Math/procedural items produced by code
  (`scripts/generators.mjs`). No model touches the answer key.
- **Tier 1 — Authoritative primary sources (the ground truth).** Curriculum
  standards already in this repo (`data/curriculum-standards.json`), plus
  public-domain / institutional / OER material for facts: e.g. NASA, NOAA, USGS,
  Smithsonian, Library of Congress for science/history; CK-12, OpenStax,
  Illustrative Mathematics, Core Knowledge for lessons. These are what we *ground*
  generation in. (License tracked per source — see below.)
- **Tier 2 — AI as adapter, never as the encyclopedia.** The model's job is to
  *transform* Tier-0/1 material into age-appropriate, taxonomy-aligned, optionally
  themed lessons and questions. **Hard rule: it may rephrase, scaffold, simplify,
  and theme — it may not introduce facts absent from the grounding.**
- **Tier 3 — Human review gate.** Nothing reaches a child while
  `reviewed: false`. And because this is a homeschool tool, the **parent is a
  second human reviewer at the point of use** — they see material before printing
  or assigning it.

## How we stop fabrication (concretely)

Not one safeguard — a stack, because any single one can fail:

1. **Grounded generation, not open recall.** The generator is handed source
   passages and writes *from them*. This is the biggest lever: the model is
   summarizing provided text, not recalling from training. Ungrounded factual
   generation is disallowed.
2. **Cite-or-abstain.** Every factual claim must trace to a grounding source; a
   claim that can't be cited is dropped or flagged, never asserted. Citations are
   stored per item in `provenance.grounding[]` with a `verified` flag.
3. **Separate the generatable from the checkable.** Math → code-checked. Facts →
   an **independent verification pass** (a second model / retrieval check) asks of
   each claim: "is this supported by the cited source? is it a known
   misconception?" Disagreement routes to a human, it doesn't ship.
4. **Confidence gating.** Low-confidence or unciteable output goes to the review
   queue, not to auto-approve.
5. **Provenance on every item** (`generatedBy`, `grounding`, `verification`,
   `reviewed`, `reviewer`) so the trail is auditable after the fact.
6. **Stable-knowledge advantage.** For ages 4–11, most facts don't change (water
   cycle, mammals, addition), so "out of date" is rarely the issue; the few
   drift-prone areas get flagged for extra scrutiny.

Residual risk is **reduced, not zero** — which is exactly why the human review
gate and the parent-at-point-of-use are non-negotiable backstops, not optional.

## Content policy: what may and may not be taught

For a homeschool tool, **the parent owns the values layer.** We ship a
configurable content policy the parent sets; it constrains both *which topics can
appear* and *how they're framed*.

- **Domain-level, not brittle keyword matching.** Because taxonomy topics are
  tagged by subject/domain, policy is set at the domain level and enforced there,
  which is far more reliable than banning words.
- **Three stances per sensitive domain**, because blunt on/off is wrong for
  topics that overlap legitimate curriculum (history involves religion and
  politics; biology involves bodies):
  - **block** — never appears.
  - **factual/neutral only** — may appear as neutral fact, never advocacy (e.g.
    "the Pilgrims sought religious freedom" is history, not religious instruction).
  - **ask me first** — routed to the parent for approval before use.
- **Default-conservative for young children.** The starting policy for a young
  child excludes mature/controversial domains (sexuality, graphic violence,
  partisan politics, etc.) entirely; the parent can adjust. An age-appropriateness
  filter is always on.
- **Two enforcement points:**
  1. **Topic/interest gating.** Sensitive taxonomy areas and interest-box
     requests are blocked or sent to the parent. The free-text interest box
     (where a child types "cats") is a special risk surface and **always** passes
     through a safety classifier first.
  2. **Generation constraints + output screening.** The generator is instructed
     to avoid flagged domains, and a safety classifier screens both child input
     and generated output *before* anything is shown or printed.
- **Transparency.** The parent can see what was filtered and why, and reviews
  material before it reaches the child.

Example shape of a parent policy (illustrative):

```json
{
  "ageDefault": 6,
  "domains": {
    "religion": "factual-neutral",
    "politics": "block",
    "sexuality": "block",
    "gender": "ask-me-first",
    "violence": "block",
    "death-and-loss": "ask-me-first"
  },
  "interestBox": { "childFreeText": "classifier + parent-approval" }
}
```

## Licensing & how we modify sources

"How we modify it" matters legally and ethically:

- We **adapt and transform** grounded sources (rephrase, scaffold, simplify,
  theme) — we do not copy their expression. **Facts aren't copyrightable; wording
  is**, so we extract the former and author the latter.
- **License tracked per source** in `provenance.grounding[]`. This project is
  non-commercial, so license-incompatible material is still avoided by default and
  flagged; our own content stays CC-BY-SA-aligned with the taxonomy.
- Standards themselves (what we align to) are public frameworks; we cite them.

## What already exists toward this

- `scripts/generators.mjs` — Tier-0 code-checked math (zero-fabrication answers).
- `content/schema/content.schema.json` — `provenance` block with `grounding[]`
  (+ per-source `verified`), `verification[]`, and a `reviewed` gate.
- `scripts/americanize.mjs` — an allowlist normalizer (an example of the
  "transform, don't fabricate" discipline: deterministic, auditable text changes).

## Still to build

- The RAG grounding + cite-or-abstain generator.
- The independent fact-verification pass and review queue.
- The parent content-policy config + safety classifier on the interest box.
- The point-of-use parent review UI.
