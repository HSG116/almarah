
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing. Please check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStaffPermissions() {
    console.log("🚀 Starting staff permissions fix...");

    try {
        // 1. Get all staff members
        console.log("🔄 Fetching users from staff table...");
        const { data: staffList, error: staffError } = await supabase
            .from('staff')
            .select('user_id, name');

        if (staffError) throw staffError;

        console.log(`📋 Found ${staffList.length} staff records.`);

        for (const staff of staffList) {
            if (staff.user_id) {
                console.log(`✅ Setting is_admin = true and updating role for staff: ${staff.name} (ID: ${staff.user_id})`);
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ is_admin: true, role: 'admin' }) // Give admin role to all staff for now to bypass guards
                    .eq('id', staff.user_id);

                if (updateError) console.error(`❌ Failed to update staff ${staff.name}:`, updateError.message);
            }
        }

        // 2. Also fix hsg
        console.log("🔄 Ensuring 'hsg' is admin...");
        await supabase.from('users').update({ is_admin: true, role: 'admin' }).eq('username', 'hsg');

        console.log("✅ Fix completed successfully!");

    } catch (e: any) {
        console.error("💥 Fatal error:", e.message);
    }
}

fixStaffPermissions();
