-- Add detailed address columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS building text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gps_lat real;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gps_lng real;

-- Add payment method to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
