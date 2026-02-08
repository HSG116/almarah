
-- 1. Fix Vegetables Category Image
-- Using a valid image path. 'veggies.jpg' exists in /images/
UPDATE public.categories 
SET image = '/images/veggies.jpg' 
WHERE id = 'veggies';

-- 2. Add 'Sacrifices' (ذبيحة) Category
-- Using an image that definitely exists
INSERT INTO public.categories (id, name, icon, image)
VALUES ('sacrifices', 'ذبيحة', '🔪', '/images/naimi-realistic.png')
ON CONFLICT (id) DO UPDATE SET name = 'ذبيحة';

-- 3. Move Whole Animals to 'Sacrifices' Category
UPDATE public.products 
SET category_id = 'sacrifices' 
WHERE name LIKE '%خروف%' 
   OR name LIKE '%تيس%' 
   OR name LIKE '%جذع%'
   OR name LIKE '%نعيمي%'
   OR name LIKE '%حري%';
