# The Math Academy Way — concept outline (our own words)

A structured, original-expression summary of the *ideas and methods* in *The
Math Academy Way* (Skycak; see [`references.md`](references.md)), written so this
project has durable access to the substance without hosting the copyrighted
text. Copyright protects a book's exact expression, not its facts, ideas, or
methods — this captures the latter, paraphrased. For the full argument, evidence,
and citations, read the book at the link in `references.md`.

Complements our applied analysis in
[`applying-learning-science.md`](applying-learning-science.md) and
[`math-academy-notes.md`](math-academy-notes.md).

## Part I — Preliminaries (the "why")

- **The Two-Sigma problem (Bloom).** One-on-one tutoring with mastery methods
  moves the average student ~2 standard deviations above classroom instruction.
  The book frames its whole system as an attempt to reproduce that tutoring
  effect at scale with software. Talent-development practice (how elite
  performers are actually trained) is contrasted with traditional schooling.
- **The science of learning is known but unused.** A cluster of replicable
  strategies exists; almost none are systematically taught in teacher training or
  used in classrooms. A recurring reason: the effective strategies require more
  effort and create *desirable difficulty*, which conflicts with the incentive to
  make class feel easy and pleasant — so the *illusion of comprehension* is
  preferred over real (harder) learning.
- **How the brain works (the constraint that drives everything).** Sensory →
  working → long-term memory. Working memory is tiny and is the bottleneck; most
  instructional design failures are working-memory overloads. Nearly every
  technique below is ultimately a way to respect that limit.
- **The knowledge graph (core technology).** The curriculum is a graph of
  thousands of topics wired by prerequisite edges; a "course" is just a colored
  region of the one big graph, which is the source of truth. This is the same
  kind of object as our `topics.json` + `dependencies.json`.
- **Accountability and incentives.** Maximal learning is not the natural result
  of maximizing enjoyment/comfort; effort must be spent, so someone has to be
  held accountable and incentivized. In school this is largely absent, producing
  a drift to mediocrity where grades can't be trusted. (For us: the homeschool
  parent is the accountable adult — the layer the field usually lacks.)

## Part II — Misconceptions it clears

- **Students differ in learning *speed*, not learning *style*.** Learning-style
  matching is unsupported; working-memory-capacity differences are real and
  matter. Different students need different *amounts* of practice.
- **Struggle usually isn't inability.** It's typically caused by missing
  foundations, ineffective practice, insufficient practice, or low motivation —
  all addressable.
- **Effective practice does not imitate the professional workplace.** Beginners
  are not experts; open-ended group problem-solving is how experts *work*, not how
  novices best *learn*. Novices need **direct instruction**.
- **Acceleration is fine once prerequisites are truly mastered** — depth need not
  be sacrificed for pace.

## Part III — The cognitive learning strategies (the engine)

- **Active learning.** After a minimum effective dose of explanation, spend the
  vast majority of time actively solving problems, not watching/re-reading.
- **Direct instruction.** Active ≠ unguided. Novices get worked examples and
  explicit guidance, not discovery learning.
- **Deliberate practice.** Individualized, effortful, slightly-beyond-current-
  ability practice aimed at specific weaknesses, with refinement — not
  comfortable repetition of what's already easy. It's effortful by nature, so
  people avoid it without external structure.
- **Mastery learning.** Demonstrate proficiency on prerequisites before
  advancing. Even loose approximations (Bloom's LFM, Keller's PSI) show ~0.5σ
  gains, yet adoption is rare because it breaks the lockstep classroom. Overlay a
  student's progress on the graph to compute the topics they're *ready* to learn
  (prereqs satisfied); if stuck on one, they can progress on unrelated ready
  topics meanwhile. The **knowledge frontier** — the boundary between known and
  unknown — is the student's Zone of Proximal Development, and lessons should sit
  right on it.
- **Minimizing cognitive load — the "knowledge point" idea (very relevant to
  us).** Each topic/lesson is split into several ordered **knowledge points** of
  increasing difficulty; each starts with a *worked example*, then problems like
  it, and the student must show mastery of one knowledge point before the next.
  The book claims ~10× finer scaffolding than typical materials. Extra load-
  reducers: **subgoal labeling** (grouping solution steps into named chunks),
  **dual coding** (pair words with visuals), and **fading** the scaffolding as
  proficiency grows (to dodge the expertise-reversal effect). Even higher-order
  problem solving is scaffolded via multi-part problems where each part exercises
  a previously mastered skill.
- **Automaticity.** Low-level skills must become fast and effortless so working
  memory is freed for higher-level thinking; fluency (speed *and* accuracy), not
  just correctness, is the bar for procedural skills.
- **Layering.** New advanced material is deliberately built so that practicing it
  reinforces the earlier material underneath it.
- **Non-interference.** Sequence/segregate similar-but-confusable topics so they
  don't blur together.
- **Spaced repetition + FIRe (the crown jewel).** Spacing reviews (vs cramming)
  consolidates memory and slows decay; each successful, well-timed review extends
  how long you'll remember and how long you can wait for the next one. In a
  hierarchical subject this is complicated because reviewing an advanced topic
  *implicitly* reviews the simpler topics it uses — so repetition credit should
  **trickle down** prerequisite/encompassing edges, *discounted* because an
  implicit review is often earlier than optimal. Math Academy's **Fractional
  Implicit Repetition (FIRe)** (1) distributes fractional trickle-down credit,
  (2) **minimizes total reviews** by picking reviews whose implicit repetitions
  "knock out" other due reviews like dominoes (serve the smallest set of tasks
  that covers all due review), and (3) calibrates intervals per student per topic.
  Key nuance: **encompassing is a distinct relation from prerequisite** — an
  encompassed skill is one the advanced task literally re-executes; many
  prerequisites are needed conceptually but not re-executed, so they aren't fully
  encompassed.
- **Interleaving (mixed practice).** Mix problem types within a session rather
  than blocking one type; the added difficulty of having to *choose* the method
  improves retention and transfer. Blocked practice feels fluent but is illusory.
- **The testing effect (retrieval practice).** Reviewing by *retrieving from
  memory unassisted* beats re-reading; effortful reconstruction is what
  strengthens and reconsolidates the memory. Combine with spacing → spaced
  retrieval practice.
- **Targeted remediation.** Each knowledge point links to the *key prerequisite*
  it most directly uses; failing the same knowledge point twice auto-triggers a
  remedial review of that key prerequisite, even if it's several steps back.
- **Gamification.** Points/XP and streaks quantify work and sustain motivation —
  supplements to, not substitutes for, deliberate practice.

## Part IV — Coaching (the human layer)

Even an optimal system needs a responsible adult to hold the student accountable
day-to-day: establish that effort produces progress, keep them on the rails, and
set up an incentive structure around something the student genuinely cares about.
Motivation is scaffolded, not assumed.

## Part V — Technical deep dives

Detailed treatment of the underlying algorithms — the diagnostic/placement that
estimates the knowledge frontier, the spaced-repetition/FIRe model (encompassing
weights, partial encompassings, review minimization, per-student calibration),
and how the pieces compose. (Consult the book directly for the math.)

## What this means for us (pointers, not repetition)

The parts that most change our data model — **knowledge points** with per-point
mastery, a **distinct encompassing layer** for FIRe, **key-prerequisite** tags
for remediation, and **frontier diagnostics** for placement — are detailed with
our design response in [`math-academy-notes.md`](math-academy-notes.md).
