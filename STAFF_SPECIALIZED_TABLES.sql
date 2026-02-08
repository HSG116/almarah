
-- Tables for Specialized Staff Roles

-- 1. Butcher/Processing Logs
CREATE TABLE IF NOT EXISTS butcher_logs (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    order_id INTEGER REFERENCES orders(id),
    action_type TEXT NOT NULL, -- 'preparation', 'cutting', 'packaging'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Delivery Management (Trips and Performance)
CREATE TABLE IF NOT EXISTS delivery_trips (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    order_id INTEGER REFERENCES orders(id),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    distance REAL,
    fuel_cost REAL,
    status TEXT DEFAULT 'ongoing', -- 'ongoing', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Accountant / Financial Records
CREATE TABLE IF NOT EXISTS financial_records (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    type TEXT NOT NULL, -- 'income', 'expense', 'adjustment'
    amount REAL NOT NULL,
    category TEXT, -- 'salary', 'inventory', 'delivery_fee', 'other'
    description TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    user_id UUID REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    subject TEXT NOT NULL,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Designer / Marketing Tasks
CREATE TABLE IF NOT EXISTS marketing_tasks (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    title TEXT NOT NULL,
    description TEXT,
    target_platform TEXT, -- 'app', 'instagram', 'snapchat'
    image_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_review', 'published'
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a JSON column to staff for role-specific settings if needed later
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_settings JSONB DEFAULT '{}';
