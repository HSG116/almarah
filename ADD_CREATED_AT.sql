-- إضافة عمود تاريخ الإنشاء لجدول المستخدمين
-- شغل هذا الكود في Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- تحديث السجلات القديمة إذا كانت موجودة ليكون لها تاريخ (اختياري)
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- التأكد من وجود عمود created_at في جدول staff أيضاً
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
