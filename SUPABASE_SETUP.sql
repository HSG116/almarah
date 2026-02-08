-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table (mirroring auth.users but with application specific data)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text,
  phone text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.users enable row level security;

create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.users
  for select using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

-- Function to handle new user signup (optional, if you want automatic entry)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, is_admin)
  values (new.id, new.email, new.raw_user_meta_data->>'username', false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- Products Table
create table if not exists public.products (
  id serial primary key,
  name text not null,
  category_id text not null, -- references categories(id)
  price real not null,
  unit text not null,
  image text not null,
  description text not null,
  badge text,
  size text,
  weight text,
  is_featured boolean default false,
  image_object_position text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.products enable row level security;

create policy "Public read access" on public.products
  for select using (true);

create policy "Admin insert access" on public.products
  for insert with check (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

create policy "Admin update access" on public.products
  for update using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

create policy "Admin delete access" on public.products
  for delete using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

-- Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text not null,
  image text
);

alter table public.categories enable row level security;
create policy "Public read access categories" on public.categories for select using (true);
create policy "Admin full access categories" on public.categories for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- Orders Table
create table if not exists public.orders (
  id serial primary key,
  user_id uuid references public.users(id),
  total real not null,
  status text not null default 'pending',
  address text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can create orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admin view all orders" on public.orders for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- Order Items
create table if not exists public.order_items (
  id serial primary key,
  order_id integer references public.orders(id),
  product_id integer references public.products(id),
  quantity integer not null,
  price real not null,
  cutting text,
  packaging text,
  notes text
);

alter table public.order_items enable row level security;
create policy "Users can view own order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Users can create order items" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Admin view all order items" on public.order_items for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- Storage bucket setup (Pseudo-code, must be done in dashboard usually, or via API if allowed)
-- insert into storage.buckets (id, name, public) values ('products', 'products', true);
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'products' );
-- create policy "Admin Upload" on storage.objects for insert with check ( bucket_id = 'products' and exists (select 1 from public.users where id = auth.uid() and is_admin = true) );
