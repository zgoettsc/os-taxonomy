# The Math Academy Way — synthesis & what it adds to our plan

Our own notes on the methodology described in *The Math Academy Way* (Skycak),
in our words, focused on what it adds **beyond** the general principles already
captured in [`learning-science.md`](learning-science.md). Terms like *FIRe* and
*encompassing* are Skycak/Math Academy's; see [`references.md`](references.md)
and verify exact definitions against the source.

## The through-line

Same thesis we reached independently: a **knowledge graph of atomic topics**
("knowledge points") wired by prerequisites is the substrate, and mastery
learning + spaced retrieval + automaticity are the engine. Our
`topics.json` + `dependencies.json` is structurally the same kind of object.
The book's value to us is the *operational detail* on turning that graph into a
scheduler — the exact thing we said we were missing.

## The four ideas that change our plan

### 1. FIRe — Fractional Implicit Repetition (the big one)

The insight: in a hierarchical subject, practicing an advanced topic **is** a
partial review of its prerequisites. Solving `4 × 12` implicitly rehearses
`4 × 2` and `40 + 8`. So repetition credit should **trickle down** the graph, not
be tracked per-topic in isolation.

Consequences we can implement directly on our edges:
- **Encompassing / encompassing weights.** An advanced topic *encompasses* its
  prerequisites to some fractional degree. A successful advanced review pays
  *fractional* repetition credit down each prerequisite edge. Our `strength`
  field (`hard`/`soft`) is a natural first proxy for that weight (hard edge →
  larger implicit credit; soft → smaller).
- **Review minimization ("dominoes").** Because advanced reviews knock out
  prerequisite reviews, the scheduler should prefer reviews that discharge the
  most due prerequisites at once — fewer total problems for the same coverage.
  This is a genuine efficiency win a flat list cannot get.
- **Per-student, per-topic calibration.** Interval growth is tuned to the
  individual and the specific topic, not a global constant.

This is the piece that makes our graph *worth* having. It upgrades our earlier
"nudge prerequisite due-dates on downstream success" hand-wave into a principled
credit-propagation rule.

### 2. Diagnostic placement — find the frontier, don't guess by age

Rather than seeding a learner by age (what our planner does today), run a
**diagnostic** that locates their *frontier* on the graph: the boundary between
what they've mastered and what they haven't. Test a spanning subset; a pass
implies its prerequisites are (probably) known — so you can binary-search the
frontier with surprisingly few questions, again exploiting encompassing.
Outcome: no time wasted re-teaching known material, no gaps from starting too
high. **Action for us:** add a placement mode; demote `--age` to a fallback.

### 3. Automaticity is non-negotiable, and measured

The book treats fluency (speed *and* accuracy), not just correctness, as the bar
for procedural skills — because non-automatic sub-skills consume working memory
and stall higher-level learning. Our taxonomy already tags `type: PROCEDURAL`;
those topics should carry a **timing/fluency target**, and "mastered" for them
means fast *and* right, not just right.

### 4. Measurement & motivation (XP)

Math Academy quantifies work as points/XP — both to motivate and to make "did
enough happen today" objective. This dovetails with the essay's reason #4
(accountability): give the parent a concrete daily target and a visible streak,
and pair it with the incentive-structure template.

## How this refines our scheduler design

Updating the model in [`applying-learning-science.md`](applying-learning-science.md):

- Repetition credit is **propagated down hard/soft edges** (FIRe-style), not
  tracked per topic in isolation.
- The daily packet is chosen to **maximize implicit coverage** (fewest problems
  that discharge the most due reviews), then interleaved across subjects.
- Placement is by **diagnostic frontier-finding**, with age as a fallback prior.
- Procedural topics get **fluency targets**; mastery = automatic, not just
  accurate.
- Everything is wrapped in a **daily XP-style target** for the parent's
  accountability loop.

## The honest tension, sharpened

Math Academy is a *fully adaptive, per-problem, on-screen* system. Its power
comes partly from reacting after every single answer — exactly what pure paper
cannot do. Two roads for us:

1. **Paper-faithful:** approximate FIRe at the *packet* granularity — the parent
   grades a sheet, we recompute the schedule for tomorrow. We keep encompassing
   and review-minimization; we lose per-problem adaptivity. Kid screen time: zero.
2. **Hybrid:** kid still works on paper, but a *parent-only* app runs the real
   FIRe bookkeeping (the "inhuman" part) and prints each day's optimized packet.

Neither requires the child on a screen. Both are honest about the tradeoff: we
trade Math Academy's per-problem loop for a per-day loop in exchange for the
things you actually want — paper, low screen time, and a parent in the loop.
