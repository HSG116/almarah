
import { supabase } from "./server/supabase.js";

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error("❌ Error fetching users:", error);
        return;
    }

    console.log("👥 [DB-INSPECT] Users in DB:");
    data.forEach(u => {
        console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, IsAdminField: ${u.is_admin}`);
    });
}

checkUsers();
