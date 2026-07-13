import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Org, User } from "@prisma/client";

export type CurrentUser = User & { org: Org };

// WHY: resolves the authenticated Supabase identity to the app's User + Org
// rows (linked by unique email, created on first login in actions/auth.ts).
// Returns null when there is no session or no matching row so callers can gate.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return db.user.findUnique({
    where: { email: user.email },
    include: { org: true },
  });
}
