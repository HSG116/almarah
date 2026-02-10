CREATE TABLE IF NOT EXISTS payout_requests (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    method TEXT NOT NULL DEFAULT 'bank_transfer',
    notes TEXT,
    pickup_details JSONB, -- Added for cash pickup info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated staff can insert their own payout requests
DROP POLICY IF EXISTS "Staff can insert own payout requests" ON payout_requests;
CREATE POLICY "Staff can insert own payout requests" 
ON payout_requests FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM staff 
        WHERE staff.id = payout_requests.staff_id 
        AND staff.user_id = auth.uid()
    )
);

-- Policy: Admin and Accountant can view all, Staff can view their own
DROP POLICY IF EXISTS "Users can view relevant payout requests" ON payout_requests;
CREATE POLICY "Users can view relevant payout requests" 
ON payout_requests FOR SELECT 
TO authenticated 
USING (
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.role = 'accountant')))
    OR
    (EXISTS (SELECT 1 FROM staff WHERE staff.id = payout_requests.staff_id AND staff.user_id = auth.uid()))
);

-- Policy: Admin and Accountant can update payout requests (approve/reject)
DROP POLICY IF EXISTS "Admins can update payout requests" ON payout_requests;
CREATE POLICY "Admins can update payout requests" 
ON payout_requests FOR UPDATE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.role = 'accountant'))
);

-- Enable realtime for this table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'payout_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payout_requests;
    END IF;
END $$;
