# خطوات تطبيق إصلاح سير عمل الطلبات

## الخطوات المطلوبة ✅

### 1️⃣ تنفيذ SQL Script في Supabase

1. افتح متصفحك واذهب إلى: https://supabase.com
2. سجل دخولك إلى مشروعك
3. من القائمة الجانبية، اختر **SQL Editor**
4. اضغط على **New Query**
5. انسخ محتوى الملف `FIX_ORDER_WORKFLOW.sql` بالكامل
6. الصقه في المحرر
7. اضغط **Run** أو `Ctrl+Enter`

### 2️⃣ التحقق من نجاح التنفيذ

بعد تنفيذ السكريبت، قم بتشغيل هذا الاستعلام للتحقق:

```sql
-- التحقق من الـ Triggers
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled
FROM pg_trigger 
WHERE tgname IN (
    'trg_notify_butchers_new_order',
    'trg_auto_forward_to_delivery',
    'trg_update_processing_timestamps'
);
```

**النتيجة المتوقعة:** يجب أن ترى 3 triggers وجميعها enabled (O)

### 3️⃣ التحقق من جدول الإشعارات

تأكد من أن جدول الإشعارات يحتوي على الأعمدة الجديدة:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

**يجب أن ترى:** `user_id` و `type` ضمن الأعمدة

### 4️⃣ اختبار النظام

#### اختبار أ: إنشاء طلب جديد
1. من تطبيق العميل، قم بإنشاء طلب جديد
2. تحقق من الإشعارات:

```sql
SELECT 
    n.title,
    n.message,
    u.username as butcher_name,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'order'
ORDER BY n.created_at DESC
LIMIT 10;
```

**النتيجة المتوقعة:** يجب أن ترى إشعارات لجميع الجزارين

#### اختبار ب: تحويل طلب للتوصيل
1. قم بتحديث حالة أي طلب إلى `ready`:

```sql
UPDATE orders 
SET status = 'ready' 
WHERE id = 1; -- استبدل 1 برقم طلب موجود
```

2. تحقق من الإشعارات:

```sql
SELECT 
    n.title,
    n.message,
    u.username as driver_name,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'delivery'
ORDER BY n.created_at DESC
LIMIT 10;
```

**النتيجة المتوقعة:** يجب أن ترى إشعارات لجميع السائقين

### 5️⃣ التحقق من الأعمدة الجديدة

تأكد من إضافة أعمدة التوقيت:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('processing_started_at', 'ready_at')
ORDER BY ordinal_position;
```

**يجب أن ترى:** العمودين موجودين بنوع `timestamp with time zone`

---

## استكشاف الأخطاء 🔧

### مشكلة: Triggers لم يتم إنشاؤها

**الحل:**
```sql
-- احذف القديم
DROP TRIGGER IF EXISTS trg_notify_butchers_new_order ON orders;
DROP TRIGGER IF EXISTS trg_auto_forward_to_delivery ON orders;
DROP TRIGGER IF EXISTS trg_update_processing_timestamps ON orders;

-- ثم أعد تنفيذ FIX_ORDER_WORKFLOW.sql
```

### مشكلة: لا توجد إشعارات

**تحقق من:**
1. هل يوجد موظفون بصلاحية `butcher` أو `delivery`؟
```sql
SELECT id, username, role FROM users WHERE role IN ('butcher', 'delivery');
```

2. هل الموظفون غير محظورين؟
```sql
SELECT id, username, role, is_banned FROM users WHERE role IN ('butcher', 'delivery');
```

### مشكلة: خطأ في العمود user_id

**الحل:**
```sql
-- تأكد من وجود العمود
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
```

---

## نصائح مهمة 💡

1. **النسخ الاحتياطي:** قبل تنفيذ أي SQL، قم بعمل Backup للبيانات
2. **الاختبار:** اختبر على بيانات تجريبية أولاً
3. **المراقبة:** راقب الإشعارات بعد التنفيذ للتأكد من عملها
4. **الأداء:** إذا كان لديك عدد كبير من الطلبات، قد تحتاج لمراقبة الأداء

---

## الخطوات التالية (اختياري) 📱

إذا أردت تحسين تجربة المستخدم:

### 1. إضافة صوت للإشعارات
في الـ Frontend، يمكنك إضافة:
```typescript
// عند استقبال إشعار جديد
const audio = new Audio('/notification-sound.mp3');
audio.play();
```

### 2. إضافة Real-time Updates
استخدم Supabase Realtime لتحديث الإشعارات فوراً:
```typescript
supabase
  .channel('notifications')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => {
      // تحديث UI
      showNotification(payload.new);
    }
  )
  .subscribe();
```

---

## تم! ✅

الآن النظام جاهز:
- ✅ الطلبات الجديدة تُرسل لجميع الجزارين
- ✅ الطلبات الجاهزة تُرسل لجميع السائقين
- ✅ يتم تسجيل الأوقات تلقائياً
- ✅ النظام يعمل بشكل آلي بالكامل
