
-- Add GPS coordinates to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION;

-- Ensure delivery_zones coordinates column is text (it already exists in schema.ts as text)
-- If it was created as another type, you might need to convert it, but based on the code it's text.
-- ALTER TABLE delivery_zones ALTER COLUMN coordinates TYPE TEXT;

COMMENT ON COLUMN orders.gps_lat IS 'Latitude of the delivery location picked by the user';
COMMENT ON COLUMN orders.gps_lng IS 'Longitude of the delivery location picked by the user';
