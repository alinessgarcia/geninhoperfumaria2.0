import { createClient } from "@supabase/supabase-js";

export const hasSupabaseServerConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
