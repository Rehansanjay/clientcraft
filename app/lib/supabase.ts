import { createClient } from "@supabase/supabase-js";

// Vercel Guard: Use dummy strings if env vars are missing during build phase
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || "https://placeholder.supabase.co";
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});