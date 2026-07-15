-- ============================================================================
-- Review access — let an ADMIN (you) approve/reject held lessons and pending
-- images from inside the app, without ever putting the service key in a browser.
--
-- Everything the child sees is still gated: lessons need reviewed=true, images
-- need status='approved'. This adds admin-only policies so the review screen can
-- READ the pending queue and FLIP those flags. Non-admins are unaffected.
--
-- Apply after db/images.sql. Safe to re-run.
-- ============================================================================

create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (auth.uid() = user_id);

-- Seed the owner as admin by email (no-op if the account doesn't exist yet).
insert into public.admins (user_id)
  select id from auth.users where email = 'zgoettsc@gmail.com'
  on conflict do nothing;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- content_items: admins may read the pending queue and approve/reject.
-- (The existing content_read policy still lets any family read reviewed=true.)
drop policy if exists content_admin_read on public.content_items;
create policy content_admin_read on public.content_items for select using (public.is_admin());
drop policy if exists content_admin_update on public.content_items;
create policy content_admin_update on public.content_items for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists content_admin_delete on public.content_items;
create policy content_admin_delete on public.content_items for delete using (public.is_admin());

-- lesson_images: admins may read all statuses and set approved/rejected.
drop policy if exists images_admin_read on public.lesson_images;
create policy images_admin_read on public.lesson_images for select using (public.is_admin());
drop policy if exists images_admin_update on public.lesson_images;
create policy images_admin_update on public.lesson_images for update
  using (public.is_admin()) with check (public.is_admin());
