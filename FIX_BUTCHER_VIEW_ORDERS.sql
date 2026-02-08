-- ==========================================
-- 🎯 إصلاح شامل لمشكلة عدم ظهور الطلبات للجزارين
-- Complete Fix: Allow Butchers to see ALL orders
-- ==========================================

-- 1. حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can update orders" ON public.orders;

-- 2. إنشاء سياسة جديدة للقراءة (SELECT) - تسمح للجميع برؤية الطلبات
CREATE POLICY "Allow staff to view all orders" 
ON public.orders 
FOR SELECT 
USING (
  -- العميل يرى طلباته فقط
  auth.uid() = user_id 
  -- المسؤولون يرون كل شيء
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  -- الموظفون (جزار، توصيل، محاسب، إلخ) يرون كل الطلبات
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 3. إنشاء سياسة للتحديث (UPDATE) - تسمح للموظفين بتحديث الطلبات
CREATE POLICY "Allow staff to update orders" 
ON public.orders 
FOR UPDATE 
USING (
  -- المسؤولون يحدثون كل شيء
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  -- الموظفون يحدثون الطلبات
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
)
WITH CHECK (
  (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 4. السماح للموظفين برؤية Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can view all order items" ON public.order_items;

CREATE POLICY "Allow staff to view all order items" 
ON public.order_items 
FOR SELECT 
USING (
  -- العميل يرى items طلباته
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  -- المسؤولون يرون كل شيء
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1) = true
  -- الموظفون يرون كل items
  OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('butcher', 'manager', 'delivery', 'accountant', 'support', 'designer')
);

-- 5. التأكد من تفعيل RLS على الجداول
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 6. التحقق من أن جدول staff يسمح بالقراءة للجميع
DROP POLICY IF EXISTS "Enable read access for all users" ON public.staff;
CREATE POLICY "Enable read access for all users" 
ON public.staff 
FOR SELECT 
USING (true);

-- ==========================================
-- 🧪 اختبار: بعد تنفيذ السكريبت أعلاه، نفّذ هذا:
-- ==========================================

-- تحقق من عدد الطلبات الموجودة
-- SELECT COUNT(*) as total_orders FROM orders;

-- تحقق من الطلبات الجديدة (pending)
-- SELECT id, status, customer_name, created_at FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

-- تحقق من السياسات الموجودة
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('orders', 'order_items') ORDER BY tablename, policyname;

-- ==========================================
-- ✅ بعد التنفيذ:
-- 1. قم بتحديث صفحة الجزار (F5)
-- 2. يجب أن ترى الطلبات الجديدة فوراً
-- ==========================================
