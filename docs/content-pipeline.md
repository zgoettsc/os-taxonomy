# The Content Pipeline

How the two hand-made sample topics become **full coverage** — a reviewed
content file for every topic in the taxonomy — without hand-authoring each one.
This is the concrete implementation of [`content-sourcing.md`](content-sourcing.md).

## The five stages

Run `node pipeline/generate.mjs --topic <id>` (or `--age/--subject`) and a topic
goes through:

1. **Ground** — gather authoritative source text (the standards the topic was
   distilled from, plus OER via RAG in production). Nothing is generated from
   thin air; the model only ever sees real source material.
2. **Generate** — the provider adapts the grounding into the content schema. The
   model *rephrases and scaffolds*; it may **not** introduce a fact absent from
   the grounding.
3. **Fill-in** — attach the parts that must not come from a model: **code-checked
   math** (answers computed by `scripts/generators.mjs`) and a **procedural
   illustration** (`pipeline/illustrate.mjs`).
4. **Verify** — `pipeline/verify.mjs` checks structure, that every assessment item
   maps to a mastery criterion, and cite-or-abstain (there must be citations
   tracing to grounding). Anything unsupported becomes a **flag**, not shipped.
   In production this stage is a second, independent model that tries to *refute*
   each factual claim against its source.
5. **Gate** — stamp provenance, set `reviewed: false`, write to `pipeline/out/`.
   Nothing reaches a child until a human flips `reviewed` to true.

## The provider seam

The generator never calls a model directly — it goes through `pipeline/provider.mjs`:

- **`mock`** (default) — deterministic, offline, no API key. Makes the whole
  pipeline runnable and testable in CI.
- **`claude`** — the real call: `@anthropic-ai/sdk`, model `claude-opus-4-8`,
  adaptive thinking, **structured outputs** (`output_config.format`) so the model
  returns schema-valid JSON, and a system prompt that forbids ungrounded facts.

Swapping providers changes nothing else in the pipeline — the seam is what keeps
generation reviewable and the pipeline itself testable offline.

## Why this answers the "coverage" edge

The two curated samples in `content/` were hand-made. This pipeline runs over
*any* topic id, so coverage is a matter of running it across the taxonomy (with
the review queue keeping pace) — not authoring 1,590 files by hand. Math topics
get correct-by-construction practice for free; knowledge topics get grounded,
cited, human-reviewed facts.

## What's real vs stubbed here

- **Real & runnable:** the five-stage orchestration, the provider seam, the mock
  provider, code-checked math fill-in, procedural illustration, the verify checks,
  the review gate, provenance stamping, American-English normalization.
- **Stubbed for production:** RAG retrieval over a real OER corpus (grounding is
  currently the standards + taxonomy description), the second-model refutation
  pass (verify is deterministic checks today), and the human review UI.

## Try it

```bash
node pipeline/generate.mjs --age 6 --subject Science   # picks a topic, writes pipeline/out/<id>.json
node pipeline/generate.mjs --topic mt_ghF3Vv6taM       # math: practice is code-generated
```
