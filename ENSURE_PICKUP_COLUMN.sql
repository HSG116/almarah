-- Ensure pickup_details column exists in payout_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payout_requests' 
        AND column_name = 'pickup_details'
    ) THEN
        ALTER TABLE payout_requests ADD COLUMN pickup_details JSONB;
    END IF;
END $$;
