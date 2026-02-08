import { createClient } from '@supabase/supabase-js';

// ✅ Supabase Configuration
// Project: https://supabase.com/dashboard/project/rfwnclhnxhatnybxjlhm
const supabaseUrl = "https://rfwnclhnxhatnybxjlhm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmd25jbGhueGhhdG55YnhqbGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxMDcsImV4cCI6MjA4NDc1ODEwN30.R2FMF28to8nEtyN8yPgD7moO1RU2qzRE2nZHlHQuXWA";

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Supabase URL or Key is missing!");
    console.error("📝 Please update client/src/lib/supabase.ts with your Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
