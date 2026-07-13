# [working title] — One-Page Brief

> # Empowering parents, not screens.

A homeschool learning system that uses AI to turn a present, loving parent into
an expert tutor — keeping the child mostly on paper and always on the rails of
real learning science.

---

## The problem

Two bad options dominate early education. **Screens** (Khan, IXL, gamified apps)
maximize screen time because engagement is their business model — and they turn
kids into zombies while quietly cutting the corners of real learning. **Paper
curricula** (Singapore, Core Knowledge) are high-quality but static: no
adaptivity, no spaced-repetition automation, and the parent is left to schedule,
track, and diagnose everything by hand — an inhuman amount of work.

Meanwhile, cognitive science has known for *decades* how children learn best
(mastery, spaced repetition, retrieval practice, deliberate practice) — and
almost no product actually implements it honestly.

## The insight

The best education ever measured is one-on-one tutoring with mastery methods
(Bloom's "two-sigma"). It's just been too expensive to give every child. **AI
changes the economics** — not by replacing the tutor with a chatbot, but by
handing the *parent* the tutor's playbook and absorbing the impossible
bookkeeping. The parent brings the warmth, presence, and accountability; the AI
brings the intelligence, personalization, and rigor.

## What it is

- **Paper to learn, screen to apply.** Concepts and practice are on paper (calm,
  book-like); the screen is a *tool* for active testing and tracking — finite,
  effortful, never passive. Screen share grows with age.
- **A textbook built day by day.** Printed pages accumulate in a binder — the
  child's own, cumulative, personalized textbook.
- **Two lanes.** A rigorous, prerequisite-sequenced **skill spine** (math,
  reading, grammar) that a child's interests only *costume* — plus
  interest-driven **thematic knowledge units** (a "cats" unit weaving science,
  history, and reading) where following curiosity is the point.
- **The parent as coach.** The app assigns, guides, and tracks; the parent
  provides the accountability every child needs. Structured autonomy: the engine
  owns the skeleton, the child owns the flavor.

## A day in the life

The parent opens the app → gets a 2-minute **coach brief** ("today Ada works on X;
she's been confusing Y; here's the fix") → prints today's worksheet → Ada does it
on paper, closed-book → the parent grades it (or photographs it and AI diagnoses
*why* she erred) → the schedule updates → tomorrow adapts. A short, calm screen
session handles the timed retrieval that proves mastery.

## Why it's different

No one occupies our intersection: **the rigor of Math Academy + the
interest-driven soul of unschooling + a paper-first, low-screen, parent-coached
delivery + AI content with integrity controls.** Everyone else maximizes screens;
we minimize them. Everyone else replaces the parent or abandons them; we
*empower* them.

## Grounded in real science

Non-negotiable, honestly implemented: active learning, direct instruction for
beginners, mastery gating on *objective* evidence, spaced repetition,
interleaving, automaticity, and deliberate practice — with a deliberate stand
against the "illusion of comprehension" that makes easy practice feel productive.

## Built with integrity

Math answers are computed by code (never fabricated). Facts are grounded in
authoritative sources, cited, independently verified, and human-reviewed before
they ever reach a child. Parents set a content policy (what may and may not be
taught) with domain-level, stance-aware controls. Nothing ships unreviewed.

## Powered by AI — the signature moves

- **The Coach Brief** — personalized tutoring guidance that upskills the parent.
- **Misconception diagnosis** — photograph a worksheet; AI infers *why* the child
  erred and targets the fix.
- **Truly generated content** — the exact problem this child needs now, at their
  level, in their interest.

## Tech at a glance

A shared TypeScript **engine** (the scheduler, generators, and policy) on a
**Supabase** cloud backend (accounts, parent↔child linking, multi-family
isolation), delivered through **React Native** apps (iOS first, Apple Pencil for
letter tracing), fed by an offline, reviewed content pipeline. Privacy-first with
children's data.

## Where it stands

The full design is specified and a working proof-of-concept exists (a
prerequisite-aware planner, code-checked math generators, printable
worksheet+parent-guide output, and an interactive demo). Next: the per-child
scheduler and the thin vertical slice that makes the daily loop real.

## Read more

Philosophy · Learning science · Content sourcing & safety · Architecture ·
Roadmap · Differentiation — all in [`docs/`](.).
