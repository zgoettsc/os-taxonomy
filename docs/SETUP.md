# Setup — your step-by-step to take Marble live

This is the **do-it-in-order checklist** for turning the repo (design + a tested
offline core) into a running product. It's split into what only **you** can do
(create accounts, hold credentials, install tools) and what **I** do once you
have those (wire code, apply migrations via scripts, build the app).

Everything in the repo already runs **offline with no accounts** — the taxonomy,
the engine, the generators, the content pipeline (in mock mode), the DB schema +
seed generator, and the two app mockups. The steps below add the real services.

> **Golden rule for every step: never commit secrets.** Keys go in a local
> `.env` (already gitignored) or the host's secret store — never in the code or
> the app bundle. If a key ever lands in git, rotate it.

---

## Phase 0 — Your computer (one-time, ~20 min)

1. **Install Node.js 22 or newer** — <https://nodejs.org> (LTS). Check it:
   ```bash
   node --version      # should print v22.x or higher
   ```
2. **Install Git** — <https://git-scm.com> — and a code editor (**VS Code**,
   <https://code.visualstudio.com>).
3. **Get the code:**
   ```bash
   git clone https://github.com/zgoettsc/os-taxonomy.git
   cd os-taxonomy
   git checkout claude/homeschooling-repo-usage-priain
   ```
4. **Prove the offline core works** (no accounts needed):
   ```bash
   node scripts/homeschool-plan.mjs --age 6 --name "Ada"       # what to teach
   node scripts/worksheet.mjs mt_ghF3Vv6taM --count 3          # printable worksheets
   node engine/demo.mjs --age 6 --days 25                      # the daily loop, simulated
   cd packages/engine && node --test --experimental-strip-types "test/*.test.ts"
   cd ..
   ```
   Also open `demo/parent-app.html` and `demo/kid-app.html` in a browser.

✅ **Done when:** the commands print output and the engine tests pass.

---

## Phase 1 — The database (Supabase) — the first "real" milestone (~30 min)

This gives you a real cloud Postgres database preloaded with the 1,590-topic
taxonomy, plus built-in auth and file storage. (Supabase is the Firebase-style
backend we chose — see `docs/architecture.md`.)

### 1.1 Create the project
1. Sign up (free tier is plenty to start): <https://supabase.com> → **New project**.
2. Give it a **name** (e.g. `marble`), set a **strong database password**
   (save it in a password manager — you'll need it), pick a **region** close to
   you. Create, then wait ~2 minutes for it to provision.

### 1.2 Grab your keys (Project Settings → API)
Copy these into your password manager / a local `.env` (never commit):
- **Project URL** — `https://<ref>.supabase.co`
- **anon public key** — safe for the app (client-side).
- **service_role key** — **admin, server-only. Never put this in the app.**

### 1.3 Create the tables (apply the schema)
1. In Supabase, open **SQL Editor → New query**.
2. Open `db/schema.sql` from the repo, copy its **entire** contents, paste into
   the editor, and click **Run**.
   - This creates the household/members/children tables, the topics +
     dependencies reference tables, mastery, attempts, sessions/packets,
     content policies, artifacts — and turns on **Row-Level Security** so one
     family can never read another's data.
   - (CLI alternative if you prefer: `supabase db push`.)

### 1.4 Load the taxonomy (seed the reference data)
On your computer, generate the seed SQL from the repo data, then run it:
```bash
node db/seed.mjs > db/seed.sql
```
Open the generated `db/seed.sql`, copy its contents into **SQL Editor → New
query → Run**. This loads the **1,590 topics + 3,221 dependencies** (and any
reviewed content files) into the reference tables. It's idempotent — safe to
re-run.

### 1.5 Verify
**Table Editor → `topics`** should show ~1,590 rows; `dependencies` ~3,221.

✅ **Done when:** the tables exist and `topics` is populated.
➡️ **Then I can:** wire the apps to read/write this database.

---

## Phase 2 — Real content generation (Anthropic API) (~20 min)

Turns the **mock** lesson/worksheet generator into **real, cited** content.
(Math practice is always code-generated and correct-by-construction; this is for
the written lessons, facts, and unit pages.)

1. Create an account at <https://console.anthropic.com>, then **add billing
   credit** (it's pay-as-you-go; generating a content item is cheap, and you
   control the volume).
2. **API Keys → Create key.** Save it (secret).
3. On your computer, make it available and install the SDK:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."     # or put it in .env
   npm i @anthropic-ai/sdk
   ```
4. Generate a **real** content file (default is mock):
   ```bash
   node pipeline/generate.mjs --topic mt_ghF3Vv6taM --provider claude
   # or let it pick a topic:  --age 6 --subject Science --provider claude
   ```
5. **Review before it ships.** Every generated file carries provenance and a
   `reviewed` flag; nothing reaches a child while `reviewed: false`. You (or a
   reviewer) approve content before it goes live — this is the anti-fabrication
   gate, by design.

✅ **Done when:** a generated file appears with real content + citations, still
gated behind review.

---

## Phase 3 — Real images (optional, when you want them)

See `docs/image-setup.md` for the runbook. In short:
- **NASA** (space) and **Wikimedia / Smithsonian / iNaturalist** (real photos of
  cats, birds, etc.) need **no key** — just internet access. Licenses are
  checked automatically (CC0 > CC-BY > CC-BY-SA; NC/ND skipped).
- **AI image generation** (Firefly / Imagen / FLUX / Recraft / Ideogram) each
  need **their own API key** — optional; only if you want generated art. Claude
  then judges which vendor's result is best.

---

## Phase 4 — The apps (the big build)

**Honest status:** the parent and student apps exist today as polished **HTML
mockups** (`demo/parent-app.html`, `demo/kid-app.html`). Turning them into the
real iPad/phone apps is a build project — **React Native + Expo** on top of
`@marble/engine` + Supabase. That work is mostly **mine**, with your direction.
Your tasks to unblock it:

1. **Nothing extra to start** — I can scaffold the Expo app and run it in a
   simulator / **Expo Go** on your phone using the Supabase keys from Phase 1.
2. **To run on a physical iPad via TestFlight, or submit to the App Store:** an
   **Apple Developer account** ($99/year) — <https://developer.apple.com>. Not
   needed for early development.
3. **On a Mac:** install **Xcode** (App Store) for the iOS simulator; or just
   use **Expo Go** on a real device — no Xcode needed.

➡️ **Then I:** build the login → household → child flow, wire the daily
loop (start session → print → send exam → assess) to live data, and add
Apple Pencil tracing.

---

## Phase 5 — Later (when you have families using it)

- **Payments** — App Store in-app purchase and/or Stripe for subscriptions.
- **Compliance** — a proper COPPA / FERPA / GDPR-K review (we already minimize
  PII to first name + birth year by design; see `docs/architecture.md`).
- **Content review at scale** — a reviewer workflow for the `reviewed` gate.
- **Privacy policy + terms** before launch.

---

## Secrets checklist (read once, follow always)

| Secret | Where it lives | Never |
|---|---|---|
| Supabase **anon** key | app config (client) | — (safe to ship) |
| Supabase **service_role** key | server / your machine only | never in the app bundle or git |
| Supabase **DB password** | password manager | never in git |
| **Anthropic** API key | server-side / `.env` | never in the client app or git |
| Image-vendor keys | server-side / `.env` | never in git |

---

## Your immediate next three actions

1. **Phase 0** — install Node, clone the repo, run the offline demos.
2. **Phase 1.1–1.2** — create the Supabase project and copy your three keys.
3. **Ping me** when the database is up (or paste any error) — I'll apply the
   remaining wiring and we'll get the first real screen reading live data.
