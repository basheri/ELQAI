import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// WHY: Supabase server client for Server Components, Server Actions, and Route
// Handlers. Reads/writes the auth session via Next's cookie store. Uses the
// public URL + anon key only — the service-role key never touches this path.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // WHY: setAll is called from a Server Component render where cookies
            // are read-only; the middleware refreshes the session instead, so
            // this can be safely ignored.
          }
        },
      },
    },
  );
}
