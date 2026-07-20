"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
}

export function AppShell({ children, userName }: AppShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <h1 className="text-lg font-bold">ELQAI</h1>
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-muted-foreground">{userName}</span>
            )}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                تسجيل الخروج
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
