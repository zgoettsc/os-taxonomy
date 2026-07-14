-- ============================================================================
-- Unlimited practice bank. Auto-checkable practice items (multiple-choice and
-- exact fill-in) generated on demand for a topic, GROUNDED in that topic's already
-- stored citations. Math needs none of this — it's code-generated, correct by
-- construction, in the app. This table backs the KNOWLEDGE topics.
--
-- Paste into the Supabase SQL editor once. Safe to re-run (idempotent).
-- ============================================================================

create table if not exists public.practice_items (
  id           uuid primary key default gen_random_uuid(),
  topic_id     text not null,
  kind         text not null check (kind in ('mcq','short')),   -- auto-checkable only
  prompt       text not null,
  choices      jsonb,          -- for mcq: array of strings
  answer_index int,            -- for mcq: index into choices
  answer       text,           -- for short: the exact expected answer (+ acceptable notes)
  content_hash text not null,  -- dedupe: sha of topic_id + normalized prompt
  source       text not null default 'llm',   -- 'llm' (grounded) | 'code' (unused here)
  created_at   timestamptz not null default now()
);

-- One row per distinct prompt per topic → re-generating never stores duplicates.
create unique index if not exists practice_items_uniq  on public.practice_items (topic_id, content_hash);
create index        if not exists practice_items_topic on public.practice_items (topic_id);

-- The app (anon/authenticated) reads the bank to build fresh worksheets; only the
-- service role (the generation Action) writes. RLS on, permissive read, no write policy.
alter table public.practice_items enable row level security;
drop policy if exists practice_read on public.practice_items;
create policy practice_read on public.practice_items for select using (true);
