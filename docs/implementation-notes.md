# Implementation notes (as-built)

The design docs describe the intended system; this file records what is **actually
built and running** in the app + pipeline, since the two have drifted. Update this
as we go. When a design doc and this file disagree, this file wins for "what exists
today"; the design docs remain the north star for intent.

Tagline unchanged: **empowering parents, not screens.**

---

## The live app — `demo/app.html`

A single self-contained file (vanilla JS + CSS, Supabase via `fetch`, no build).
Holds only the **public anon key**; all privileged work is server-side. Screens:
`auth · kids · home · settings · review`. Header is a clean bar (`‹ Back · 🌱 Marble
· ⋯`) with an overflow **⋯ menu** (email, Review [admin], Settings, Sign out).

### Session model — a dateless QUEUE + a dated RECORD
The unit is a **session** (a small bundle of topics), not a day.
- **Queue (the plan):** `status='planned'`, **no date**, ordered by `queue_pos`. The
  forward plan. Topics never repeat across queued/in-progress sessions; mastered
  work is excluded.
- **Start → started:** stamps `for_date = today`, `status='started'`. In progress.
- **Assess → completed:** the interactive rubric records mastery and completes it.
- **History (the record):** a **List ⇄ Calendar** toggle (defaults to List — a
  chronological log, newest-first, grouped by day with topics visible). Calendar is
  the month grid; click a past day to reprint. Both reprint (Full / Materials /
  Worksheets). A **search box** at the top: type a topic/keyword to find **topics**
  (reprint a
  SINGLE topic's Full/Materials/fresh Worksheet via `printTopic`) and **past
  sessions** (reprint the session). Search covers this grade + any worked-ahead
  topics from the child's own session history (`buildSearchable`).

Home layout: **In progress → Up next → Prepare ahead → Whole-grade binder → History.**
- **Empty queue** shows a live **look-ahead** of the next few prospective sessions
  (Start any, or **Shuffle** to reroll).
- **Prepare N sessions ahead** appends dateless sessions to the queue (road trip);
  **Print all N** builds one binder. **Cancel** (queued) / **Clear queue** / **Cancel**
  (in-progress → back to queue) — nothing gets stuck; canceling loses nothing.
- **Inline "Preview this session"** per card: objectives + description instantly
  (from the taxonomy `evidence`), lesson coach-notes/examples lazily fetched.
- **Session size** = **new topics per subject** (default 1, adjustable 1–3 per child
  in Settings). Breadth-first / interleaved. Reviews are NOT yet woven in (see below).

### Print packet
Ink-light (white pages, thin color accents). Modes: **Full** (guide + lesson +
worksheet + assessment + sources + answer key), **Materials** (no worksheets),
**Worksheets** (fresh practice only). One topic per page-break unit. Picture cards
render their resolved image (see Images), else a text placeholder.
Worksheet source per topic: arithmetic math → code generator (`genProblems`);
everything else → the `practice_items` bank if present, else the lesson's own
`practice.items`. (Non-arithmetic math falls through to the bank/lesson practice —
it does NOT skip the worksheet.) So every topic with a lesson gets a worksheet.
For **fresh/varied** worksheets across reprints, generate `practice_items` banks
(generate-practice / backfill); a lesson's built-in practice is fixed.

### Whole-grade binder
`printGrade(mode)` prints **every topic in the child's age band**, grouped **by
subject** with dividers, and **within each subject in curriculum-progression order**
(`topoSort`: topological sort over the hard-prereq graph, ties by age→centrality→name —
so page 1 is foundational, later pages harder). A **Worksheets** button
(`printGradePractice` → `buildPracticePacket`) prints a practice-only binder: **3
worksheets per topic** (variant-rotated so they differ) + answer keys, nothing else.
Ordering uses `topoSort` in the app (tiebreak centrality→age→id), matching the
canonical **`scripts/sequence.mjs`** (Kahn's algorithm over the hard-edge subgraph +
soft-edge preference + a `validateOrder` checker). The full graph is a clean DAG
(1590/1590 sequence with 0 hard violations); **`scripts/check-order.mjs`** +
the `validate-order` workflow fail CI if an edit ever introduces a hard-edge
violation or cycle. (Earlier "0 age-4-math edges" was a false alarm — an audit bug,
snake_case vs camelCase keys; there are 14 real edges and the graph models the
number strand correctly.)

The **Worksheets** binder makes SAME-size sheets with **non-overlapping questions**
(consecutive slices of the deduped bank + built-in practice; math uses the generator
for fresh random sets). 3 full unique sheets/topic requires a bank of ≥ 3×6 items —
so knowledge topics need `practice_items` generated (generate-practice / backfill);
until then they show one full sheet. Deliberately by-subject (a reference/scope binder) because
the session/queue/prepare-ahead flows are all by-session. **Alternative not built:** a
"Course sequence" export = the whole grade pre-composed into interleaved sessions in
teaching order (prereqs respected) — add as a *separate* mode if wanted; it overlaps
prepare-ahead → Print all. (Noted in code at `printGrade`.)

---

## Data model (Supabase) — SQL files to apply, in order
1. `db/schema.sql` — households/children/mastery/content_items/topics/deps + RLS.
2. `db/corpus.sql` — `source_documents` (FTS-only; vector index dropped) + RPC.
3. `db/practice.sql` — `practice_items` (unlimited auto-checkable practice).
4. `db/sessions.sql` — `sessions` (dateless queue + record; `queue_pos`, nullable
   `for_date`, status planned|started|completed). Migrates an older day/seq table.
5. `db/images.sql` — `lesson_images` (one image per picture-card slot; review-gated).
6. `db/review.sql` — `admins` (seeded by owner email) + admin RLS to read the pending
   queue and flip `content_items.reviewed` / `lesson_images.status`.

RLS: children only ever see `content_items.reviewed=true` and `lesson_images.status
='approved'`. Writes are service-role (pipeline) or admin (review screen).

---

## Content generation — precompute, never on-demand
**Rule: content/images are NEVER generated at session open/start** (minutes + cost).
The app only reads ready content; if a topic isn't ready it degrades to "Basics"
(evidence-only, no wait).

- **Grade batch** — `pipeline/backfill.mjs --age N`: generate EVERY topic in an age
  band (one-time, so a grade is perfect end-to-end). Age 4 = 41 topics.
- **Frontier backfill** — default mode (cron every 6h): keep each child's next
  `--buffer` ready topics generated ahead. Content is **global per topic** (deduped
  across children), so shared early topics are generated once.
- Both: for a topic with no reviewed lesson → generate lesson (`generate.mjs`) then
  images (`resolve-images.mjs`); or top up images for a lesson that lacks them.
  Cost-capped per run (`--max`). Idempotent — re-run to continue.
- **Lessons:** grounded (cite-or-abstain), auto-review gate → `reviewed=true` only
  when 0 flags, else held for the review screen. Provider seam `mock|claude`
  (`claude-opus-4-8`). Corpus retrieval is **FTS keyword-only** (vectors dropped for
  IO/cost).
- **No blind americanization.** We do NOT run the lexical americanizer over generated
  prose (it corrupted valid text: "rubber band"→"eraser band"). The model writes
  American English; any britishism that slips through is a **review flag**
  (`findBritishisms`), not an auto-rewrite.
- **Coherence gate.** After generation, a cheap Haiku copy-editor (`coherenceProvider`)
  scans the prose for garbled/broken text (bad find-replace, dropped letters); any hit
  is a review flag that holds the lesson. Protects the "every fact verified" promise.
- **PostgREST 1000-row cap — paginate every large read.** A single PostgREST response
  is capped at ~1000 rows *regardless* of a `&limit=` in the URL. A one-shot GET on a
  big table silently truncates. This is what made the grade Worksheets binder render
  full topics as one thin sheet: the app fetched all 41 topics' banks in one call, the
  rows past #1000 never arrived, and those topics fell back to the lesson's 3 built-in
  questions — the "3/6/18" pattern in the PDF was a **read-truncation artifact, not a
  thin bank** (backfill, counting the same table, correctly reported the banks full).
  Fix: `sbAll()` in the app and `getAll()` in `backfill.mjs`/`audit-practice.mjs` walk
  the table with `Range` headers until a short page returns. Used for `fetchPractice`,
  `loadServed`, and the backfill's deps/mastery/lesson/image/practice counts (deps at
  `limit=20000` was also being truncated, silently dropping prereq edges).
- **Backfill practice-skip must mirror the app's lanes (type-aware, not name-based).**
  The app (`laneOf` + `genProblems`) code-generates a math worksheet only when the
  topic's `type !== 'CONCEPTUAL'` **and** its name is an arithmetic the generator knows.
  Conceptual math ("Division as equal sharing", "Addition as combining…", "Subtraction
  as taking away…") is a LESSON topic in the app and needs a stored `practice_items`
  bank. The old backfill skipped any math topic whose *name* matched `add|subtract|…`,
  wrongly starving those conceptual topics (bank stayed 0 → empty worksheet). Fixed:
  `appCodeGenerates(t) = subject==='Mathematics' && type!=='CONCEPTUAL' && arithName(t)`,
  matching the app exactly. Re-run `backfill --age 4` to fill the affected banks.
- **`pipeline/audit-practice.mjs`** — read-only diagnostic: prints the live per-topic
  practice bank count for an age band (raw rows + distinct-by-prompt = the app view),
  plus a histogram and a below-target list. `node pipeline/audit-practice.mjs --age 4`.
  Use it to see the DB truth instead of inferring bank depth from a printout.
- **Infinite unique practice.** `practice_items` is a persistent per-topic bank: lessons
  **seed** it with their built-in practice (`generate.mjs` → `seedPractice`), and the
  **backfill tops each bank up to a target** (`--practice`, default 18 = three 6-Q
  sheets), generating only the shortfall (existing items are reused). Per-child
  **`practice_served`** logs which items a child got, so worksheets draw UNSERVED-first
  and never repeat until the bank is exhausted — then the backfill makes more. The grade
  Worksheets binder is served-aware (`loadServed`/`recordServed`); the per-session "New
  worksheets" path still uses local seen-tracking (migratable to `practice_served`).
- **Commercial-mode toggle** (repo var `COMMERCIAL_MODE=on`, or `--commercial`): when
  on, generation excludes NonCommercial sources AND forbids copyrighted/trademarked
  examples (no Disney/branded characters). OFF by default (fine for personal use).
  It's a GENERATION-time flag (content is pre-baked), not a live app toggle — flip it
  and regenerate when going commercial.

---

## Images — real-first hybrid, illustration-default
`pipeline/resolve-images.mjs`, one image per `student.examples[].show` slot.
- A directive (`imageProvider`, claude) classifies each card **photo vs illustration**
  and gives a clean single-subject scene + photo query + alt. **Default is
  illustration**; `photo` only for a *specific real thing* (a species, a landmark, a
  planet, an artifact) — never generic nouns (tree/shoe/rose).
- **illustration** → OpenAI `gpt-image-1` in a **locked HOUSE_STYLE** (simple line +
  soft wash, single subject, plain bg, no text) → consistent across a day. Auto-approved.
- **photo** → Openverse (CC0/PD/CC-BY), mirrored to the public `lesson-images` Storage
  bucket with a short credit line. Stored **`pending`** for a human glance.
- Toggle: repo var `AI_IMAGES=off` or `--no-ai` → photos only. House style is a single
  string in `resolve-images.mjs` (swap for watercolor/flat/etc.).

---

## Review screen (admin) — a queue of exceptions
`db/review.sql` seeds the owner as admin. In-app **✓ Review** (admin-only) lists:
- **Held lessons** (`reviewed=false`) — renders the lesson + why it was held →
  Approve (go live) / Reject & remove (regenerates next sweep).
- **Pending photos** (`status='pending'`) — thumbnail + credit → Approve / Reject.
Illustrations auto-approve and passing lessons are already `reviewed=true`, so the
queue stays short.

---

## Workflows (`.github/workflows/`, all `workflow_dispatch` + keys as secrets)
- `generate-content.yml` — one topic: ground → generate → verify → store.
- `generate-practice.yml` — more auto-checkable practice for a topic.
- `resolve-images.yml` — resolve a topic's picture-card images.
- `backfill-readiness.yml` — **cron 6h** + manual; `age` (grade mode) / `buffer` /
  `max` / `dry`. Keeps content ready ahead of demand.
- `ingest-corpus.yml`, `dump-grounding.yml` — corpus ingest / grounding inspection.

Secrets used: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (+ `SMITHSONIAN_API_KEY`, `VOYAGE_API_KEY` where present).
Repo var: `AI_IMAGES`. Note: `schedule:` crons only fire from the **default branch**.

---

## Open threads (intended, not yet built)
- **Spaced-repetition reviews in sessions.** The mastery table has `box`/`due_at`, but
  session composition serves only NEW topics — the review scheduler (docs/
  applying-learning-science.md) is not wired in. Sessions today = new material only.
- **App-driven priority queue.** A `generation_queue` the app writes on prepare/look-
  ahead, drained first by the backfill, so deliberately-planned topics jump the line.
- **Course-sequence grade export** (see Whole-grade binder above).
- **Image review depth / per-slot regeneration** (currently regenerate a whole topic).
