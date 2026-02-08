-- ====================================
-- تحديث قاعدة البيانات - آمن للتشغيل المتكرر
-- للملحمة - نظام إدارة الطلبات
-- ====================================

-- 1. حذف الـ Policies القديمة (إن وجدت)
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Admins can view all profiles" on public.users;
drop policy if exists "Public read access categories" on public.categories;
drop policy if exists "Admin full access categories" on public.categories;
drop policy if exists "Public read access products" on public.products;
drop policy if exists "Public read access" on public.products;
drop policy if exists "Admin insert access" on public.products;
drop policy if exists "Admin insert products" on public.products;
drop policy if exists "Admin update access" on public.products;
drop policy if exists "Admin update products" on public.products;
drop policy if exists "Admin delete access" on public.products;
drop policy if exists "Admin delete products" on public.products;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Admin view all orders" on public.orders;
drop policy if exists "Admin update orders" on public.orders;
drop policy if exists "Users can view own order items" on public.order_items;
drop policy if exists "Users can create order items" on public.order_items;
drop policy if exists "Admin view all order items" on public.order_items;

-- 2. حذف الـ Triggers القديمة
drop trigger if exists users_updated_at on public.users;
drop trigger if exists orders_updated_at on public.orders;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_confirm on auth.users;

-- 3. حذف الـ Functions القديمة
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.auto_confirm_user() cascade;

-- 4. إضافة أعمدة جديدة للجداول الموجودة
-- (إذا كانت موجودة سيتجاهل الخطأ)
alter table public.users add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.users add column if not exists address text;
alter table public.users add column if not exists city text;
alter table public.users add column if not exists district text;
alter table public.users add column if not exists street text;
alter table public.users add column if not exists building text;
alter table public.users add column if not exists landmark text;
alter table public.users add column if not exists gps_lat real;
alter table public.users add column if not exists gps_lng real;

alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.order_items add column if not exists product_name text;

-- 5. إنشاء الـ Functions الجديدة
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(excluded.username, public.users.username),
    phone = coalesce(excluded.phone, public.users.phone);
  return new;
end;
$$ language plpgsql security definer;

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

-- دالة آمنة للتحقق من الأدمن (لتجنب التكرار اللانهائي)
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. إنشاء الـ Triggers الجديدة
create trigger users_updated_at before update on public.users
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_created_confirm
  after insert on auth.users
  for each row execute function public.auto_confirm_user();

-- 7. إنشاء الـ Policies الجديدة

-- Users policies
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.users
  for select using (public.check_is_admin(auth.uid()));

-- Categories policies
create policy "Public read access categories" on public.categories 
  for select using (true);

create policy "Admin full access categories" on public.categories 
  for all using (public.check_is_admin(auth.uid()));

-- Products policies
create policy "Public read access products" on public.products
  for select using (true);

create policy "Admin insert products" on public.products
  for insert with check (public.check_is_admin(auth.uid()));

create policy "Admin update products" on public.products
  for update using (public.check_is_admin(auth.uid()));

create policy "Admin delete products" on public.products
  for delete using (public.check_is_admin(auth.uid()));

-- Orders policies
create policy "Users can view own orders" on public.orders 
  for select using (auth.uid() = user_id);

create policy "Users can create orders" on public.orders 
  for insert with check (auth.uid() = user_id);

create policy "Admin view all orders" on public.orders 
  for select using (public.check_is_admin(auth.uid()));

create policy "Admin update orders" on public.orders 
  for update using (public.check_is_admin(auth.uid()));

-- Order Items policies
create policy "Users can view own order items" on public.order_items 
  for select using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "Users can create order items" on public.order_items 
  for insert with check (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "Admin view all order items" on public.order_items 
  for select using (public.check_is_admin(auth.uid()));

-- ====================================
-- ✅ تم التحديث بنجاح!
-- ====================================

-- 8. تحديث موضع الصورة للمنتجات المحددة
-- لإظهار الحيوان من الأعلى بدلاً من الرجلين
UPDATE public.products
SET image_object_position = 'object-top'
WHERE name = 'خروف حري كامل';

UPDATE public.products
SET image_object_position = 'object-top'
WHERE name = 'تيس بلدي محايل';

-- 9. تحديث قائمة منتجات الخروف
-- حذف المنتجات غير المتوفرة
DELETE FROM public.products WHERE name = 'حاشي لباني (بالكيلو)';
DELETE FROM public.products WHERE name = 'عجل بلدي رضيع (بالكيلو)';

-- إصلاح خطأ التكرار (42P10):
-- 1. حذف المنتجات المكررة (نحتفظ بالأحدث)
DELETE FROM public.products a USING public.products b
WHERE a.id < b.id AND a.name = b.name;

-- 2. إضافة قيد "فريد" (Unique) على عمود الاسم لتمكين ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key') THEN
        ALTER TABLE public.products ADD CONSTRAINT products_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. إضافة المنتجات المفقودة (مع التأكد من عدم التكرار)
INSERT INTO public.products (name, category_id, price, unit, image, description, badge, size, weight, is_featured, image_object_position)
VALUES 
('خروف نعيمي متوسط', 'lamb', 1200.00, 'ذبيحة', '/images/lamb/خروف نعيمي متوسط.png', 'خروف نعيمي بلدي حجم متوسط، مثالي للعائلة الصغيرة.', NULL, 'متوسط', '7-9 كجم', false, NULL),
('نعيمي لباني', 'lamb', 900.00, 'ذبيحة', '/images/lamb/نعيمي لباني.png', 'خروف نعيمي صغير (لباني)، لحم طري جداً ولذيذ.', 'لباني', 'صغير', '5-7 كجم', true, NULL)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  image = EXCLUDED.image,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  is_featured = EXCLUDED.is_featured;
