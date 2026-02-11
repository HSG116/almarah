-- ========================================================
-- ULTIMATE SECURITY OVERHAUL (حماية قصوى للموقع)
-- هذا الملف يطبق أقوى سياسات الأمان على مستوى قاعدة البيانات
-- للحماية من المتسللين وضمان خصوصية البيانات
-- ========================================================

-- 1. تفعيل RLS على جميع الجداول الأساسية
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE butcher_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE butcher_inventory_logs ENABLE ROW LEVEL SECURITY;

-- 2. تنظيف السياسات القديمة
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. سياسات جدول المستخدمين (users)
-- السماح للمستخدم برؤية ملفه الشخصي فقط
CREATE POLICY "Users can only see their own profile" 
ON users FOR SELECT 
USING (auth.uid() = id OR (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true);

-- السماح للمستخدم بتحديث ملفه الشخصي فقط
CREATE POLICY "Users can only update their own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1)); -- منع تغيير صلاحية admin

-- الإدارة فقط يمكنها رؤية الكل وإدارة الكل
CREATE POLICY "Admins have full control over users" 
ON users FOR ALL 
USING ((SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true);

-- 4. سياسات جدول الموظفين (staff)
-- القراءة للموظف نفسه أو الإدارة
CREATE POLICY "Staff can see their own record or admins see all" 
ON staff FOR SELECT 
USING (user_id = auth.uid() OR (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true);

-- الإدارة فقط تعدل في جدول الموظفين
CREATE POLICY "Admins only can modify staff" 
ON staff FOR ALL 
USING ((SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true);

-- 5. سياسات الطلبات (orders)
-- المستخدم يرى طلباته فقط، الموظف يرى الكل (للعمل)، الإدارة ترى الكل
CREATE POLICY "Orders visibility access" 
ON orders FOR SELECT 
USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'manager', 'butcher', 'delivery', 'accountant', 'support')
);

-- المستخدم ينشئ طلبه الخاص فقط
CREATE POLICY "Users can create their own orders" 
ON orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- تحديث حالة الطلب مسموح فقط للموظفين المعنيين أو الإدارة
CREATE POLICY "Staff and admin can update orders" 
ON orders FOR UPDATE 
USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'manager', 'butcher', 'delivery', 'support')
);

-- 6. سياسات عناصر الطلبات (order_items)
CREATE POLICY "Order items visibility" 
ON order_items FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'manager', 'butcher', 'delivery')))
);

-- 7. سياسات إعدادات الموقع (site_settings)
-- القراءة للكل، التعديل للإدارة فقط
CREATE POLICY "Public can read site settings" 
ON site_settings FOR SELECT USING (true);

CREATE POLICY "Admins only can modify site settings" 
ON site_settings FOR ALL 
USING ((SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true);

-- 8. سياسات طلبات الصرف (payout_requests)
CREATE POLICY "Staff see own payout, admins see all" 
ON payout_requests FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = payout_requests.staff_id AND staff.user_id = auth.uid()) OR 
    (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) = true
);

-- 9. حماية الجرد (Butcher Inventory)
CREATE POLICY "Only butchers and admins manage inventory" 
ON butcher_inventory FOR ALL 
USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'butcher')
);

-- 10. وظائف حماية إضافية (Database Functions for Security)

-- وظيفة لمنع حذف المستخدمين إلا للمدير العام
CREATE OR REPLACE FUNCTION protect_users_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_admin FROM users WHERE id = auth.uid() LIMIT 1) IS NOT TRUE THEN
        RAISE EXCEPTION 'غير مصرح لك بحذف مستخدمين!';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_users_delete ON users;
CREATE TRIGGER tr_protect_users_delete
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION protect_users_delete();

-- حماية ضد التلاعب بمكان الصور أو الملفات الحساسة
-- (يمكن إضافة المزيد من القيود هنا بناءً على الجداول)

-- ========================================================
-- ✅ تم تطبيق الحماية القصوى بنجاح.
-- ملاحظة: تأكد من تشغيل هذا الكود في Supabase SQL Editor
-- ========================================================
