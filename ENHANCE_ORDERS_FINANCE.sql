-- E-COMMERCE ORDERS ENHANCEMENT
-- Run this in Supabase SQL Editor to support detailed orders and beautiful invoicing

-- 1. Upgrade Orders Table with finance and location details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone_id INTEGER REFERENCES delivery_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lat REAL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lng REAL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_amount REAL DEFAULT 0;

-- 2. Ensure order_items has all metadata for additions
-- (Already mostly there, but adding subtotal for variants if needed)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_at_time REAL;

-- 3. Add Store Branding to Site Settings for the Invoice
INSERT INTO site_settings (key, value) VALUES 
('store_logo', '"https://via.placeholder.com/150"'),
('store_address', '"الرياض، المملكة العربية السعودية"'),
('invoice_footer', '"شكراً لثقتكم بمنا، نأمل أن تنال منتجاتنا رضاكم"')
ON CONFLICT (key) DO NOTHING;

-- 4. Re-enable RLS for new columns (Supabase does this automatically usually, but good to be safe)
DROP POLICY IF EXISTS "Admin full access orders" ON orders;
CREATE POLICY "Admin full access orders" ON orders For ALL USING (true);
