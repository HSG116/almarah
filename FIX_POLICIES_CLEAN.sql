-- ====================================
-- حل بسيط ومباشر: حذف كل السياسات وإعادة إنشائها
-- Simple Fix: Drop all policies and recreate
-- ====================================

-- 🔴 الخطوة 1: حذف جميع السياسات القديمة من كل الجداول
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- حذف جميع سياسات users
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
    END LOOP;

    -- حذف جميع سياسات categories
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', policy_record.policyname);
    END LOOP;

    -- حذف جميع سياسات products
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', policy_record.policyname);
    END LOOP;

    -- حذف جميع سياسات orders
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', policy_record.policyname);
    END LOOP;

    -- حذف جميع سياسات order_items
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'order_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', policy_record.policyname);
    END LOOP;
END $$;

-- ✅ الخطوة 2: إنشاء سياسات جديدة بدون infinite recursion

-- Users policies
CREATE POLICY "Enable read access for authenticated users" 
ON public.users
FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.users
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authentication" 
ON public.users
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Categories policies
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
-- ✅ تم! الآن جرب الموقع
-- ====================================
