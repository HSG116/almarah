-- ====================================
-- حل مشكلة التكرار اللانهائي في سياسات users
-- Fix Infinite Recursion in User Policies
-- ====================================

-- 1. حذف جميع سياسات users القديمة
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 2. إنشاء سياسات جديدة بدون تكرار لا نهائي
-- السياسة العامة: السماح بالقراءة للجميع (معتمدة على RLS الأساسي)
CREATE POLICY "Enable read access for authenticated users" 
ON public.users
FOR SELECT 
USING (true);

-- السياسة: المستخدم يمكنه تحديث بروفايله الخاص فقط
CREATE POLICY "Users can update own profile" 
ON public.users
FOR UPDATE 
USING (auth.uid() = id);

-- السياسة: المستخدمون يمكنهم إدراج بياناتهم عند التسجيل
CREATE POLICY "Enable insert for authentication" 
ON public.users
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. حذف سياسات الجداول الأخرى التي تعتمد على users وإعادة إنشائها
-- Categories policies
DROP POLICY IF EXISTS "Public read access categories" ON public.categories;
DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;

CREATE POLICY "Public read access categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access categories" 
ON public.categories 
FOR ALL 
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

-- Products policies  
DROP POLICY IF EXISTS "Public read access products" ON public.products;
DROP POLICY IF EXISTS "Public read access" ON public.products;
DROP POLICY IF EXISTS "Admin insert products" ON public.products;
DROP POLICY IF EXISTS "Admin insert access" ON public.products;
DROP POLICY IF EXISTS "Admin update products" ON public.products;
DROP POLICY IF EXISTS "Admin update access" ON public.products;
DROP POLICY IF EXISTS "Admin delete products" ON public.products;
DROP POLICY IF EXISTS "Admin delete access" ON public.products;

CREATE POLICY "Public read access products" 
ON public.products
FOR SELECT 
USING (true);

CREATE POLICY "Admin insert products" 
ON public.products
FOR INSERT 
WITH CHECK (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "Admin update products" 
ON public.products
FOR UPDATE 
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "Admin delete products" 
ON public.products
FOR DELETE 
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.orders;

CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true);

CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update orders" 
ON public.orders 
FOR UPDATE 
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

-- Order Items policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.order_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.order_items;

CREATE POLICY "Users can view own order items" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "Users can create order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- ====================================
-- ✅ تم إصلاح مشكلة التكرار اللانهائي!
-- ====================================
