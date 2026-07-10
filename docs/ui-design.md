# UI Design — Parent & Student Apps

Design can start **now**, in parallel with the backend — it de-risks the data
model and flows. This spec is the screen map + flows; high-fidelity mockups
follow from it. Grounded in [`PHILOSOPHY.md`](PHILOSOPHY.md) and
[`architecture.md`](architecture.md) (React Native, iPad/phone; parent is the
hub, student surface is mostly paper + a calm screen for testing).

## Design principles (from the philosophy)

- **Parent app = the hub.** It leads with the *daily action*: the coach brief,
  today's plan, and "print the packet." Fast, calm, information-clear —
  accountability-forward (today, streak, what's due).
- **Student screen = a tool, never content.** Active, finite, calm palette; NO
  autoplay, feed, or variable-reward juice; a clear "you're done" wall. The
  screen share **graduates with age** (a 5-year-old sees almost none).
- **Print is first-class.** Every plan resolves to a clean printable; "generate
  more practice" is always one tap and never capped.
- **Both themes, accessible**, large touch targets, legible type.

## Parent app — screen inventory

1. **Onboarding** — create household → add child (first name, birth year, avatar,
   optional PIN) → set content policy defaults → quick placement checklist.
2. **Home / Today** *(the landing screen)* — the **Coach Brief** (≈2-min
   personalized briefing: what to teach, the child's current misconception, the
   fix, what to say when stuck), today's plan per child, **Print today's packet**,
   and an optional "start screen test."
3. **Plan / Curriculum** — the graph view: mastered / in-progress / ready-next per
   subject; trace prerequisites; see what a topic unlocks; per-subject pacing.
4. **Print & Binder** — generate worksheets, lesson "book pages," and unit
   booklets; the binder history (the day-by-day textbook); **Generate more
   practice** (unlimited, fresh).
5. **Record / Assess** — enter results from a graded sheet (later: photo →
   auto-diagnose the misconception); mark mastery; watch the scheduler update
   tomorrow's plan.
6. **Progress & Records** — per-child progress, **standards coverage**, streak, and
   an exportable **portfolio** (homeschool record-keeping — a real legal need).
7. **Interests & Units** — pick/adjust the child's interest theme; start and track
   a Lane 2 thematic unit; the exploration-lane log + knowledge callbacks.
8. **Review & Policy** — preview any material before it reaches the child; set the
   content policy (domain-level, stance-aware).
9. **Settings** — household/members, the screen-time age dial, subscription (future).

## Student app — screen inventory (minimal by design)

1. **Profile picker** — avatar / short PIN on a shared device.
2. **Today** — the few finite screen tasks for today (retrieval + automaticity
   quizzes; Apple Pencil letter-tracing). No browsing, no feed.
3. **Quiz / task** — tap an answer → instant, calm feedback; timed fluency where
   the topic is procedural.
4. **Done wall** — a clear, satisfying stop. No "keep going" loop.

## Key flows

1. **Parent daily loop** — open → Coach Brief → print packet → *(child does it on
   paper, closed-book)* → record grades → tomorrow's plan adapts. Optional short
   screen test for the child.
2. **Child screen-test loop** — pick profile → do today's few tasks → done.
3. **New-child setup** — household → child → policy → placement → first plan.
4. **Start a unit** — pick an interest → unit generated (reviewed) → tracked toward
   coverage.

## Fidelity plan

1. **Lo-fi screen map** (this doc) — the inventory + flows. ✅
2. **Hi-fi interactive mockups** — build the core screens as clickable prototypes
   (web/Artifact first — fastest to iterate and preview — then port to React
   Native). Start **parent-first** with the daily loop (Home/Today → Print →
   Record), since it's the hub and the highest-risk UX.
3. **Component/design system** — tokens (color, type, spacing), the calm student
   palette, both themes — extracted once the core screens settle.

## When

- **Now:** the screen map (done) and hi-fi mockups — no backend needed.
- **After Supabase is up:** wire the mockups to `@marble/engine` + live data as
  the real React Native apps.
