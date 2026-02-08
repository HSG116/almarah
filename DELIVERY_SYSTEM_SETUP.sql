-- 1. EXTEND DELIVERY ZONES WITH COMMISSION
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS driver_commission REAL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES delivery_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_staff_id INTEGER REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS butcher_staff_id INTEGER REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lat REAL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lng REAL;

-- 2. EXTEND STAFF WITH WALLET BALANCE
ALTER TABLE staff ADD COLUMN IF NOT EXISTS wallet_balance REAL DEFAULT 0;

-- 3. CREATE DELIVERY LOGS FOR PERFORMANCE TRACKING
CREATE TABLE IF NOT EXISTS delivery_performance_logs (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    order_id INTEGER REFERENCES orders(id),
    status TEXT NOT NULL, -- 'shipped', 'arrived', 'completed'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB -- store coordinates or other info
);

-- ENABLE RLS & ADD POLICIES
ALTER TABLE delivery_performance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON delivery_performance_logs;
CREATE POLICY "Enable all access for authenticated users" ON delivery_performance_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. ADD TIMESTAMPS TO ORDERS FOR FASTER METRICS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 5. TRIGGER TO AUTOMATICALLY UPDATE TIMESTAMPS AND LOG PERFORMANCE
CREATE OR REPLACE FUNCTION update_order_delivery_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the status change
    IF NEW.status IN ('shipping', 'arrived', 'completed') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        INSERT INTO delivery_performance_logs (staff_id, order_id, status, timestamp, metadata)
        VALUES (NEW.driver_staff_id, NEW.id, NEW.status, NOW(), jsonb_build_object('lat', NEW.gps_lat, 'lng', NEW.gps_lng));
    END IF;

    -- Update timestamps
    IF NEW.status = 'shipping' AND (OLD.status IS NULL OR OLD.status != 'shipping') THEN
        NEW.picked_up_at = NOW();
    ELSIF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.delivered_at = NOW();
        
        -- Automatic Wallet Update: Add commission to driver's wallet
        UPDATE staff 
        SET wallet_balance = wallet_balance + (
            SELECT COALESCE(dz.driver_commission, 0)
            FROM delivery_zones dz
            WHERE dz.id = NEW.zone_id
            LIMIT 1
        )
        WHERE id = NEW.driver_staff_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_order_delivery_timestamps ON orders;
CREATE TRIGGER trg_update_order_delivery_timestamps
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_delivery_timestamps();

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_driver_staff ON orders(driver_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_staff ON delivery_performance_logs(staff_id);

-- 7. NOTIFICATION SYSTEM FOR DRIVERS
-- Trigger when order status is set to 'ready' and no driver assigned
CREATE OR REPLACE FUNCTION notify_drivers_of_ready_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ready' AND NEW.driver_staff_id IS NULL THEN
        INSERT INTO notifications (title, message, created_at)
        VALUES ('طلب جديد جاهز!', 'يوجد طلب جديد بانتظار سائق، استلمه الآن!', NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_drivers ON orders;
CREATE TRIGGER trg_notify_drivers
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_drivers_of_ready_order();
