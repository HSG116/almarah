
import { supabase } from "./server/supabase";

async function fixAdmin() {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ role: 'admin', is_admin: true })
            .eq('username', 'hsg')
            .select();

        if (error) {
            console.error("❌ Error updating admin:", error);
            return;
        }

        console.log("✅ [FIX-ADMIN] User 'hsg' updated successfully:", data);
    } catch (e) {
        console.error("💥 Fatal error in fixer:", e);
    }
}

fixAdmin();
