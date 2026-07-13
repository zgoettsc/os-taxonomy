# Applying the Physics of Learning to This Project

How the principles in [`learning-science.md`](learning-science.md) map onto the
Marble taxonomy and the paper-first, parent-led homeschool tool we're building.

## The thesis

The essay's own framing: *the knowledge graph is the main ingredient; the rest
is the recipe.* We already have the ingredient — `topics.json` (1,590
micro-topics) + `dependencies.json` (3,221 prerequisite edges), plus per-topic
`evidence`, `assessmentPrompt`, `type`, and `centrality`. What we're missing is
the recipe: the **scheduler and mastery model** that decide, per child, per day,
*what to practice next and when to review it.*

That scheduler is the single highest-value thing we can build. It is precisely
the "inhuman amount of bookkeeping and computation" the essay says no human
teacher (or homeschool parent) can do by hand: track mastery of every topic,
maintain a spaced-repetition schedule, interleave across skills, and — because
our data is a graph — propagate implicit review credit back along prerequisite
edges. Flat-list systems structurally cannot do that last part. We can.

## Our unfair advantages (given the homeschool, paper-first choice)

1. **Accountability is solved by construction.** The essay's reason #4 — the
   biggest real-world failure mode — is that most students need a responsible
   adult sitting beside them. In homeschool, that adult is already there. Our
   "parent guide / parent app" is not a nice-to-have; it is the accountability
   layer the whole field struggles to supply. We should lean into it hard:
   give the parent the daily assignment, the "what to do when stuck" script, and
   an incentive-structure template.

2. **The graph enables true prerequisite gating and implicit review.** We can
   refuse to unlock a topic until its hard prerequisites are *demonstrably*
   mastered (not "a video was watched"), and we can adjust a prerequisite's
   review schedule when the child succeeds on something downstream.

3. **`type` and `centrality` are already in the data.** `type: PROCEDURAL`
   flags topics where **automaticity** (speed + accuracy) matters, so those get
   timed fluency drills. `centrality` tells us which topics unlock the most, so
   the scheduler can prioritize them.

## Principle-by-principle mapping

| Principle | What we already have | What to build |
|---|---|---|
| **Active learning** (min explanation → problems) | Worksheets are mostly problems; lesson `intro` is the minimum dose | Keep lessons short by policy; enforce a ratio of problem-time to explanation-time |
| **Prerequisite gating** | `dependencies.json` hard/soft edges; planner computes "ready" set | Gate on *measured mastery*, not "did a worksheet" |
| **Mastery measurement** | `evidence[]` + representative, code-checked assessment items | A mastery rule: ≥ threshold correct, unassisted, on ≥2 spaced occasions |
| **Testing effect / retrieval** | Worksheets are closed-book; answer key is parent-only | Label sheets "no peeking"; self-check discipline in the parent guide |
| **Spacing effect + spaced repetition** | — (nothing yet) | **The scheduler**: per (child, topic) interval that expands on success, resets on failure |
| **Interleaving / mixed practice** | Many topics in the graph | Daily packet = new topic + all *due* reviews, drawn across subjects, shuffled |
| **Automaticity** | Math generators; `type: PROCEDURAL` tag | Timed fluency mode with a speed target for procedural topics |
| **Deliberate practice** | `evidence[]` granularity | Track *which* evidence criterion / error type is missed; over-weight it next time |
| **Expertise reversal** (beginners need direct instruction) | Worked `examples`, parent `howToTeach` | Fade scaffolding as mastery grows: heavy worked examples → bare problems |
| **Desirable difficulties / anti-illusion** | Closed-book, cumulative worksheets | Make the *defaults* the harder-but-better settings; explain why in the guide |
| **Accountability** | Parent guide | Parent daily view: today's packet, streak, stuck-script, incentive template |

## The scheduler: a concrete first model

A deliberately simple, paper-compatible model (Leitner-style, SM-2-lite):

- **State per (child, topic):** `{ status, box, lastDate, dueDate, history[] }`
  where `status ∈ {locked, learning, mastered}` and `box` is the review level.
- **Unlock:** a topic becomes `learning` only when every *hard* prerequisite is
  `mastered`. Soft prerequisites enrich but don't block.
- **Mastery gate:** promote `learning → mastered` after the child scores ≥ ~85%
  unassisted on a representative set, on **two different days** (spacing baked
  into the definition of "mastered").
- **Spaced reviews:** once mastered, schedule reviews at expanding intervals
  (e.g. 1 → 3 → 7 → 16 → 35 days). A successful review advances the box; a
  failure drops it back and re-enters `learning`.
- **Implicit prerequisite credit:** on a successful *downstream* review, nudge
  the due dates of its hard prerequisites outward (they were implicitly
  retrieved). On failure, flag prerequisites as re-test candidates.
- **Interleaving:** each day, assemble the packet from *all* topics due today
  across subjects, plus at most one or two new `learning` topics (capacity-
  limited), then shuffle so it isn't blocked.
- **Deliberate targeting:** when generating a topic's items, bias toward the
  evidence criteria the child has missed, and toward boundary/hard cases — never
  cherry-pick the easy cases (the essay's explicit warning against watered-down
  bite-sizing).

The parent's loop stays tiny: **print today's packet → child does it closed-book
→ parent grades with the key → record pass/fail per topic → scheduler updates.**
Recording can itself be paper (a tracking sheet) or a small *parent-only* screen,
keeping the child's screen time at zero.

## Honest tensions we must design around

- **Immediate feedback vs paper.** The essay prizes immediate, per-problem
  feedback; pure paper gives per-*worksheet* feedback when the parent grades.
  That's a real weakening. Mitigations: parent grades right after; short sheets
  so feedback is soon; optional self-check cards. We adapt *per session*, not per
  problem — a conscious tradeoff of going paper-first.
- **Mastery grading depends on the parent.** Clear thresholds, representative
  items, and answer keys reduce judgment load, but constructed/writing items
  still need the parent (or an LLM judge) against a rubric.
- **Don't water it down.** Bite-sizing into micro-topics is only legitimate if
  each topic's practice spans the full range of cases the standard implies. Our
  generators and item banks must include boundary and hard cases by design.
- **Desirable difficulty vs a discouraged child.** Harder-but-better can tip into
  demoralizing. The parent guide has to coach *productive* struggle and when to
  step in — strengthen the weakness, don't just hand out hints.

## Where we are vs. where this points

Already partway there: the **planner** does prerequisite-aware sequencing, the
**generators** give code-checked practice and can do automaticity/deliberate
targeting, the **content layer** supplies direct instruction + worked examples,
and the **worksheets** are closed-book retrieval with parent-only keys.

The missing brain is the **per-child mastery tracker + spaced-repetition /
interleaving scheduler**. Build that, and the pieces we already have become a
system that operationalizes the whole recipe — not just a prettier worksheet.
