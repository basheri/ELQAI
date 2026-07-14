import { createClient } from "@supabase/supabase-js";

// WHY: server-only Supabase client using the service-role key. Used for
// privileged Storage operations (uploading course exports). This key must NEVER
// reach the client (governance rule #6) — only import this from Server Actions
// or server-side modules, never from a "use client" component.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
