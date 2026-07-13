import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";

import { signOut } from "@/actions/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // WHY: middleware already gates this route, but re-checking server-side here is
  // defence-in-depth per CLAUDE.md (protected routes verify the session server-side).
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">ELQAI</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          منصة ذكية لتدقيق جودة المحتوى التعليمي والمقررات الإلكترونية.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        مسجّل الدخول باسم <span dir="ltr">{user.email}</span>
      </p>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          تسجيل الخروج
        </Button>
      </form>
    </main>
  );
}
