-- ==========================================
-- 🔍 تشخيص شامل لمشكلة عدم ظهور الطلبات
-- Complete Diagnostics for Butcher Orders Issue
-- ==========================================

-- =====================
-- STEP 1: هل توجد طلبات في قاعدة البيانات؟
-- =====================
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders
FROM orders;

-- النتيجة المتوقعة: يجب أن ترى total_orders > 0

-- =====================
-- STEP 2: عرض آخر 10 طلبات مع تفاصيلها
-- =====================
SELECT 
    id,
    status,
    customer_name,
    customer_phone,
    total,
    butcher_staff_id,
    driver_staff_id,
    created_at,
    user_id
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- النتيجة المتوقعة: يجب أن ترى قائمة بالطلبات

-- =====================
-- STEP 3: هل يوجد موظفين جزارين؟
-- =====================
SELECT 
    s.id as staff_id,
    s.name as staff_name,
    s.role,
    s.is_active,
    u.id as user_id,
    u.username,
    u.role as user_role,
    u.is_banned
FROM staff s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.role = 'butcher'
ORDER BY s.id;

-- النتيجة المتوقعة: يجب أن ترى على الأقل جزار واحد
-- تحقق من: is_active = true AND is_banned = false

-- =====================
-- STEP 4: تحقق من RLS Policies على جدول orders
-- =====================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;

-- النتيجة المتوقعة: يجب أن ترى policies تسمح للـ staff برؤية الطلبات

-- =====================
-- STEP 5: تحقق من RLS Policies على جدول order_items
-- =====================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;

-- =====================
-- STEP 6: هل RLS مفعّل على الجداول؟
-- =====================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items', 'staff')
ORDER BY tablename;

-- النتيجة المتوقعة: rowsecurity = true

-- =====================
-- STEP 7: تحقق من العلاقات (Foreign Keys)
-- =====================
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='orders';

-- =====================
-- STEP 8: محاولة query كما يفعله الكود
-- =====================
-- هذا يحاكي ما يفعله الكود في dashboard.tsx
SELECT 
    o.*,
    (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as order_items
FROM orders o
ORDER BY o.created_at DESC
LIMIT 10;

-- =====================
-- STEP 9: تفاصيل آخر طلب تم إنشاؤه
-- =====================
WITH latest_order AS (
    SELECT * FROM orders ORDER BY created_at DESC LIMIT 1
)
SELECT 
    lo.*,
    u.username as customer_username,
    u.role as customer_role
FROM latest_order lo
LEFT JOIN users u ON lo.user_id = u.id;

-- =====================
-- STEP 10: هل توجد order_items للطلبات؟
-- =====================
SELECT 
    o.id as order_id,
    o.status,
    o.customer_name,
    COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.status, o.customer_name
ORDER BY o.created_at DESC
LIMIT 10;

-- ==========================================
-- 📝 ملاحظات:
-- ==========================================
-- 1. نفّذ كل استعلام على حدة
-- 2. لاحظ النتائج وابحث عن أي شيء غير طبيعي
-- 3. إذا كان total_orders = 0 في STEP 1، فالمشكلة أنه لا توجد طلبات أصلاً
-- 4. إذا كان STEP 3 يُرجع 0 rows، فالمشكلة أنه لا يوجد موظف جزار
-- 5. إذا كانت is_banned = true في STEP 3، فالجزار محظور
-- 6. إذا كانت STEP 4 لا تُظهر أي policies، فالمشكلة في الصلاحيات

-- ==========================================
-- 🔧 إصلاحات سريعة
-- ==========================================

-- إذا لم يكن هناك طلبات، أنشئ طلب تجريبي:
/*
INSERT INTO orders (user_id, total, status, customer_name, customer_phone, address)
VALUES (
    (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
    100.50,
    'pending',
    'عميل تجريبي',
    '0501234567',
    'الرياض - حي النخيل'
);
*/

-- إذا لم يكن هناك جزار، قم بتحديث دور مستخدم موجود:
/*
UPDATE users 
SET role = 'butcher' 
WHERE username = 'اسم-المستخدم-هنا';

-- وأنشئ له سجل في جدول staff
INSERT INTO staff (user_id, name, role, is_active)
VALUES (
    (SELECT id FROM users WHERE username = 'اسم-المستخدم-هنا'),
    'اسم الجزار',
    'butcher',
    true
);
*/

-- ==========================================
-- ✅ بعد التشخيص
-- ==========================================
-- شارك النتائج معي لأتمكن من تحديد المشكلة بدقة
-- ==========================================
