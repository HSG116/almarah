-- SUPABASE FINAL SETUP SCRIPT
-- This script sets up all tables, RLS policies, and functions for the Asset Manager / Meat Butchery App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  district TEXT,
  street TEXT,
  building TEXT,
  landmark TEXT,
  gps_lat REAL,
  gps_lng REAL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  image TEXT,
  parent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  unit TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  badge TEXT,
  size TEXT,
  weight TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  image_object_position TEXT DEFAULT 'object-center',
  stock_quantity INTEGER DEFAULT 0,
  is_out_of_stock BOOLEAN DEFAULT false,
  has_cutting BOOLEAN DEFAULT false,
  has_packaging BOOLEAN DEFAULT false,
  allow_special_instructions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DELIVERY ZONES TABLE
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  fee REAL NOT NULL DEFAULT 0,
  min_order REAL NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  coordinates TEXT, -- JSON string of polygon points [[lat, lng], ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT ATTRIBUTES TABLE
CREATE TABLE IF NOT EXISTS product_attributes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cutting' or 'packaging'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value REAL NOT NULL,
  min_purchase REAL DEFAULT 0,
  expiry_date TEXT,
  is_active BOOLEAN DEFAULT true,
  max_usage INTEGER,
  used_count INTEGER DEFAULT 0,
  min_order_amount REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OFFERS TABLE
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage INTEGER,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON string
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  address TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  payment_method TEXT DEFAULT 'cash',
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  cutting TEXT,
  packaging TEXT,
  notes TEXT
);

-- --- RLS POLICIES (ENABLE FOR ALL) ---
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ POLICIES
DROP POLICY IF EXISTS "Public read for categories" ON categories;
CREATE POLICY "Public read for categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read for products" ON products;
CREATE POLICY "Public read for products" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read for delivery_zones" ON delivery_zones;
CREATE POLICY "Public read for delivery_zones" ON delivery_zones FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read for offers" ON offers;
CREATE POLICY "Public read for offers" ON offers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read for coupons" ON coupons;
CREATE POLICY "Public read for coupons" ON coupons FOR SELECT USING (is_active = true);

-- ADMIN POLICIES (Full control for admins)
DROP POLICY IF EXISTS "Admin full access users" ON users;
CREATE POLICY "Admin full access users" ON users For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access categories" ON categories;
CREATE POLICY "Admin full access categories" ON categories For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products" ON products For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access delivery_zones" ON delivery_zones;
CREATE POLICY "Admin full access delivery_zones" ON delivery_zones For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access product_attributes" ON product_attributes;
CREATE POLICY "Admin full access product_attributes" ON product_attributes For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access coupons" ON coupons;
CREATE POLICY "Admin full access coupons" ON coupons For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access offers" ON offers;
CREATE POLICY "Admin full access offers" ON offers For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access notifications" ON notifications;
CREATE POLICY "Admin full access notifications" ON notifications For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access drivers" ON drivers;
CREATE POLICY "Admin full access drivers" ON drivers For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access site_settings" ON site_settings;
CREATE POLICY "Admin full access site_settings" ON site_settings For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access orders" ON orders;
CREATE POLICY "Admin full access orders" ON orders For ALL USING (true);

DROP POLICY IF EXISTS "Admin full access order_items" ON order_items;
CREATE POLICY "Admin full access order_items" ON order_items For ALL USING (true);

-- --- INITIAL DATA ---

-- Categories
INSERT INTO categories (id, name, icon, image) VALUES
('lamb', 'نعيمي', '🐑', 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('beef', 'عجول', '🐂', 'https://images.unsplash.com/photo-1551028150-64b9f398f678?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('poultry', 'دجاج', '🐔', 'https://images.unsplash.com/photo-1587593810167-a84920ea0831?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('vegetables', 'خضروات', '🥦', 'https://images.unsplash.com/photo-1566385101042-1a000c1267c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60')
ON CONFLICT (id) DO NOTHING;

-- Product Attributes
INSERT INTO product_attributes (name, type) VALUES
('تقطيع ثلاجة', 'cutting'),
('تقطيع أرباع', 'cutting'),
('تقطيع مفصل', 'cutting'),
('تقطيع حضرمي', 'cutting'),
('تغليف سحب هواء', 'packaging'),
('تغليف أطباق', 'packaging'),
('تغليف كرتون', 'packaging')
ON CONFLICT DO NOTHING;

-- Delivery Zones
INSERT INTO delivery_zones (name, fee, min_order) VALUES
('الرياض - الشمال', 20, 100),
('الرياض - الشرق', 15, 80),
('الرياض - الغرب', 25, 150),
('الرياض - الوسط', 10, 50)
ON CONFLICT DO NOTHING;

-- Site Settings
INSERT INTO site_settings (key, value) VALUES
('store_name', '"ملحمة النعيمي الفاخر"'),
('tax_number', '"300012345600003"'),
('whatsapp', '"0501234567"'),
('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
