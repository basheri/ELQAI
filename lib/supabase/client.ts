import { createBrowserClient } from "@supabase/ssr";

// WHY: browser client for client components (e.g. the login form). Only the
// public URL + anon key are exposed here — never the service-role key.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
