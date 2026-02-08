-- ==========================================
-- COMPLETE ADMIN SYSTEM SETUP - Supabase SQL
-- ==========================================

-- 1. ENHANCE EXISTING TABLES
-- Add parent_id for subcategories support
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.categories(id);

-- Add stock management to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT FALSE;

-- 2. NEW CORE TABLES

-- Delivery Zones & Shipping Fees
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    fee REAL NOT NULL DEFAULT 0,
    min_order REAL NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preparation Attributes (Cutting, Packaging types)
CREATE TABLE IF NOT EXISTS public.product_attributes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'cutting' or 'packaging'
    is_active BOOLEAN DEFAULT TRUE
);

-- Coupons & Marketing
CREATE TABLE IF NOT EXISTS public.coupons (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
    discount_value REAL NOT NULL,
    min_purchase REAL DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers Management
CREATE TABLE IF NOT EXISTS public.drivers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes Management
CREATE TABLE IF NOT EXISTS public.recipes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Rich text / Markdown
    image TEXT,
    related_product_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Settings (Dynamic Logo, Working Hours, Status)
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LINKING ORDERS TO NEW LOGISTICS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES public.drivers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. SECURITY & POLICIES (RLS)

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Unified Admin Check Helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT is_admin FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public Access Rules (Read only)
CREATE POLICY "Public Read Delivery Zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public Read Attributes" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Public Read Recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Public Read Site Settings" ON public.site_settings FOR SELECT USING (true);

-- Admin Full Access Rules
CREATE POLICY "Admin Full Access Delivery" ON public.delivery_zones FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Attributes" ON public.product_attributes FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Coupons" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Drivers" ON public.drivers FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Recipes" ON public.recipes FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Settings" ON public.site_settings FOR ALL USING (public.is_admin());

-- 5. SEED INITIAL PROFESSIONAL DATA

-- Preparation Options
INSERT INTO public.product_attributes (name, type) VALUES 
('ثلاجة', 'cutting'), ('تفصيل كبير', 'cutting'), ('تفصيل صغير', 'cutting'), ('أرباع', 'cutting'), ('أنصاف', 'cutting'), ('مفروم', 'cutting'), ('ستيك', 'cutting'),
('أطباق فلين', 'packaging'), ('أكياس', 'packaging'), ('سحب هواء (Vacuum)', 'packaging')
ON CONFLICT DO NOTHING;

-- Initial Settings
INSERT INTO public.site_settings (key, value) VALUES 
('general', '{"name": "ملحمة الخير", "status": "open", "logo": "/logo.png", "description": "أجود أنواع اللحوم الطازجة"}'),
('contact', '{"phone": "0500000000", "whatsapp": "966500000000", "email": "info@almalhama.com"}'),
('working_hours', '{"mon": "08:00-22:00", "tue": "08:00-22:00", "wed": "08:00-22:00", "thu": "08:00-22:00", "fri": "13:00-22:00", "sat": "08:00-22:00", "sun": "08:00-22:00"}'),
('order_config', '{"min_order_total": 50, "delivery_fee_default": 15}')
ON CONFLICT (key) DO NOTHING;

-- Initial Delivery Zones
INSERT INTO public.delivery_zones (name, fee, min_order) VALUES 
('المنطقة القريبة (5كم)', 0, 50),
('وسط المدينة', 15, 100),
('مناطق بعيدة', 30, 200)
ON CONFLICT DO NOTHING;
