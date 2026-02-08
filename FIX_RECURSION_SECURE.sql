-- ====================================
-- حل نهائي لمشكلة التكرار اللانهائي (Infinite Recursion)
-- باستخدام دالة آمنة (Security Definer)
-- ====================================

-- 1. إنشاء دالة آمنة للتحقق من الأدمن (تتجاوز RLS)
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- استعلام مباشر يتجاوز سياسات الأمان لأن الدالة Security Definer
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. إيقاف السياسات القديمة المسببة للمشكلة
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;

-- 3. إنشاء السياسات الصحيحة والآمنة
-- السماح للمستخدم برؤية ملفه الشخصي فقط
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدم بتحديث ملفه الشخصي فقط
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- السماح للأدمن برؤية الجميع (باستخدام الدالة الآمنة)
CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT USING (public.check_is_admin(auth.uid()));

-- السماح بإنشاء مستخدم جديد عند التسجيل
CREATE POLICY "Enable insert for authentication" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);


-- 4. تحديث باقي الجداول لاستخدام الدالة الآمنة (تحسين للأداء والأمان)

-- Products
DROP POLICY IF EXISTS "Admin insert products" ON public.products;
DROP POLICY IF EXISTS "Admin update products" ON public.products;
DROP POLICY IF EXISTS "Admin delete products" ON public.products;

CREATE POLICY "Admin insert products" ON public.products
  FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "Admin update products" ON public.products
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admin delete products" ON public.products
  FOR DELETE USING (public.check_is_admin(auth.uid()));

-- Categories
DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;
CREATE POLICY "Admin full access categories" ON public.categories 
  FOR ALL USING (public.check_is_admin(auth.uid()));

-- Orders
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;

CREATE POLICY "Admin view all orders" ON public.orders 
  FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admin update orders" ON public.orders 
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

-- Order Items
DROP POLICY IF EXISTS "Admin view all order items" ON public.order_items;

CREATE POLICY "Admin view all order items" ON public.order_items 
  FOR SELECT USING (public.check_is_admin(auth.uid()));

-- ====================================
-- ✅ تم الحل! يمكنك الآن حفظ العنوان بدون مشاكل.
-- ====================================
