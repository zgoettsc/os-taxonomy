-- ============================================================================
-- Lesson picture-card images.
--
-- Each grounded lesson has student.examples[] — "picture cards" with a `show`
-- description ("a tall tree next to a small flower"). This table attaches ONE
-- resolved image per card slot, produced by pipeline/resolve-images.mjs:
--   • kind 'photo'        → a real, correctly-licensed photo of a named thing
--                           (Openverse/Wikimedia/NASA), mirrored to Storage.
--   • kind 'illustration' → an AI illustration in a locked house style
--                           (single subject, plain background, ink-light).
--
-- Review-gated like everything else the child sees: only status='approved' rows
-- are readable by the app (anon). Apply once; safe to re-run.
--
-- Storage: images live in a PUBLIC bucket 'lesson-images'. The pipeline creates
-- it via the Storage API on first run; you can also create it in the dashboard
-- (Storage → New bucket → name 'lesson-images', Public).
-- ============================================================================

create table if not exists public.lesson_images (
  id           uuid primary key default gen_random_uuid(),
  topic_id     text not null,
  slot         int  not null default 0,          -- which student.examples[] index
  kind         text not null default 'illustration' check (kind in ('illustration','photo')),
  status       text not null default 'approved'   check (status in ('pending','approved','rejected')),
  source       text not null,                     -- 'ai' | 'openverse' | 'wikimedia' | 'nasa' | …
  prompt       text,                              -- AI prompt, or the photo search query
  url          text not null,                     -- public URL the app renders
  storage_path text,                              -- path within the bucket (if mirrored)
  alt          text,                              -- accessible one-line description
  license      text,                              -- photo license (e.g. 'CC0','CC BY 4.0','Public Domain')
  attribution  text,                              -- required credit line for photos
  source_url   text,                              -- landing page of the original
  width        int,
  height       int,
  created_at   timestamptz not null default now(),
  unique (topic_id, slot)
);
create index if not exists lesson_images_topic on public.lesson_images(topic_id);

alter table public.lesson_images enable row level security;
drop policy if exists lesson_images_read on public.lesson_images;
-- Only approved images reach a child. Writes happen with the service role
-- (pipeline), which bypasses RLS.
create policy lesson_images_read on public.lesson_images
  for select using (status = 'approved');
