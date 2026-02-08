# إعدادات Supabase المطلوبة لتشغيل التحقق عبر Telegram

## المشكلة:
عند التسجيل عبر Telegram، يقوم Supabase بإرسال رسالة تأكيد للبريد الإلكتروني.
المستخدم لا يستطيع تسجيل الدخول حتى يؤكد البريد.

## الحل:
قم بتعطيل تأكيد البريد الإلكتروني في Supabase:

### الخطوات:
1. افتح لوحة تحكم Supabase: https://supabase.com/dashboard
2. اختر المشروع الخاص بك
3. انتقل إلى **Authentication** > **Settings**
4. في قسم **Email Auth**، قم بإلغاء تفعيل:
   - ☐ **Confirm email** (قم بإلغاء التأشير)
5. احفظ التغييرات

### بديل (إذا لم تستطع الوصول لإعدادات Supabase):
يمكنك إضافة SQL Trigger لتأكيد البريد تلقائياً:

```sql
-- Auto-confirm email for all new users
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = now()
  WHERE id = NEW.id 
  AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();
```

بعد تطبيق أحد الحلول، جرب التسجيل مرة أخرى!
