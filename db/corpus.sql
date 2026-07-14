-- ============================================================================
-- Corpus store for "download-a-library" sources (Core Knowledge, CK-12, OpenStax).
-- Paste into the Supabase SQL editor once. Safe to re-run (idempotent).
--
-- Passages are ingested by pipeline/ingest.mjs and retrieved at generation time
-- via the hybrid match_source_documents() function below (full-text + vector,
-- fused with Reciprocal Rank Fusion). Embedding dim = 1024 (Voyage voyage-3.5-lite).
-- ============================================================================

create extension if not exists vector;

create table if not exists public.source_documents (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,                 -- 'coreknowledge' | 'ck12' | 'openstax'
  title        text,
  url          text,                          -- citation link (the exact document)
  grade        text,
  subjects     text[] not null default '{}',
  text         text not null,                 -- the passage
  content_hash text,
  fts          tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || text)) stored,
  embedding    vector(1024),                  -- null until embedded (FTS still works)
  created_at   timestamptz not null default now()
);

create index if not exists source_documents_fts on public.source_documents using gin (fts);
create index if not exists source_documents_src on public.source_documents (source);
create index if not exists source_documents_vec on public.source_documents using hnsw (embedding vector_cosine_ops);
-- Idempotent, incremental ingestion: upsert on (source, content_hash) so subject
-- slices and re-runs accumulate without wiping, and duplicate passages are skipped.
create unique index if not exists source_documents_uniq on public.source_documents (source, content_hash);

alter table public.source_documents enable row level security;
-- Global, service-role-managed. No family read/write policy: only the server
-- (service_role, which bypasses RLS) ingests and retrieves. Enabling RLS with no
-- policy denies anon/authenticated by default, which is what we want.

-- Hybrid retrieval: top FTS matches + top vector matches, fused by Reciprocal
-- Rank Fusion (k=60). query_embedding may be null → FTS-only; query_text may be
-- null → vector-only. Returns the best `match_count` passages for one source.
create or replace function public.match_source_documents(
  query_text text,
  query_embedding vector(1024),
  src text,
  match_count int default 3
) returns table (id uuid, text text, title text, url text, grade text, score real)
language sql stable as $$
  with fts as (
    select d.id, row_number() over (order by ts_rank(d.fts, websearch_to_tsquery('english', query_text)) desc) as r
    from public.source_documents d
    where d.source = src
      and query_text is not null
      and d.fts @@ websearch_to_tsquery('english', query_text)
    limit 40
  ),
  vec as (
    select d.id, row_number() over (order by d.embedding <=> query_embedding) as r
    from public.source_documents d
    where d.source = src
      and query_embedding is not null
      and d.embedding is not null
    order by d.embedding <=> query_embedding
    limit 40
  )
  select d.id, d.text, d.title, d.url, d.grade,
         (coalesce(1.0/(60 + fts.r), 0) + coalesce(1.0/(60 + vec.r), 0))::real as score
  from public.source_documents d
  left join fts on fts.id = d.id
  left join vec on vec.id = d.id
  where fts.id is not null or vec.id is not null
  order by score desc
  limit match_count;
$$;

grant execute on function public.match_source_documents(text, vector, text, int) to service_role, authenticated;
