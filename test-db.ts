
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing. Please check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Checking tables...");

    const { data: users, error: usersError } = await supabase.from('users').select('id').limit(1);
    if (usersError) console.error("Users table error:", usersError.message);
    else console.log("Users table exists.");

    const { data: staff, error: staffError } = await supabase.from('staff').select('id').limit(1);
    if (staffError) console.error("Staff table error:", staffError.message);
    else console.log("Staff table exists.");
}

test();
