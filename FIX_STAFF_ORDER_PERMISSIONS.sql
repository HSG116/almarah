-- ==========================================
-- 🎯 إصلاح نهائي لمشكلة عدم وصول الطلبات للجزار
-- Final Fix: Allow Staff (Butcher, Delivery, etc.) to access orders
-- ==========================================

-- 1. التأكد من أن سياسة القراءة (SELECT) في جدول الطلبات تسمح للموظفين
-- حذف السياسة القديمة وإعادة إنشائها
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can view all orders" ON public.orders;

CREATE POLICY "Staff and Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 2. التأكد من أن سياسة التحديث (UPDATE) تسمح للجزار بتغيير حالة الطلب وتعيين نفسه كجزار للطلب
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can update orders" ON public.orders;

CREATE POLICY "Staff and Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
)
WITH CHECK (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 3. السماح للموظفين برؤية تفاصيل الطلبات (Order Items)
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can view all order items" ON public.order_items;

CREATE POLICY "Staff and Admins can view all order items" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 4. التأكد من أن جدول الموظفين (staff) يسمح بالقراءة للجميع لتسهيل الربط
DROP POLICY IF EXISTS "Enable read access for all users" ON public.staff;
CREATE POLICY "Enable read access for all users" 
ON public.staff 
FOR SELECT 
USING (true);

-- ==========================================
-- ✅ يرجى نسخ هذا الكود ولصقه في Supabase SQL Editor وتشغيله (Run)
-- سيؤدي هذا للسماح للجزار برؤية الطلبات الجديدة والبدء في تجهيزها فوراً.
-- ==========================================
