create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text,
  ml integer not null default 0,
  stock integer not null default 0,
  stock_min integer not null default 5,
  cost_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ativo',
  risk text not null default 'nunca_deu_problema',
  origin text not null default 'direto',
  referred_by text,
  contact text,
  address text,
  city text,
  neighborhood text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  quantity integer not null default 1,
  payment_method text not null,
  installments integer not null default 1,
  deposit numeric(12,2) not null default 0,
  unit_sale_price numeric(12,2) not null default 0,
  unit_cost_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  due_dates text,
  sold_at date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  url text not null unique,
  image_url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- Triggers
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute procedure public.touch_updated_at();

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at before update on public.customers
for each row execute procedure public.touch_updated_at();

-- RLS: Require authenticated users
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.news_articles enable row level security;

-- Authenticated-only policies (replaces open "public" policies)
drop policy if exists "public products" on public.products;
create policy "authenticated products" on public.products
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "public customers" on public.customers;
create policy "authenticated customers" on public.customers
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "public sales" on public.sales;
create policy "authenticated sales" on public.sales
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "public news_articles" on public.news_articles;
create policy "authenticated news_articles" on public.news_articles
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
