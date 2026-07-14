import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";

import { getCurrentUser } from "@/lib/current-user";

import type { ReactNode } from "react";

// WHY: shared shell for every authenticated route. Re-checks the session
// server-side (defence-in-depth alongside middleware) and renders the top bar.
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} userRole={user.role} />
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
