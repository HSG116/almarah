-- ====================================
-- إعداد قاعدة البيانات الكامل
-- للملحمة - نظام إدارة الطلبات
-- ====================================

-- 1. تمكين الإضافات المطلوبة
create extension if not exists "uuid-ossp";

-- 2. جدول المستخدمين
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  email text not null,
  phone text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- تمكين RLS للمستخدمين
alter table public.users enable row level security;

-- سياسات الأمان للمستخدمين
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

-- 3. جدول الفئات
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text not null,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.categories enable row level security;
create policy "Public read access categories" on public.categories for select using (true);
create policy "Admin full access categories" on public.categories for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- 4. جدول المنتجات
create table if not exists public.products (
  id serial primary key,
  name text not null,
  category_id text not null references public.categories(id),
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

create policy "Public read access products" on public.products
  for select using (true);

create policy "Admin insert products" on public.products
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin update products" on public.products
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin delete products" on public.products
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 5. جدول الطلبات
create table if not exists public.orders (
  id serial primary key,
  user_id uuid references public.users(id) not null,
  total real not null,
  status text not null default 'pending',
  address text not null,
  customer_name text not null,
  customer_phone text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;

create policy "Users can view own orders" on public.orders 
  for select using (auth.uid() = user_id);

create policy "Users can create orders" on public.orders 
  for insert with check (auth.uid() = user_id);

create policy "Admin view all orders" on public.orders 
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin update orders" on public.orders 
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 6. جدول عناصر الطلبات
create table if not exists public.order_items (
  id serial primary key,
  order_id integer references public.orders(id) on delete cascade not null,
  product_id integer references public.products(id) not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  price real not null,
  cutting text,
  packaging text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.order_items enable row level security;

create policy "Users can view own order items" on public.order_items 
  for select using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "Users can create order items" on public.order_items 
  for insert with check (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "Admin view all order items" on public.order_items 
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 7. وظيفة لتحديث updated_at تلقائياً
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers لـ updated_at
create trigger users_updated_at before update on public.users
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

-- 8. وظيفة لإنشاء مستخدم جديد تلقائياً
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, phone, is_admin)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger لإنشاء مستخدم تلقائياً
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. تعطيل تأكيد البريد الإلكتروني (اختياري)
-- يجب تنفيذه في Dashboard > Authentication > Settings
-- أو استخدام هذا الـ Trigger:

create or replace function public.auto_confirm_user()
returns trigger as $$
begin
  update auth.users 
  set email_confirmed_at = now()
  where id = new.id 
  and email_confirmed_at is null;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_confirm on auth.users;
create trigger on_auth_user_created_confirm
  after insert on auth.users
  for each row execute function public.auto_confirm_user();

-- 10. إنشاء مستخدم Admin افتراضي (اختياري)
-- غيّر البريد وكلمة المرور
-- insert into auth.users (email, encrypted_password, email_confirmed_at)
-- values ('admin@example.com', crypt('password123', gen_salt('bf')), now());

-- update public.users set is_admin = true where email = 'admin@example.com';

-- ====================================
-- تم الإعداد بنجاح! ✅
-- ====================================
