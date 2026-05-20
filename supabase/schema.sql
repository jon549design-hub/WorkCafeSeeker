-- WorkCafeSeeker schema
-- Run this in the Supabase SQL Editor. Safe to re-run; uses IF NOT EXISTS.

-- Shared cafe data, keyed by Google Place ID.
create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  hours_json jsonb,
  google_rating numeric,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists cafes_place_id_idx on public.cafes (google_place_id);
create index if not exists cafes_location_idx on public.cafes (lat, lng);

-- Per-user visits with quick signals + a freeform note.
-- wifi / outlets are yes-no (most recent visit wins when summarizing).
-- seating / busy are 1–5 (averaged across visits).
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  cafe_id uuid not null references public.cafes on delete cascade,
  visited_at timestamptz default now(),
  has_wifi boolean,
  has_outlets boolean,
  rating_seating smallint check (rating_seating between 1 and 5),
  rating_busy smallint check (rating_busy between 1 and 5),
  note_text text,
  created_at timestamptz default now()
);
create index if not exists visits_user_cafe_idx on public.visits (user_id, cafe_id);
create index if not exists visits_user_visited_at_idx on public.visits (user_id, visited_at desc);

-- Photos attached to a visit. Files live in Supabase Storage; this row holds the storage path.
create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null,
  created_at timestamptz default now()
);
create index if not exists visit_photos_visit_idx on public.visit_photos (visit_id);

-- User-defined tags (e.g. "morning spot", "deep work").
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text not null,
  created_at timestamptz default now(),
  unique (user_id, label)
);

create table if not exists public.visit_tags (
  visit_id uuid not null references public.visits on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  primary key (visit_id, tag_id)
);

-- Row Level Security
alter table public.cafes enable row level security;
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.tags enable row level security;
alter table public.visit_tags enable row level security;

-- Cafes are readable by anyone authenticated; anyone authenticated can insert/upsert.
drop policy if exists "cafes_read_all" on public.cafes;
create policy "cafes_read_all" on public.cafes for select to authenticated using (true);

drop policy if exists "cafes_insert_authenticated" on public.cafes;
create policy "cafes_insert_authenticated" on public.cafes for insert to authenticated with check (true);

drop policy if exists "cafes_update_authenticated" on public.cafes;
create policy "cafes_update_authenticated" on public.cafes for update to authenticated using (true);

-- Visits / photos / tags: owner-only.
drop policy if exists "visits_owner_all" on public.visits;
create policy "visits_owner_all" on public.visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "visit_photos_owner_all" on public.visit_photos;
create policy "visit_photos_owner_all" on public.visit_photos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tags_owner_all" on public.tags;
create policy "tags_owner_all" on public.tags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "visit_tags_owner_all" on public.visit_tags;
create policy "visit_tags_owner_all" on public.visit_tags for all to authenticated
  using (
    exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid())
  );

-- Storage bucket policy for cafe-photos.
-- Create the bucket "cafe-photos" via the Supabase UI first.
-- Then run the following so each user can only read/write under their own user_id prefix:
--
-- create policy "cafe_photos_owner_read" on storage.objects for select to authenticated
--   using (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "cafe_photos_owner_write" on storage.objects for insert to authenticated
--   with check (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "cafe_photos_owner_delete" on storage.objects for delete to authenticated
--   using (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
