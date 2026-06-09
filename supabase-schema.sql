-- The Gita Project — Database Schema
-- Run this in Supabase SQL editor to set up all tables

-- Postcode geocode cache
create table if not exists public.postcode_geocode (
  postcode_norm text primary key,
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz not null default now()
);

-- Organisations
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_name text not null,
  org_type text not null default 'other',
  address text,
  postcode text,
  lat double precision,
  lon double precision,
  phone text,
  contact_person_1 text,
  contact_person_2 text,
  email_1 text,
  email_2 text,
  notes text,
  deliveries_total integer not null default 0
);

create index if not exists idx_organisations_postcode on public.organisations (postcode);
create index if not exists idx_organisations_type on public.organisations (org_type);

-- Orders (funding appeals tied to an organisation)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  target_amount_pence integer not null,
  pledged_amount_pence integer not null default 0,
  status text not null default 'new' check (status in ('new', 'funded', 'delivered')),
  appeal_title text not null,
  appeal_description text,
  needed_by date
);

create index if not exists idx_orders_org on public.orders (organisation_id);
create index if not exists idx_orders_status on public.orders (status);

-- Donations
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_pence integer not null,
  donor_name text,
  donor_email text,
  gift_aid boolean not null default false,
  stripe_session_id text
);

create index if not exists idx_donations_order on public.donations (order_id);

-- Enable Row Level Security but allow public read for map data
alter table public.organisations enable row level security;
alter table public.orders enable row level security;
alter table public.donations enable row level security;
alter table public.postcode_geocode enable row level security;

-- Public can read organisations and orders (for the map)
create policy "Public can read organisations" on public.organisations
  for select using (true);

create policy "Public can read orders" on public.orders
  for select using (true);

-- Donations are private (only admin via service role)
-- No public policy needed since service role bypasses RLS

-- Function to increment deliveries_total when an order is marked delivered
create or replace function increment_deliveries(org_id uuid)
returns void as $$
begin
  update organisations
  set deliveries_total = deliveries_total + 1
  where id = org_id;
end;
$$ language plpgsql security definer;
