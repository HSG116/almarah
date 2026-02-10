-- Function to decrement staff wallet balance atomicity
CREATE OR REPLACE FUNCTION decrement_staff_wallet(p_staff_id INTEGER, p_amount REAL)
RETURNS VOID AS $$
BEGIN
    UPDATE staff 
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for financial_records if not already enabled
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Policy for financial_records
DROP POLICY IF EXISTS "Admins can manage financial records" ON financial_records;
CREATE POLICY "Admins can manage financial records" 
ON financial_records FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.role = 'accountant'))
);

DROP POLICY IF EXISTS "Staff can view own financial records" ON financial_records;
CREATE POLICY "Staff can view own financial records" 
ON financial_records FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = financial_records.staff_id AND staff.user_id = auth.uid())
);
