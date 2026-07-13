# Content Architecture — sourcing, freshness, reuse & policy

How learning content is **structured, stored, kept fresh, reused, and governed**.
This is the data-model + lifecycle spec. It sits on top of, and cross-references:

- [`content-sourcing.md`](content-sourcing.md) — *where* facts come from, licenses, the
  commercial switch, the anti-fabrication policy, and the parent values policy.
- [`content-pipeline.md`](content-pipeline.md) — the five generation *stages*
  (ground → generate → fill → verify → gate).
- [`architecture.md`](architecture.md) — the stack, the DB, session lifecycle.

Everything below reflects **decisions we've made** (see the Decision Log at the
end). It is the reference to build against; it is not yet implemented in the DB.

---

## The three layers

The single most important idea: **the topic, the sourced evidence, and the
child-facing content are three different things.**

```
TOPIC  (stable — from the taxonomy)          "Continents"  (mt_xxx, already in DB)
  │
  ├─ SOURCE SNAPSHOTS  — raw material we pulled, per source, dated
  │     (topic × source):  NASA 2026-01-12 · Wikidata 2026-01-12 · Core Knowledge 2025-11-03 …
  │
  └─ CONTENT
        content_core  (topic × reading-level [× stance])   ← verified facts + citations
             └─ content_presentation (… × theme)           ← cheap re-skin, child-facing
```

- **Topic** — the anchor. Stable. Already loaded (`topics`).
- **Source snapshot** — the *evidence*: what a reputable source said about the
  topic, when we fetched it. Not shown to a child.
- **Content core** — the verified facts for a topic at a reading level, citing
  snapshots. Expensive; made once.
- **Content presentation** — the same facts re-skinned with an interest theme.
  Cheap; the thing a child actually reads.

---

## Layer 2 — `source_snapshots`

**Granularity: one row per `(topic, source)`** *(Decision: Option A — the simple
model; migrate to normalized `source_documents` + M2M later if dedup matters.)*

| Column | Purpose |
|---|---|
| `topic_id` → topics | the anchor (Continents) |
| `source_id` | `nasa`, `wikidata`, `ck12`, … (from `pipeline/sources.mjs`) |
| `fetched_at` | **the freshness clock** |
| `url` / `source_ref` | the exact page / query / Q-ID (also the *clickable link* shown to parents) |
| `license`, `commercial` | denormalized from the source registry (drives the NC switch) |
| `passages` (jsonb) | the retrieved material we ground on |
| `content_hash` | hash of the material — to detect change on re-fetch |
| `source_etag` / `source_last_modified` / `revision_id` | the source's own version signal (for conditional GETs) |
| `fetch_status` | ok / error / not-found |

**Freshness rules (Decision):**
- **TTL = 365 days.** A snapshot older than one year is *stale* → schedule a re-fetch.
- On re-fetch, compare `content_hash`/etag: **unchanged** → just bump `fetched_at`;
  **changed** → the grounding shifted, so every `content_core` that cited this
  snapshot is flagged *"sources updated — re-check"* (and its presentations with it).
- **Re-fetch trigger:** a scheduled job re-checks stale snapshots, plus on-demand
  when generating content for a topic with no fresh snapshot.

---

## Layer 3 — `content_core` + `content_presentation`

*(Decision: Option 2 — separate the verified facts (core) from the interest
costume (presentation); **store the themed presentations**.)*

### `content_core` — the verified facts (made once, expensive)
- Keyed by **`(topic, reading_level [, stance])`**.
- **Reading-level bands (Decision): `4-5`, `6-7`, `8-9`, `10-11`.** Tag by band,
  never exact age (avoids shattering the cache).
- Holds: the factual body, `citations` → the specific `source_snapshots` it was
  built from, verification results, review state, freshness (inherited from its
  snapshots).
- `stance` is present **only for policy-sensitive topics** (see Policy below);
  neutral topics have no stance dimension.

### `content_presentation` — the child-facing re-skin (made cheaply, stored)
- Keyed by **`(content_core, theme)`**; `theme = neutral` is one of them.
- A re-skin **cannot introduce new facts** — it only re-frames the core's facts
  with the interest (cat/dinosaur/space examples). So it doesn't re-open
  fact-verification; a light appropriateness check is enough.
- **Stored and shared** — see Reuse.

### Serve-resolution (assignment time)
For a child needing `(topic, level, theme)`:
```
1. presentation(topic, level, theme) exists & fresh   → serve  (perfect hit)
2. themed kid, core exists, no themed presentation     → skin core → store → serve
3. core missing                                        → run pipeline → core → presentation
4. themeless kid                                       → serve the NEUTRAL presentation
                                                          (Decision: neutral is the default)
```

---

## Review model — automated by default, humans only for grey areas

*(Decision: human review must be MINIMAL. Automation carries the load.)*

**Auto-approve** (`reviewed:true, reviewer:'auto'`) when **all** hold:
1. every factual claim is cited to a source snapshot (**cite-or-abstain**), and
2. the **independent verification pass** confirms each cited claim is supported, and
3. the topic is **not policy-sensitive**, and
4. confidence is above threshold.

**Route to a human** only when one of those fails — an uncitable claim, sources
disagree, low confidence, or a sensitive domain. That's the small residual.

**Why this doesn't burden parents:** content is **global and cached**, so the
rare human review happens **once, centrally**, and serves every family forever. A
parent is **never a required reviewer** — their only "review" is the optional
glance at the printout before assigning it (the point-of-use backstop).

Human review concentrates almost entirely on **policy-sensitive topics** — which
is the same small set flagged below. Neutral facts (the overwhelming majority)
never touch a human.

---

## Reuse & caching — generate once, serve many

- The taxonomy is finite (1,590 topics) × a few bands × a few common themes, so
  the content cache **converges** — over time most combinations are pre-made and
  served instantly (no generation, no cost, and consistent across families).
- **Themed presentations are a shared variety pool.** A theme one interest-kid
  triggers is reused for *any* kid later — including:
  - **Extra / "more" practice (Decision):** the assigned lesson is neutral by
    default, but the **more-practice lever taps the themed pool for variety** — a
    themeless kid grinding subtraction can get cats one round, frogs the next.
    (Only themes tagged safe + passing the child's content policy are served.)
- **Procedural practice stays code-generated** (`scripts/generators.mjs`) — infinite,
  unique per session, and themed for free ("3 🐱 + 2 🐱"). So reusing a vetted
  lesson never makes drills repetitive.
- **Uniqueness vs. reuse is resolved:** share the *verified lesson* (correct,
  cheap); keep the *practice* fresh per session and vary *image selection* per child.

---

## Content policy — gate vs. stance (almost nothing fragments the cache)

*(Decisions below. Fuller values-policy rationale lives in
[`content-sourcing.md`](content-sourcing.md#content-policy-what-may-and-may-not-be-taught).)*

Two **different** mechanisms — keep them separate:

- **Gate (show / hide)** — the parent can block a topic ("skip sex-ed for now").
  This is a **filter at assignment time, not a content variant** → **zero cache
  fragmentation.** The global content still exists; the child just isn't given it.
- **Stance (how a shown topic is framed)** — only for a **small set of sensitive
  topics**, the parent's stance selects among a **few explicit variants**
  (e.g. origins → `{factual-neutral, faith-inclusive}`). These variants are still
  **global** (one per stance, shared by all families who chose it) — never
  per-family. Stance may differ at the *presentation* level (framing) or, for
  substantive cases, the *core* level (different facts/sources → separately
  verified + human-reviewed).

**Everything not flagged sensitive is one universal version, shared by everyone.**

### Sensitivity tagging — the mechanism (Decision)
A flag **on the topic** (sensitivity is about subject matter, not rendering):
```
topic.sensitivity = {
  domains: [] | ['religion'|'body'|'politics'|'mature']…,   // usually []
  gate_default: 'show' | 'hide',                             // e.g. sex-ed → hide until opt-in
  stances: ['factual-neutral','faith-inclusive']            // variants this topic needs
}
```
**Supported axes (Decision):** `religion / origins`, `human body & reproduction`,
`politics / current events`, `violence / mature history`.

**How it's set — one-time, AI-assisted, human-confirmed:**
1. An **AI classifier sweep** over all 1,590 topics proposes candidates + rationale.
2. A **human confirms only the flagged subset** (a few dozen), sets the gate
   default, and defines the stance variants. The ~1,540 unflagged topics need no
   human. (This is the setup-time version of "minimal review.")
3. Store the confirmed flags on the topics.

**Backstops:** the generation-time verify/policy check can flag an unflagged
topic that surfaces sensitive material; the parent preview catches anything at
point of use; user reports feed back into re-tagging.

**The parent is the ultimate authority** — gate + stance select a global variant,
and the parent's preview-before-assign is the final say. (Future: allow a parent
to supply their *own* material for a gated topic — the gate model already fits it.)

---

## Transparency (Decision)

Every content item shows its provenance to the parent:
> **Facts verified Jan 2026** · Sources: NASA ↗ · Simple Wikipedia ↗ · Smithsonian ↗

…where each source is a **clickable link** (the snapshot `url`) to the exact page.
Optionally, individual facts link to their citing snapshot. "Here's exactly where
this came from, and when we last checked it."

---

## Where it runs

This is **trusted, server-side infrastructure — not the app:**
- A backend job (with `service_role` + network + the Anthropic key) does:
  **fetch sources → write snapshots → generate core → skin presentations →
  verify → auto-approve or queue for review.**
- The **app only ever reads reviewed content.** Clients never fetch sources
  directly (keys, rate limits, trust).
- Live source-fetching needs network + keys (blocked in the dev sandbox, same as
  images — see [`image-setup.md`](image-setup.md)).

---

## Decision Log (what we've locked in)

| # | Decision |
|---|---|
| D1 | Snapshot granularity = **per (topic, source)** — "Option A" |
| D2 | Freshness **TTL = 365 days**; older → re-fetch |
| D3 | Freshness = **age (TTL) + change (hash/etag)**; a changed snapshot flags all content built on it |
| D4 | Re-fetch trigger = **scheduled sweep + on-demand at generation** |
| D5 | Content split = **core (facts) + presentation (theme)** — "Option 2"; **themed presentations are stored** |
| D6 | Reading-level bands = **4-5 / 6-7 / 8-9 / 10-11** (tag by band, not exact age) |
| D7 | Themeless default = **neutral**; **extra practice may tap the themed pool** for variety (safe themes only) |
| D8 | Review = **auto-approve** when cited + verified + non-sensitive + confident; **human only** for grey/sensitive; reviewed **once, globally**; parents never required to review |
| D9 | Policy = **gate (filter, no fragmentation)** vs **stance (variants, sensitive topics only, still global)** |
| D10 | Sensitivity = **topic-level flag**; axes = **religion/origins, body & reproduction, politics/current events, violence/mature**; set by **AI sweep + human-confirm the flagged subset**, one-time |
| D11 | Transparency = **"verified on ___" + clickable source links** on every item |
| D12 | Fetch/generation is **server-side (service_role + keys)**; the app reads **reviewed** content only |

## Status

- ✅ Source registry + license/commercial switch + grounding compilation
  (`pipeline/sources.mjs`, tested).
- ⬜ DB tables: `source_snapshots`, `content_core`, `content_presentation`,
  citations link, sensitivity flags on `topics`.
- ⬜ The freshness/re-fetch job; the auto-review gate; the serve-resolution.
- ⬜ Live source fetching (needs network + keys).
- ⬜ The one-time sensitivity classification sweep + human confirm.
