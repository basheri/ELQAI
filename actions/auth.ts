"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }

  // WHY: ensure user + org rows exist on first login (single default org for MVP)
  if (data.user) {
    const existing = await db.user.findUnique({
      where: { email: data.user.email! },
    });

    if (!existing) {
      let org = await db.org.findFirst();
      if (!org) {
        org = await db.org.create({
          data: { name: "المؤسسة الافتراضية" },
        });
      }
      await db.user.create({
        data: {
          email: data.user.email!,
          name: data.user.email!.split("@")[0],
          orgId: org.id,
        },
      });
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return db.user.findUnique({
    where: { email: user.email },
    include: { org: true },
  });
}
