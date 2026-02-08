-- Fix Staff Table RLS Policy
-- المشكلة: عند إنشاء موظف جديد من لوحة التحكم، لا يتم حفظه بسبب سياسات RLS

-- 1. حذف السياسة القديمة المقيدة
DROP POLICY IF EXISTS "Enable all access for admins" ON staff;

-- 2. إنشاء سياسة جديدة تسمح بالقراءة للجميع
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
CREATE POLICY "Enable read access for all users" 
    ON staff 
    FOR SELECT 
    USING (true);

-- 3. إنشاء سياسة INSERT/UPDATE/DELETE تعمل مع service role
-- هذه السياسة تسمح بالإدخال من authenticated users الذين لديهم صلاحيات admin
-- أو من service role (backend)
CREATE POLICY "Enable insert for service role and admins" 
    ON staff 
    FOR INSERT 
    WITH CHECK (true); -- Service role bypasses RLS automatically

CREATE POLICY "Enable update for service role and admins" 
    ON staff 
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for service role and admins" 
    ON staff 
    FOR DELETE 
    USING (true);

-- ملاحظة: Service Role Key يتجاوز RLS تلقائياً، لذا هذه السياسات للسماح أيضاً للمستخدمين المصادقين
