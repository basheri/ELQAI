"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "بيانات الدخول غير صالحة" };
  }

  // WHY: auth disabled for development — skip Supabase, go straight to app
  redirect("/");
}

export async function signOut() {
  redirect("/login");
}

export async function getCurrentUser() {
  // WHY: auth disabled for development — return or create a dev user
  try {
    let user = await db.user.findFirst({
      include: { org: true },
    });

    if (!user) {
      let org = await db.org.findFirst();
      if (!org) {
        org = await db.org.create({
          data: { name: "المؤسسة الافتراضية" },
        });
      }
      user = await db.user.create({
        data: {
          email: "dev@elqai.local",
          name: "مطوّر",
          role: "ADMIN",
          orgId: org.id,
        },
        include: { org: true },
      });
    }

    return user;
  } catch {
    // WHY: if DB is not connected, return a mock user so pages still render
    return {
      id: "dev-user",
      email: "dev@elqai.local",
      name: "مطوّر",
      role: "ADMIN" as const,
      orgId: "dev-org",
      org: { id: "dev-org", name: "المؤسسة الافتراضية" },
      createdAt: new Date(),
    };
  }
}
