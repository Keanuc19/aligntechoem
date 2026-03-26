-- ============================================
-- AlignSpecDB — Supabase Table Setup
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > paste > Run)
-- ============================================

-- 1. Create the table
create table if not exists alignment_specs (
  id uuid default gen_random_uuid() primary key,
  year text not null,
  make text not null,
  model text not null,
  trim text default '',
  notes text default '',
  spec_data jsonb not null default '{}',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (required by Supabase)
alter table alignment_specs enable row level security;

-- 3. Allow anyone with the anon key to read, insert, update, delete
--    (This is fine for a small team tool — no login required)
create policy "Allow all access" on alignment_specs
  for all
  using (true)
  with check (true);

-- 4. Enable realtime (so all technicians see updates live)
alter publication supabase_realtime add table alignment_specs;

-- 5. Create indexes for fast searching
create index if not exists idx_specs_make on alignment_specs (make);
create index if not exists idx_specs_year on alignment_specs (year);
create index if not exists idx_specs_model on alignment_specs (model);

-- Done! Your table is ready.
