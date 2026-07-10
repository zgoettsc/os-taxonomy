-- ============================================================================
-- Marble homeschool app — initial database schema (Supabase / Postgres)
-- ============================================================================
-- Decisions baked in (see docs/architecture.md):
--   • Tenant = HOUSEHOLD. Everything is owned by a household; parents/guardians
--     are members of it. Clean multi-parent support and future per-family billing.
--   • Children are PROFILES (no auth identity), with an optional PIN for
--     on-device profile switching. Minimal PII: first name + birth year only.
--   • Scope = the core daily loop + content policy. Lane 2 (thematic units /
--     exploration), billing, and the review queue are stubbed at the bottom.
--   • Security = Row-Level Security on every household-scoped table. Families
--     can never read another family's rows; the content library is shared/global
--     and read-only to families (only reviewed content is even selectable).
--
-- Supabase provides gen_random_uuid(), the `auth` schema, auth.uid()/auth.role().
-- Apply as a migration:  supabase db push   (or paste into the SQL editor).
-- ============================================================================


-- ============================================================================
-- 1. Households & membership (the tenant boundary)
-- ============================================================================

create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Which auth users belong to which household, and their role within it.
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'guardian' check (role in ('owner','guardian')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members(user_id);

-- Helper used by every RLS policy. SECURITY DEFINER so it reads membership
-- without tripping RLS recursion. Returns: is the current user in this household?
create or replace function public.is_household_member(hid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- Same idea, but resolving membership through a child's household.
create or replace function public.can_access_child(cid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.children c
    where c.id = cid and public.is_household_member(c.household_id)
  );
$$;


-- ============================================================================
-- 2. Children (profiles under a household; minimal PII by design)
-- ============================================================================

create table public.children (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  first_name   text not null,
  birth_year   int  not null check (birth_year between 2005 and 2100),
  avatar       text,        -- emoji / asset key shown in the profile picker
  pin_hash     text,        -- optional PIN for profile switching (NOT a security boundary; RLS is)
  created_at   timestamptz not null default now()
);
create index on public.children(household_id);


-- ============================================================================
-- 3. Content library  (GLOBAL — shared across all households, read-only to them)
--    Generated once, grounded, verified, human-reviewed.
--    Mirrors content/schema/content.schema.json.
-- ============================================================================

create table public.content_items (
  id         uuid primary key default gen_random_uuid(),
  topic_id   text not null,                       -- taxonomy micro-topic id (mt_...)
  lane       text not null check (lane in ('skill','knowledge')),
  age_min    int,
  age_max    int,
  standards  text[] not null default '{}',
  body       jsonb  not null,                     -- full content: parent/student/practice/assessment
  provenance jsonb  not null default '{}',        -- grounding[], verification[], generatedBy
  reviewed   boolean not null default false,      -- nothing servable until true
  reviewer   text,
  version    int not null default 1,
  created_at timestamptz not null default now(),
  unique (topic_id, version)
);
create index on public.content_items(topic_id);
create index on public.content_items(lane);


-- ============================================================================
-- 3b. Taxonomy reference tables (GLOBAL, read-only) — the graph itself.
--     Mirrors data/topics.json + data/dependencies.json so the app/server can
--     query and join the graph in SQL. Seeded by db/seed.mjs.
-- ============================================================================

create table public.topics (
  id               text primary key,               -- mt_...
  subject          text not null,
  domain           text,
  name             text not null,
  description      text,
  type             text,
  age_range_start  int,
  age_range_end    int,
  centrality       real,
  evidence         jsonb not null default '[]',
  standards        text[] not null default '{}'
);
create index on public.topics(subject);
create index on public.topics(age_range_start, age_range_end);

create table public.dependencies (
  topic_id        text not null references public.topics(id) on delete cascade,
  prerequisite_id text not null references public.topics(id) on delete cascade,
  strength        text not null check (strength in ('hard', 'soft')),
  reason          text,
  primary key (topic_id, prerequisite_id)
);
create index on public.dependencies(prerequisite_id);


-- ============================================================================
-- 4. Per-child scheduler state (the "brain")
-- ============================================================================

-- One row per (child, topic): mastery status + spaced-repetition schedule.
create table public.mastery (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children(id) on delete cascade,
  topic_id         text not null,
  status           text not null default 'locked' check (status in ('locked','learning','mastered')),
  box              int  not null default 0,        -- spaced-repetition level (interval index)
  accuracy         real,                           -- recent rolling accuracy
  last_reviewed_at timestamptz,
  due_at           date,                           -- next review due (null until mastered)
  history          jsonb not null default '[]',    -- compact per-review log
  updated_at       timestamptz not null default now(),
  unique (child_id, topic_id)
);
create index on public.mastery(child_id);
create index on public.mastery(child_id, due_at);
create index on public.mastery(child_id, status);

-- Individual attempt log — feeds mastery updates and later misconception diagnosis.
create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children(id) on delete cascade,
  topic_id        text not null,
  content_item_id uuid references public.content_items(id) on delete set null,
  item_ref        text,                            -- which item within the content
  kind            text,                            -- numeric | mcq | constructed | trace ...
  correct         boolean,
  response        jsonb,
  source          text check (source in ('paper','screen')),
  occurred_at     timestamptz not null default now()
);
create index on public.attempts(child_id, occurred_at);
create index on public.attempts(child_id, topic_id);

-- The daily assigned packet (what was planned/printed for a child on a date).
create table public.packets (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  for_date   date not null,
  status     text not null default 'planned' check (status in ('planned','printed','graded')),
  items      jsonb not null default '[]',          -- resolved topic/content refs + theme costume
  created_at timestamptz not null default now(),
  unique (child_id, for_date)
);
create index on public.packets(child_id, for_date);

-- Placement: starting point (age prior + parent checklist) and estimated frontier.
create table public.placements (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  checklist  jsonb not null default '{}',
  estimate   jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.placements(child_id);


-- ============================================================================
-- 5. Content policy (household default + optional per-child override)
-- ============================================================================

create table public.content_policies (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id     uuid references public.children(id) on delete cascade,   -- null = household default
  age_default  int,
  domains      jsonb not null default '{}',   -- {"religion":"factual-neutral","politics":"block",...}
  interest_box text not null default 'classifier+approval',
  updated_at   timestamptz not null default now()
);
-- At most one household-default row, and at most one override per child.
create unique index on public.content_policies(household_id) where child_id is null;
create unique index on public.content_policies(child_id) where child_id is not null;


-- ============================================================================
-- 6. Artifacts (generated worksheets/PDFs; the bytes live in Supabase Storage)
-- ============================================================================

create table public.artifacts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id     uuid references public.children(id) on delete set null,
  packet_id    uuid references public.packets(id) on delete set null,
  kind         text not null check (kind in ('worksheet','parent_guide','unit_booklet')),
  storage_path text not null,                  -- path in the Storage bucket
  created_at   timestamptz not null default now()
);
create index on public.artifacts(household_id);
create index on public.artifacts(child_id);


-- ============================================================================
-- 7. Row-Level Security
-- ============================================================================

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.children          enable row level security;
alter table public.content_items     enable row level security;
alter table public.topics            enable row level security;
alter table public.dependencies      enable row level security;
alter table public.mastery           enable row level security;
alter table public.attempts          enable row level security;
alter table public.packets           enable row level security;
alter table public.placements        enable row level security;
alter table public.content_policies  enable row level security;
alter table public.artifacts         enable row level security;

-- Households & membership: visible to members of that household.
create policy households_read   on public.households        for select using (public.is_household_member(id));
create policy households_update on public.households        for update using (public.is_household_member(id));
create policy members_read      on public.household_members for select using (public.is_household_member(household_id));
-- (Creating households and inviting members is done via server-side functions
--  running as service_role, which bypasses RLS — kept out of client policies.)

-- Content library: any authenticated user may read ONLY reviewed content.
-- No insert/update policy → families cannot write content (service_role manages it).
create policy content_read on public.content_items for select using (reviewed = true);

-- Taxonomy graph: any authenticated user may read; no write policy (service_role seeds it).
create policy topics_read on public.topics for select using (auth.role() = 'authenticated');
create policy dependencies_read on public.dependencies for select using (auth.role() = 'authenticated');

-- Children: full access to household members.
create policy children_all on public.children for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Child-scoped tables: access resolved through the child's household.
create policy mastery_all on public.mastery for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy attempts_all on public.attempts for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy packets_all on public.packets for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy placements_all on public.placements for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));

-- Household-scoped tables.
create policy policies_all on public.content_policies for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy artifacts_all on public.artifacts for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));


-- ============================================================================
-- 8. FUTURE (stubbed — intentionally not created yet)
-- ============================================================================
-- Lane 2 — thematic knowledge units & the tracked exploration lane:
--   units(id, theme, standards_targets jsonb, scope jsonb, ...)
--   unit_instances(id, child_id, unit_id, status, coverage jsonb, started_at, ...)
--   exploration_log(id, child_id, query text, topic_id text, occurred_at)   -- curiosity lane (counts)
--   knowledge_callbacks(child_id, topic_id, first_seen_at)                  -- "remember when you learned…"
-- Content operations:
--   review_queue(id, content_item_id, status, reviewer, notes, created_at)
-- Billing (one subscription per household):
--   subscriptions(household_id, plan, status, current_period_end, ...)
--
-- Storage: create a private bucket (e.g. 'artifacts'); mirror the artifacts-table
-- RLS with Storage policies so a file is readable only by its household's members.
-- ============================================================================
