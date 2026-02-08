
-- Add is_active column to products table
ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
