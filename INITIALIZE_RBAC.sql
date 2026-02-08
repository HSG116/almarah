
-- 1. Add role and permissions to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "permissions" text[] DEFAULT '{}';

-- 2. Create staff table
CREATE TABLE IF NOT EXISTS "staff" (
  "id" serial PRIMARY KEY,
  "user_id" uuid REFERENCES users(id),
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "role" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "joined_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "permissions" text[] DEFAULT '{}'
);

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. Enable RLS (if not already enabled)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 5. Policies for staff table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'staff') THEN
        CREATE POLICY "Enable read access for all users" ON staff FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access for admins' AND tablename = 'staff') THEN
        CREATE POLICY "Enable all access for admins" ON staff FOR ALL USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 6. Pre-fill some staff permissions examples
-- Note: 'full_access' for Admin, 'manage_orders' for Order Manager, etc.
