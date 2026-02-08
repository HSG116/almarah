-- ====================================
-- FIX ORDER WORKFLOW
-- ====================================
-- This script ensures:
-- 1. When a new order is created, ALL butchers are notified
-- 2. When a butcher completes an order, it automatically goes to delivery (ready status)

-- ====================================
-- 1. FUNCTION TO NOTIFY ALL BUTCHERS OF NEW ORDER
-- ====================================
CREATE OR REPLACE FUNCTION notify_all_butchers_new_order()
RETURNS TRIGGER AS $$
DECLARE
    butcher_user RECORD;
    order_customer_name TEXT;
    order_total TEXT;
BEGIN
    -- Only trigger for new orders with 'pending' status
    IF NEW.status = 'pending' AND (OLD.id IS NULL) THEN
        
        -- Get order details
        order_customer_name := COALESCE(NEW.customer_name, 'عميل');
        order_total := COALESCE(NEW.total::TEXT, '0');
        
        -- Send notification to ALL butchers
        FOR butcher_user IN 
            SELECT u.id, u.username 
            FROM users u 
            WHERE u.role = 'butcher' 
            AND u.is_banned = FALSE
        LOOP
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                butcher_user.id,
                '🔔 طلب جديد!',
                'طلب جديد من ' || order_customer_name || ' - الإجمالي: ' || order_total || ' ر.س',
                'order',
                NOW()
            );
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_notify_butchers_new_order ON orders;

-- Create trigger for new orders
CREATE TRIGGER trg_notify_butchers_new_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_all_butchers_new_order();

-- ====================================
-- 2. FUNCTION TO AUTO-FORWARD TO DELIVERY WHEN BUTCHER COMPLETES
-- ====================================
CREATE OR REPLACE FUNCTION auto_forward_to_delivery()
RETURNS TRIGGER AS $$
DECLARE
    delivery_driver RECORD;
BEGIN
    -- When butcher marks order as 'processing' -> change to 'ready' for delivery
    -- Or when status changes to 'ready', notify all delivery drivers
    IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
        
        -- Send notification to ALL delivery drivers
        FOR delivery_driver IN 
            SELECT u.id, u.username 
            FROM users u 
            WHERE u.role = 'delivery' 
            AND u.is_banned = FALSE
        LOOP
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                delivery_driver.id,
                '🚚 طلب جاهز للتوصيل!',
                'طلب رقم #' || NEW.id || ' جاهز للتوصيل - ' || COALESCE(NEW.customer_name, 'عميل'),
                'delivery',
                NOW()
            );
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_auto_forward_to_delivery ON orders;

-- Create trigger for order status updates
CREATE TRIGGER trg_auto_forward_to_delivery
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_forward_to_delivery();

-- ====================================
-- 3. ADD PROCESSING TIMESTAMP
-- ====================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

-- ====================================
-- 4. FUNCTION TO UPDATE PROCESSING TIMESTAMPS
-- ====================================
CREATE OR REPLACE FUNCTION update_processing_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- When order moves to 'processing' status
    IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
        NEW.processing_started_at = NOW();
    END IF;
    
    -- When order moves to 'ready' status
    IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
        NEW.ready_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_processing_timestamps ON orders;

-- Create trigger for timestamps
CREATE TRIGGER trg_update_processing_timestamps
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_timestamps();

-- ====================================
-- 5. ENSURE NOTIFICATIONS TABLE EXISTS AND HAS USER_ID
-- ====================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ====================================
-- VERIFICATION QUERIES
-- ====================================
-- Run these to verify the setup:

-- Check if triggers exist:
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%butcher%' OR tgname LIKE '%delivery%';

-- Check if functions exist:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%butcher%' OR proname LIKE '%delivery%';
