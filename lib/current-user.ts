import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Org, User } from "@prisma/client";

export type CurrentUser = User & { org: Org };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // WHY: dev bypass — return a fixed dev user without Supabase auth.
  if (process.env.DEV_BYPASS_AUTH === "true") {
    const user = await db.user.findFirst({
      include: { org: true },
    });
    return user ?? null;
  }

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
