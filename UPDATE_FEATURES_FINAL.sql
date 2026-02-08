-- Final Database Update for New Features
-- This script adds Support for:
-- 1. Banning Users
-- 2. Product Options (Cutting, Packaging)
-- 3. Geographic Delivery Zones (Map support)
-- 4. Coupons & Advanced Discounting
-- 5. Offers (Featured Banners)
-- 6. Customer Notifications
-- 7. Advanced Reports View

-- 1. Update Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2. Update Products Table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_cutting BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_packaging BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_special_instructions BOOLEAN DEFAULT true;

-- Update lamb products to have cutting/packaging by default
UPDATE products SET has_cutting = true, has_packaging = true WHERE category_id = 'lamb';

-- 3. Update Delivery Zones
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS coordinates TEXT; -- Store as JSON string [[lat, lng], ...]

-- 4. Create Offers Table
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    discount_percentage INTEGER,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    start_date TEXT,
    end_date TEXT
);

-- 5. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Update Coupons Table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_usage INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount REAL DEFAULT 0;

-- 7. Drop Recipes (as requested)
DROP TABLE IF EXISTS recipes;

-- 8. Seed some initial offers and coupons
INSERT INTO offers (title, description, discount_percentage, image_url)
VALUES 
('عرض الجمعة المباركة', 'خصم 20% على جميع أنواع اللحوم الطازجة', 20, '/images/offers/friday_offer.png'),
('بكج الشواء العائلي', 'وفر 50 ريال عند شراء بكج المشويات', 15, '/images/offers/grill_offer.png')
ON CONFLICT DO NOTHING;

INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_usage)
VALUES 
('WELCOME20', 'fixed', 20, 100, 100),
('EID2024', 'percentage', 15, 200, 500)
ON CONFLICT DO NOTHING;

-- 9. Create a sophisticated view for Reports
CREATE OR REPLACE VIEW reports_dashboard AS
SELECT 
    COUNT(id) as total_orders,
    SUM(total) as total_revenue,
    AVG(total) as average_order_value,
    (SELECT COUNT(*) FROM users) as total_customers,
    (SELECT COUNT(*) FROM products WHERE stock_quantity < 10) as low_stock_items
FROM orders;
