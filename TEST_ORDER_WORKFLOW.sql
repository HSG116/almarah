-- ====================================
-- TESTING SCENARIOS FOR ORDER WORKFLOW
-- ====================================
-- Use these queries to test the new order workflow system

-- ====================================
-- STEP 1: VERIFY TRIGGERS ARE ACTIVE
-- ====================================
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname IN (
    'trg_notify_butchers_new_order',
    'trg_auto_forward_to_delivery',
    'trg_update_processing_timestamps'
)
ORDER BY tgname;

-- Expected: You should see 3 triggers, all enabled (O = enabled)

-- ====================================
-- STEP 2: CHECK IF FUNCTIONS EXIST
-- ====================================
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition_preview
FROM pg_proc 
WHERE proname IN (
    'notify_all_butchers_new_order',
    'auto_forward_to_delivery',
    'update_processing_timestamps'
);

-- Expected: You should see 3 functions

-- ====================================
-- STEP 3: VERIFY NOTIFICATIONS TABLE STRUCTURE
-- ====================================
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications'
AND column_name IN ('user_id', 'type', 'title', 'message')
ORDER BY ordinal_position;

-- Expected: You should see user_id (text), type (text), title (text), message (text)

-- ====================================
-- STEP 4: CHECK BUTCHERS AND DELIVERY STAFF
-- ====================================
-- See all butchers
SELECT 
    id, 
    username, 
    role, 
    is_banned,
    created_at
FROM users 
WHERE role = 'butcher'
ORDER BY username;

-- See all delivery drivers
SELECT 
    id, 
    username, 
    role, 
    is_banned,
    created_at
FROM users 
WHERE role = 'delivery'
ORDER BY username;

-- Expected: You should see your butchers and delivery staff
-- If you don't have any, create some test users first!

-- ====================================
-- STEP 5: CREATE TEST ORDER
-- ====================================
-- Replace 'YOUR-USER-ID-HERE' with an actual user ID from your users table
-- This will create a test order and should trigger notifications to all butchers

INSERT INTO orders (
    user_id, 
    total, 
    status, 
    customer_name,
    customer_phone,
    address
) 
VALUES (
    'YOUR-USER-ID-HERE',  -- ⚠️ REPLACE THIS
    250.00,
    'pending',
    'اختبار النظام',
    '0501234567',
    'الرياض - حي النخيل'
)
RETURNING id, status, customer_name, total;

-- Expected: You should see the new order details

-- ====================================
-- STEP 6: CHECK BUTCHER NOTIFICATIONS
-- ====================================
-- This should show all notifications sent to butchers
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    u.username as butcher_username,
    u.role,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'order'
ORDER BY n.created_at DESC
LIMIT 20;

-- Expected: You should see one notification for EACH butcher

-- ====================================
-- STEP 7: UPDATE ORDER TO READY STATUS
-- ====================================
-- This simulates a butcher completing the order
-- Replace 'ORDER-ID-HERE' with the ID from the order you created in STEP 5

UPDATE orders 
SET 
    status = 'ready',
    butcher_staff_id = (SELECT id FROM users WHERE role = 'butcher' LIMIT 1)
WHERE id = ORDER-ID-HERE  -- ⚠️ REPLACE THIS
RETURNING id, status, customer_name;

-- Expected: Order status should change to 'ready'

-- ====================================
-- STEP 8: CHECK DELIVERY NOTIFICATIONS
-- ====================================
-- This should show all notifications sent to delivery drivers
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    u.username as driver_username,
    u.role,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'delivery'
ORDER BY n.created_at DESC
LIMIT 20;

-- Expected: You should see one notification for EACH delivery driver

-- ====================================
-- STEP 9: CHECK TIMESTAMPS
-- ====================================
-- Verify that the new timestamp columns are being populated
SELECT 
    id,
    status,
    customer_name,
    processing_started_at,
    ready_at,
    picked_up_at,
    delivered_at,
    created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- Expected: You should see the timestamp columns populated when status changes

-- ====================================
-- STEP 10: FULL ORDER LIFECYCLE TEST
-- ====================================
-- This tests the complete workflow from pending to completed

-- 1. Create a new order
WITH new_order AS (
    INSERT INTO orders (
        user_id, 
        total, 
        status, 
        customer_name,
        customer_phone
    ) 
    VALUES (
        (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
        150.00,
        'pending',
        'تجربة كاملة',
        '0509876543'
    )
    RETURNING id
)
SELECT id FROM new_order;

-- Copy the returned ID and use it below

-- 2. Move to processing (butcher accepts)
-- UPDATE orders SET status = 'processing' WHERE id = PASTE-ID-HERE;

-- 3. Move to ready (butcher completes)
-- UPDATE orders SET status = 'ready' WHERE id = PASTE-ID-HERE;

-- 4. Move to shipping (driver picks up)
-- UPDATE orders SET status = 'shipping', driver_staff_id = (SELECT id FROM users WHERE role = 'delivery' LIMIT 1) WHERE id = PASTE-ID-HERE;

-- 5. Move to completed (driver delivers)
-- UPDATE orders SET status = 'completed' WHERE id = PASTE-ID-HERE;

-- ====================================
-- CLEANUP: REMOVE TEST DATA (OPTIONAL)
-- ====================================
-- Uncomment and run these if you want to clean up test notifications and orders

-- Delete test notifications
-- DELETE FROM notifications WHERE message LIKE '%اختبار%' OR message LIKE '%تجربة%';

-- Delete test orders
-- DELETE FROM orders WHERE customer_name LIKE '%اختبار%' OR customer_name LIKE '%تجربة%';

-- ====================================
-- TROUBLESHOOTING QUERIES
-- ====================================

-- If notifications are not being sent, check:

-- 1. Are there any errors in the trigger functions?
SELECT * FROM pg_stat_user_functions 
WHERE funcname IN (
    'notify_all_butchers_new_order',
    'auto_forward_to_delivery',
    'update_processing_timestamps'
);

-- 2. Check for any foreign key constraint issues
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='notifications';

-- 3. Check RLS policies on notifications table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';
