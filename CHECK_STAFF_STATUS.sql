-- تحقق من حالة جدول staff وسياساته
-- شغل هذا في Supabase SQL Editor للتحقق

-- 1. التحقق من وجود الجدول
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'staff'
) as staff_table_exists;

-- 2. عرض جميع السياسات على جدول staff
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'staff';

-- 3. عرض عدد الموظفين الحاليين
SELECT COUNT(*) as total_staff FROM staff;

-- 4. التحقق من المستخدمين الـ Admin
SELECT 
    id, 
    username, 
    email, 
    is_admin,
    role
FROM users
WHERE is_admin = true;

-- إذا لم يكن لديك حساب admin، شغل هذا:
-- استبدل 'your_username' باسم المستخدم الخاص بك
/*
UPDATE users 
SET is_admin = true, role = 'admin'
WHERE username = 'your_username';
*/
