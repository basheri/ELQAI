import Link from "next/link";

import { Button } from "@/components/ui/button";

import { signOut } from "@/actions/auth";

interface AppHeaderProps {
  userEmail: string;
}

// WHY: the shared RTL top bar for every authenticated page — app name on the
// start side, the signed-in user + sign-out on the end side.
export function AppHeader({ userEmail }: AppHeaderProps) {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          ELQAI
        </Link>

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
