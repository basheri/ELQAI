import Link from "next/link";

import { Button } from "@/components/ui/button";

import { signOut } from "@/actions/auth";

import type { Role } from "@prisma/client";

interface AppHeaderProps {
  userEmail: string;
  userRole: Role;
}

export function AppHeader({ userEmail, userRole }: AppHeaderProps) {
  const showDashboard = userRole === "ADMIN" || userRole === "LEADERSHIP";

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            ELQAI
          </Link>
          {showDashboard ? (
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              لوحة المؤشرات
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            <span dir="ltr">{userEmail}</span>
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
