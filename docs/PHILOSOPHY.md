# Project Philosophy

The north-star design principles for the homeschool tool we're building on top of
the Marble taxonomy. This captures decisions we've **committed to**; genuinely
open questions are listed at the end. Grounded in
[`learning-science.md`](learning-science.md),
[`math-academy-outline.md`](math-academy-outline.md), and our analyses in
[`applying-learning-science.md`](applying-learning-science.md) and
[`math-academy-notes.md`](math-academy-notes.md).

## 0. What we're building

A parent-guided, paper-first homeschool system for a young child (roughly ages
4–11). It has two faces: a **parent side** that guides, assigns, and tracks, and
a **student side** that teaches and tests. Underneath is the knowledge graph (the
taxonomy) plus a content layer and, eventually, a scheduler. American English
throughout.

The taxonomy is the **skeleton** (what to teach, in what order, how mastery is
judged). Everything we add is the **flesh** (lessons, practice, assessment,
scheduling). The graph is the source of truth.

## 1. Medium: paper to learn, screen to apply

- **Paper = LEARN.** Concept introduction, direct instruction, worked examples,
  and first practice happen on paper. This is calm, book-like intake — the mode
  the child already loves, and the mode concept-absorption doesn't need instant
  feedback for.
- **Screen = APPLY & TRACK.** Active retrieval practice, automaticity/fluency
  timing, mastery exams, and the adaptive engine live on screen — where instant
  per-answer feedback and adaptivity genuinely help. Putting testing on screen is
  what recovers the immediate-feedback that pure paper lacks.
- **The screen is a TOOL, never CONTENT.** The zombie state comes from *passive,
  infinite, variable-reward* screens (TV, feeds), not from screens as such.
  Active, finite, effortful problem-solving is the cognitive opposite. So: no
  autoplay, no infinite feed, no slot-machine reward juice, muted palette, a
  clear "you're done" wall. Personalization stays quiet.
- **Screen time graduates with age.** Roughly: ages 4–6 mostly paper + a short
  (~5-minute) screen check; 7–9 balanced; 10+ screen-tool-forward. Rationale:
  developmental appropriateness *and* the reality that digital fluency is itself a
  skill the child's future requires.

## 2. The binder: a textbook built day by day

Printed materials accumulate into a child-authored textbook in a binder — a
visible, growing progress artifact (motivation + accountability made physical).

- Paginate and index it: running page numbers, a growing table of contents,
  dated entries, dividers.
- **Two sections:** a **Skills workbook** (Lane 1 below) and a series of **Unit
  booklets** (Lane 2 below).
- **Open to learn, closed to test.** The binder is reference during learning;
  exams are closed-binder and unassisted (else re-reading undercuts the testing
  effect).

## 3. Two lanes

Subjects split by *type*, because they behave differently under interest-driven
integration.

- **Lane 1 — the Skill Spine.** Hierarchical skills (math, phonics, grammar,
  spelling). Rigorously **graph-sequenced** and **spaced-repetition-scheduled**
  by the engine. The child's interest may **costume** these (cat-themed problems)
  but never reorders them; the underlying sequence and correctness are invariant
  (e.g. a code-checked sum is the same whether it's cats or apples). This is the
  non-negotiable skeleton.
- **Lane 2 — Thematic Knowledge Units.** Knowledge/content subjects (science
  content, history, geography, vocabulary, reading comprehension, art). Organized
  into **interest-driven, cross-subject units** (a "cats" unit weaving animal
  science, classification, history/culture, stories, and vocabulary). For content
  learning, coherent thematic integration isn't a compromise — it's *better*,
  because background knowledge is a web, not a ladder.

The lanes run **in parallel, not merged.** The theme changes Lane 2 and
re-costumes Lane 1; underneath, Lane 1's spaced reviews keep coming on schedule
regardless of the current theme.

## 4. Structured autonomy (agency within constraints)

Full child-led choice breaks mastery, spacing, and coverage. Full engine control
kills motivation. So:

- **The engine owns the SKELETON** (non-negotiable): which reviews are due, which
  topics are unlocked, and the requirement that due work actually happens.
- **The child owns FLAVOR & PACE:** the theme/skin, the order among today's
  *ready* items, and a free **exploration lane** for spontaneous curiosity.
- **Interest biases, never overrides.** Among topics the child is *ready* for,
  prefer the interest-adjacent ones — but never teach multiplication before
  addition just because the child likes the theme.

## 5. Coverage is guaranteed, even when interest drives

- Interest picks the **vehicle** (the theme); the system maps the theme onto
  required standards and **tracks what each unit did and didn't cover**, so gaps
  surface and inform the next unit.
- **Units are bounded.** Each has a defined scope and a coverage checklist, to
  prevent infinite tangent-chasing ("cats → Asian history → …forever").
- The exploration lane is **dessert, not an escape hatch** — it can't become
  where the child hides from due work.

## 6. The physics of learning (non-negotiable pedagogy)

These are commitments, not preferences:

- **Active learning** after a minimum effective dose of explanation.
- **Direct instruction for beginners** (expertise-reversal effect) — worked
  examples and explicit guidance, not discovery learning.
- **Mastery gating on objective, representative, unassisted evidence** — "watched
  it" or "felt easy" is never mastery. We design *against* the illusion of
  comprehension.
- **Spaced repetition** with implicit-repetition credit propagated along the
  graph (encompassing/FIRe-style).
- **Interleaving** of skill types within Lane 1 practice (distinct from Lane 2's
  theme scheduling — don't conflate them).
- **Automaticity/fluency** (speed *and* accuracy) for procedural skills.
- **Deliberate practice** targeting the specific things the child misses, not the
  comfort zone.
- **Desirable difficulty**: default to the harder-but-better settings, and coach
  productive struggle rather than handing out hints.
- **Never water down.** Bite-sizing into micro-topics must still span the full
  range of cases (including boundary/hard ones), not cherry-pick the easy ones.

## 7. Accountability is a feature, not an afterthought

The single biggest real-world failure mode is the absence of a responsible adult.
In homeschool that adult is present by construction. We lean in: give the parent
a daily target, a visible streak, a "what to do when the child is stuck" script,
and an incentive-structure template centered on what the child actually cares
about.

## 8. Content integrity

- Math practice/answers are **computed by code** (correct by construction), never
  by a model.
- Factual content (Lane 2 especially) is **grounded and cite-or-verified**;
  nothing ships to the child while `reviewed: false`.
- Every content file carries **provenance** and a review gate.
- Built on the **openly-licensed** taxonomy; our content layer stays CC-BY-SA in
  spirit; we cite sources and don't ingest license-incompatible material.

## Open questions (not yet decided)

- **Theme concurrency:** one deep theme at a time vs. a couple running
  concurrently. *(under discussion)*
- **Parent tracking medium:** pure-paper tracking vs. a parent-only light app for
  the scheduler bookkeeping.
- **Exploration lane:** lightly tracked (still "counts") vs. pure untracked
  curiosity time.
- **Granularity:** whether to sub-decompose micro-topics into finer "knowledge
  points" (Math Academy-style) for Lane 1.
- **Encompassing layer & diagnostic placement:** whether/when to build the
  distinct encompassing annotations and a frontier-finding diagnostic.
