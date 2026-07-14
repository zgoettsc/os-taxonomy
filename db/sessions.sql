-- ============================================================================
-- Teaching sessions — the plan + the record.
--
-- A session is a persisted bundle of topics. It lives in one of two worlds:
--   • the QUEUE  — status 'planned', no date, ordered by queue_pos. This is the
--                  forward-looking plan. "Prepare ahead" appends to it.
--   • the RECORD — once you Start a planned session it is stamped with for_date =
--                  the day you taught it and flips to 'started'; assessing it
--                  completes it. The calendar/history is built from for_date, so
--                  it is a true log of what happened and when (reprintable).
--
-- Lifecycle: planned (queued, no date) → started (dated today) → completed.
-- Paste into the Supabase SQL editor once. Safe to re-run (idempotent), and it
-- migrates an older day-based sessions table in place.
-- ============================================================================

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children(id) on delete cascade,
  topics       jsonb not null default '[]',      -- snapshot: [{topicId, lane, subject, name}]
  status       text not null default 'planned',  -- planned | started | completed
  queue_pos    int  not null default 0,          -- order within the planned queue
  for_date     date,                             -- null while queued; set when taught
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- --- migrate an older (day/seq, NOT NULL for_date) sessions table if present ---
alter table public.sessions add column if not exists queue_pos int not null default 0;
alter table public.sessions alter column for_date drop not null;
alter table public.sessions drop constraint if exists sessions_child_id_for_date_seq_key;
alter table public.sessions drop column if exists seq;
alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions add  constraint sessions_status_check
  check (status in ('planned','started','completed'));

create index if not exists sessions_child_status on public.sessions (child_id, status);
create index if not exists sessions_child_date   on public.sessions (child_id, for_date);
create index if not exists sessions_child_queue  on public.sessions (child_id, queue_pos);

-- Household RLS, same pattern as mastery/packets: a parent may act on sessions for
-- their own children only. Service role (never used here) bypasses.
alter table public.sessions enable row level security;
drop policy if exists sessions_all on public.sessions;
create policy sessions_all on public.sessions for all
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
