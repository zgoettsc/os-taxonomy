-- ============================================================================
-- Teaching sessions — the calendar/lifecycle layer.
--
-- A session is a persisted bundle of topics for a moment of teaching. Unlike the
-- ephemeral daily composition, a session is SNAPSHOTTED when the parent acts on
-- it (Start, or Prepare-&-Print ahead), so it stays stable, supports multiple
-- sessions per day (seq), print-ahead, history, and re-printing.
--
-- Lifecycle: planned → started → assessed → completed.
-- Paste into the Supabase SQL editor once. Safe to re-run (idempotent).
-- ============================================================================

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children(id) on delete cascade,
  for_date     date not null,
  seq          int  not null default 1,          -- 1,2,3… multiple sessions per day
  topics       jsonb not null default '[]',      -- snapshot: [{topicId, lane, subject, name}]
  status       text not null default 'planned'
               check (status in ('planned','started','assessed','completed')),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (child_id, for_date, seq)
);
create index if not exists sessions_child_date on public.sessions (child_id, for_date);
create index if not exists sessions_child_status on public.sessions (child_id, status);

-- Household RLS, same pattern as mastery/packets: a parent may act on sessions for
-- their own children only. Service role (never used here) bypasses.
alter table public.sessions enable row level security;
drop policy if exists sessions_all on public.sessions;
create policy sessions_all on public.sessions for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
