# Project Map

A homeschool learning system built on the Marble taxonomy. **Tagline:
*Empowering parents, not screens.*** Start with [`BRIEF.md`](BRIEF.md) for the
one-page pitch; this file is the map of everything.

## Setting it up

**[`SETUP.md`](SETUP.md)** — your step-by-step to take it live: install tools,
stand up the Supabase database (schema + seed the taxonomy), turn on real
content generation, and build the apps. Start here when you're ready to build.

## Read in this order

1. **[`BRIEF.md`](BRIEF.md)** — one-page overview (what it is, why it's different).
2. **[`PHILOSOPHY.md`](PHILOSOPHY.md)** — the design principles (paper-to-learn /
   screen-to-apply, the binder, two lanes, structured autonomy, the physics of
   learning, accountability, content integrity, unlimited practice).
3. **[`differentiation.md`](differentiation.md)** — the landscape and our unique
   position + the AI-innovation shortlist (Tier 1 signature features).
4. **[`architecture.md`](architecture.md)** — the stack (Supabase, shared TS
   engine, React Native, PencilKit, offline content pipeline; privacy-first).
5. **[`ROADMAP.md`](ROADMAP.md)** — the phased build plan.

## The evidence base (why the pedagogy is what it is)

- [`learning-science.md`](learning-science.md) — the shared "physics of learning" essay.
- [`math-academy-outline.md`](math-academy-outline.md) / [`math-academy-notes.md`](math-academy-notes.md)
  — our own-words synthesis of *The Math Academy Way* + how it refines our plan.
- [`applying-learning-science.md`](applying-learning-science.md) — mapping the
  science onto this project.
- [`references.md`](references.md) — citations.

## Content, safety & images

- [`content-architecture.md`](content-architecture.md) — the content data model:
  topics → source snapshots → core + themed presentations; freshness (1yr TTL),
  minimal auto-review, generate-once/serve-many reuse, and the content-policy
  (gate vs stance) model. **The decision record for how content is stored & governed.**
- [`content-sourcing.md`](content-sourcing.md) — where material comes from,
  the source registry + commercial switch, anti-fabrication, the parent content policy.
- [`content-pipeline.md`](content-pipeline.md) — the five-stage generation pipeline.
- [`illustrations.md`](illustrations.md) — the image strategy (source router:
  NASA / photo / generate / diagram).
- [`image-setup.md`](image-setup.md) — the runbook to take images live.

## Code

| Path | What it is | State |
|---|---|---|
| `data/` | The Marble taxonomy (topics, dependencies, standards, clusters) | source data |
| `packages/engine/` | **`@marble/engine`** — the real shared TypeScript engine (graph + scheduler), strict-typed, tested | ✅ built + tested |
| `engine/*.mjs` | JS prototypes (scheduler demo, worksheet-packet, lesson-page) | prototype |
| `scripts/*.mjs` | Planner, math generators, printable worksheets, American-English normalizer | ✅ runnable |
| `pipeline/*.mjs` | Content generation (text + image source router + bake-off), behind mock/real seams | ✅ runnable (mock) |
| `db/` | Supabase schema + idempotent seed generator | ✅ schema + seed |
| `demo/parent-app.html` | **Parent app** hi-fi mockup — Today/Plan/Print/Progress + Record (Garden theme) | ✅ runnable |
| `demo/kid-app.html` | **Student app** hi-fi mockup — profile → today → quiz → letter-tracing → done wall | ✅ runnable |
| `demo/index.html` | Earlier self-contained app-screen demo | ✅ runnable |

## Try it (no setup, offline)

```bash
node scripts/homeschool-plan.mjs --age 6 --name "Ada"      # what to teach
node scripts/worksheet.mjs mt_ghF3Vv6taM --count 3         # printable worksheets
node engine/lesson-page.mjs --unit cats                    # a "book page"
node engine/demo.mjs --age 6 --days 25                     # the daily loop, simulated
node pipeline/generate.mjs --age 6 --subject Science       # generate a content file
cd packages/engine && node --test --experimental-strip-types "test/*.test.ts"  # engine tests
node db/seed.mjs > db/seed.sql                             # generate DB seed
```

## What needs credentials / network (not buildable in the dev sandbox)

- **Real content generation** — wire the Claude provider (`ANTHROPIC_API_KEY`) +
  an OER grounding corpus in `pipeline/`.
- **Real images** — see [`image-setup.md`](image-setup.md) (network + optional
  generation-vendor key; NASA/Wikimedia need none).
- **Live database** — a Supabase project to apply `db/schema.sql` + `db/seed.sql`.
- **The apps** — the React Native parent/student apps on top of `@marble/engine`.

## Status in one line

Complete design + a working, tested core (engine, generators, pipeline, schema)
running on the real taxonomy — everything that doesn't require external services
is built; what remains is credentials, a database project, and the app UIs.
