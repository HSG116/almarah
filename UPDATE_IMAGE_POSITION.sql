-- تحديث موضع الصورة للمنتجات المحددة لإظهار الحيوان من الأعلى

-- تحديث "خروف حري كامل" - تركيز على الجزء العلوي
UPDATE public.products
SET image_object_position = 'object-top'
WHERE name = 'خروف حري كامل';

-- تحديث "تيس بلدي محايل" - تركيز على الجزء العلوي
UPDATE public.products
SET image_object_position = 'object-top'
WHERE name = 'تيس بلدي محايل';
