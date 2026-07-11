# Architecture & Tech Stack

The technical shape of the product, decided from the requirements in
[`PHILOSOPHY.md`](PHILOSOPHY.md) and the constraints below. Sequencing lives in
[`ROADMAP.md`](ROADMAP.md).

## Requirements that drive the stack

- **Multiple homeschool families** (eventually) → multi-tenant, cloud-hosted.
- **App Store presence** (future) → a native-capable app path, not just web.
- **Not on-device** → cloud database so data survives lost/broken devices and is
  reachable from multiple devices and by multiple family members.
- **Logins for parents, linked to children** → auth + a relational data model.
- **Apple Pencil** (e.g. animate a letter's stroke, then let the child trace it)
  → native pencil capability on the student surface.

## The stack

1. **Backend — Supabase** (managed **Postgres** + **Auth** + **Storage**).
   - Postgres because the data is relational (parents → children → progress).
   - Built-in **Auth** including **Sign in with Apple** (App Store requirement).
   - **Row-Level Security** for multi-tenant isolation (families can't see each
     other's data) enforced at the database, not just the app.
   - Low-ops for a small team. *Alternative:* Firebase (auth/realtime are strong
     but NoSQL fits the relational model worse and locks in harder). *Escape
     hatch:* a custom Node+Postgres API if we outgrow the BaaS.
2. **Engine — shared TypeScript library.** The scheduler, generators, content
   model, and policy engine as one platform-agnostic package, used **both**
   client-side (in the app) and server-side (scheduled jobs, the content
   pipeline). Types matter here — a wrong spaced-repetition interval is a silent
   bug. This is the crown jewel and stays UI-free.
3. **Apps — React Native + Expo.** One codebase for the **parent** and
   **student** apps → iOS first (App Store), Android later. Reuses the TS engine
   directly (same language). For the **Apple Pencil** surface, a **native
   PencilKit module** where smoothness matters — cross-platform for ~95%, native
   escape hatch for the part that demands it.
4. **Content pipeline — offline Node/TS + Claude API.** Generate → verify →
   human-review → store reviewed content in the DB as a **shared library across
   all families** (LLM cost is generate-once, not per-user). Governed by
   [`content-sourcing.md`](content-sourcing.md); nothing ships while
   `reviewed: false`.
5. **Web — later.** A parent web portal is cheap to add because the engine is
   shared; not a priority for v1.

## Data model (relational sketch)

- `parents` (account, auth identity)
- `children` (linked to one or more parents/guardians; **minimal PII** — first
  name + birth year, nothing more)
- `guardianships` (parent ↔ child, many-to-many)
- `content_items` (the shared library: lessons, practice, assessments, units;
  versioned; carries provenance + `reviewed`)
- `mastery` (child × topic → status, box, dueDate, history)
- `schedules` / `packets` (what's assigned/generated per child per day)
- `policies` (per parent/child content-policy settings)
- `artifacts` (generated worksheets/PDFs, in Storage)

Multi-tenancy: every child-scoped row is isolated by RLS keyed to the owning
parent account. The content library is shared/global (read-only to families).

## Session lifecycle & how the two apps stay in sync

The parent app and student app are **two thin clients over one shared database
and engine** — there is no peer-to-peer sync and no "which is source of truth"
question. Both read/write the same rows; Supabase realtime pushes changes, so
the parent's phone and the child's iPad converge within seconds.

A `session` is the unit of work (see [PHILOSOPHY §7](PHILOSOPHY.md) — sessions,
not days). It has three phases — **learn → test → assess** — and the parent
holds the gate between learning and testing (paper-to-learn-first,
screen-to-test):

1. **Start → learn (on paper).** A `session` row is created and the engine
   assembles the packet; the parent **prints the learning materials** (book
   page + worksheet). The child learns it closed-book, away from the screen.
   Starting does **not** unlock the exam.
2. **Mark complete → send the exam (the trigger).** When the child has learned
   it, the parent marks the session complete, which **pushes the on-screen exam
   to the child's iPad**. *This* is what surfaces the student-app tasks — not
   Start. Who may drive this is a **per-child setting**: young children are
   parent-gated (parent starts and sends the exam); older, self-directed
   children can start the material and self-test on their own
   (screen-time-graduates-with-age).
3. **Test (on screen).** The child takes the exam in the student app —
   retrieval/fluency quizzes and Pencil tracing.
4. **Assess (parent).** Results come from **two sources**: the on-screen exam is
   **auto-scored** (written straight to `attempts`/`mastery`, zero parent
   effort), and the parent **grades the paper worksheet** on the Assess screen.
   Both feed the same scheduler; back-dating and editing are allowed.

So: **Start** prints the learning materials; **Mark complete** sends the exam
(the trigger); **Assess** reviews the auto-scored exam plus the parent-graded
paper. The two apps stay consistent because both read/write these same rows.

## Apple Pencil: animate-then-trace

- **Demonstrate:** animate the reference stroke path (order + direction).
- **Attempt:** capture the child's Pencil strokes.
- **Score:** compare strokes to the target path (order, direction, accuracy) and
  give instant feedback.
- **Why it belongs on screen:** it does what paper *can't* (show stroke order +
  grade the attempt live) — the screen earning its place under the "tool, not
  content" rule. Maps to real taxonomy topics (e.g. "Sitting and holding a
  pencil", "Writing digits 0–9").

## Privacy & compliance (a first-class design constraint)

Cloud-storing multiple families' **children's** data triggers real obligations —
**COPPA** (US), and potentially **FERPA** and **GDPR-K** (EU). Not a blocker, but
it shapes the design from day one:

- **Verifiable parental consent** before creating a child profile.
- **Data minimization** — collect as little about the child as possible.
- **Isolation + encryption** — RLS, encryption at rest/in transit.
- **No third-party ad/tracking SDKs** in the child experience.
- **A real privacy policy** and clear parental data controls (export/delete).

Build privacy-first now rather than retrofitting.

## Cost notes

- **Apple Developer Program** (~$99/yr) for App Store + Sign in with Apple.
- **Supabase** has a free tier and scales with usage.
- **LLM generation** is bounded: content is generated once into the shared
  library and reviewed, not regenerated per child.

## Sequencing (see ROADMAP)

The engine + data schema come first (they're needed to prove the daily loop),
then the React Native app on top, with the native Pencil module added when the
tracing feature is scheduled. The engine can be validated cheaply (CLI or a
throwaway web view) before the full mobile build.
