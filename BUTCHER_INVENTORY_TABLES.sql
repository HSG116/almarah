
-- 1. Butcher Inventory Table
CREATE TABLE IF NOT EXISTS butcher_inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    staff_id INTEGER REFERENCES staff(id),
    current_quantity REAL DEFAULT 0, -- In KG or Units
    price_today REAL, -- Daily price set by butcher
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Butcher Inventory Logs (for Admin Audit)
CREATE TABLE IF NOT EXISTS butcher_inventory_logs (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    product_id INTEGER REFERENCES products(id),
    old_quantity REAL,
    new_quantity REAL,
    old_price REAL,
    new_price REAL,
    action_type TEXT, -- 'update', 'add_stock', 'daily_price_change'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE butcher_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE butcher_inventory_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Butcher Inventory
CREATE POLICY "Allow authenticated full access to butcher_inventory" 
ON butcher_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for Butcher Inventory Logs
CREATE POLICY "Allow authenticated full access to butcher_inventory_logs" 
ON butcher_inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
