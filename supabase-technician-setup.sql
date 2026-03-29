-- ============================================
-- AlignSpecDB — Technician App Tables
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > paste > Run)
-- ============================================

-- 1. Customers table
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text default '',
  phone text default '',
  created_at timestamptz default now()
);

alter table customers enable row level security;
create policy "Allow all access" on customers
  for all using (true) with check (true);

create index if not exists idx_customers_name on customers (name);
create index if not exists idx_customers_email on customers (email);

-- 2. Vehicles table
create table if not exists vehicles (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  year text not null,
  make text not null,
  model text not null,
  trim text default '',
  vin text default '',
  license_plate text default '',
  mileage text default '',
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Allow all access" on vehicles
  for all using (true) with check (true);

create index if not exists idx_vehicles_customer on vehicles (customer_id);

-- 3. Alignment reports table
create table if not exists alignment_reports (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  technician_name text not null,
  oem_spec jsonb not null default '{}',
  before_readings jsonb not null default '{}',
  after_readings jsonb not null default '{}',
  notes text default '',
  status text default 'in_progress',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table alignment_reports enable row level security;
create policy "Allow all access" on alignment_reports
  for all using (true) with check (true);

create index if not exists idx_reports_customer on alignment_reports (customer_id);
create index if not exists idx_reports_vehicle on alignment_reports (vehicle_id);
create index if not exists idx_reports_technician on alignment_reports (technician_name);
create index if not exists idx_reports_status on alignment_reports (status);
create index if not exists idx_reports_created on alignment_reports (created_at);

-- Enable realtime for all new tables
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table vehicles;
alter publication supabase_realtime add table alignment_reports;

-- Done! Technician app tables are ready.
