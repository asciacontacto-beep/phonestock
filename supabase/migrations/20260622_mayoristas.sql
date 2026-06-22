-- Mayoristas module migration
-- Run manually in Supabase dashboard → SQL Editor → New Query

-- 1. Wholesalers directory
create table if not exists wholesalers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select org_id from public.profiles where id = auth.uid()) references organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);
alter table wholesalers enable row level security;
create policy "org members see their wholesalers"
  on wholesalers for all
  using (org_id = (select org_id from profiles where id = auth.uid()))
  with check (org_id = (select org_id from profiles where id = auth.uid()));

-- 2. Wholesale orders
create table if not exists wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select org_id from public.profiles where id = auth.uid()) references organizations(id) on delete cascade,
  wholesaler_id uuid not null references wholesalers(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','confirmed','delivered','cancelled')),
  currency text not null default 'USD' check (currency in ('ARS','USD')),
  notes text,
  created_at timestamptz default now()
);
alter table wholesale_orders enable row level security;
create policy "org members see their orders"
  on wholesale_orders for all
  using (org_id = (select org_id from profiles where id = auth.uid()))
  with check (org_id = (select org_id from profiles where id = auth.uid()));

-- 3. Order line items
create table if not exists wholesale_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references wholesale_orders(id) on delete cascade,
  stock_id uuid references stock(id) on delete set null,
  brand text not null,
  model text not null,
  storage text,
  color text,
  qty int not null default 1,
  unit_price numeric not null,
  is_backorder boolean not null default false
);
alter table wholesale_order_items enable row level security;
create policy "org members see their order items"
  on wholesale_order_items for all
  using (
    order_id in (
      select id from wholesale_orders
      where org_id = (select org_id from profiles where id = auth.uid())
    )
  )
  with check (
    order_id in (
      select id from wholesale_orders
      where org_id = (select org_id from profiles where id = auth.uid())
    )
  );

-- 4. Payments
create table if not exists wholesale_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select org_id from public.profiles where id = auth.uid()) references organizations(id) on delete cascade,
  order_id uuid not null references wholesale_orders(id) on delete cascade,
  wholesaler_id uuid not null references wholesalers(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  method text not null default 'cash' check (method in ('cash','transfer','card')),
  notes text,
  created_at timestamptz default now()
);
alter table wholesale_payments enable row level security;
create policy "org members see their payments"
  on wholesale_payments for all
  using (org_id = (select org_id from profiles where id = auth.uid()))
  with check (org_id = (select org_id from profiles where id = auth.uid()));
