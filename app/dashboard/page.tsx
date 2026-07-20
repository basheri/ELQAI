export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getDashboardStats } from "@/actions/dashboard";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role !== "LEADERSHIP" && user.role !== "ADMIN") {
    redirect("/");
  }

  const stats = await getDashboardStats();
  if (!stats) redirect("/");

  return (
    <AppShell userName={user.name}>
      <DashboardView stats={stats} />
    </AppShell>
  );
}
