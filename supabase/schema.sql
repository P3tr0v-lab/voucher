-- ============================================================
-- Hotspot Voucher Manager - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SITES
-- ============================================================
create table if not exists sites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  location text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

alter table sites enable row level security;
create policy "Users manage own sites" on sites for all using (auth.uid() = user_id);

-- ============================================================
-- VOUCHER BATCHES
-- ============================================================
create table if not exists voucher_batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  site_id uuid references sites(id) on delete cascade not null,
  batch_name text not null,
  voucher_type text not null check (voucher_type in ('500', '1000')),
  quantity_received integer not null check (quantity_received > 0),
  quantity_remaining integer not null default 0,
  purchase_date date not null,
  notes text,
  is_exhausted boolean not null default false,
  created_at timestamptz default now()
);

alter table voucher_batches enable row level security;
create policy "Users manage own batches" on voucher_batches for all using (auth.uid() = user_id);

-- ============================================================
-- DAILY SALES
-- ============================================================
create table if not exists daily_sales (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  site_id uuid references sites(id) on delete cascade not null,
  date date not null,
  used_500 integer not null default 0,
  used_1000 integer not null default 0,
  revenue_500 numeric not null default 0,
  revenue_1000 numeric not null default 0,
  total_revenue numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

alter table daily_sales enable row level security;
create policy "Users manage own sales" on daily_sales for all using (auth.uid() = user_id);

-- ============================================================
-- BATCH CONSUMPTION
-- ============================================================
create table if not exists batch_consumption (
  id uuid primary key default uuid_generate_v4(),
  daily_sale_id uuid references daily_sales(id) on delete cascade not null,
  batch_id uuid references voucher_batches(id) on delete cascade not null,
  voucher_type text not null check (voucher_type in ('500', '1000')),
  quantity_consumed integer not null,
  created_at timestamptz default now()
);

alter table batch_consumption enable row level security;
create policy "Users read own consumption" on batch_consumption for all
  using (
    exists (
      select 1 from daily_sales ds
      where ds.id = batch_consumption.daily_sale_id
      and ds.user_id = auth.uid()
    )
  );

-- ============================================================
-- EXPENSES
-- ============================================================
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  site_id uuid references sites(id) on delete set null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  internet_cost numeric not null default 0,
  electricity numeric not null default 0,
  rent numeric not null default 0,
  maintenance numeric not null default 0,
  other numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "Users manage own expenses" on expenses for all using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('low_stock', 'exhausted_batch', 'no_sales', 'new_batch')),
  message text not null,
  site_id uuid references sites(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
create policy "Users manage own notifications" on notifications for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_daily_sales_date on daily_sales(date);
create index if not exists idx_daily_sales_site on daily_sales(site_id);
create index if not exists idx_daily_sales_user on daily_sales(user_id);
create index if not exists idx_batches_site on voucher_batches(site_id);
create index if not exists idx_batches_exhausted on voucher_batches(is_exhausted);

-- ============================================================
-- SAMPLE SEED DATA (optional - replace user_id with your actual user UUID)
-- ============================================================
-- After signing up, get your user ID from Supabase Auth > Users
-- Then run:
--
-- insert into sites (user_id, name, location, description) values
--   ('YOUR-USER-UUID', 'Mbezi Site', 'Mbezi Beach', 'Main hotspot location'),
--   ('YOUR-USER-UUID', 'Ubungo Site', 'Ubungo', 'Second location'),
--   ('YOUR-USER-UUID', 'Kimara Site', 'Kimara', 'Third location');
