
import { supabase } from "./server/supabase";

async function checkUsers() {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) {
            console.error("❌ Error fetching users:", error);
            return;
        }

        console.log("👥 [DB-INSPECT] Users in DB:");
        data?.forEach(u => {
            console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, is_admin: ${u.is_admin}`);
        });
    } catch (e) {
        console.error("💥 Fatal error in inspector:", e);
    }
}

checkUsers();
