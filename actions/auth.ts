"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// WHY: single default organization for the MVP; every reviewer is attached to it
// on first login. Multi-tenant rollout later reuses the same Org model.
const DEFAULT_ORG_NAME = "الجهة الافتراضية";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthState {
  error?: string;
}

// WHY: on first successful login, guarantee the reviewer has an Org + User row.
// Matched by unique email (the schema links app users to auth by email). Wrapped
// in a transaction so the Org and User are created atomically.
async function ensureUserAndOrg(email: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const existingOrg = await tx.org.findFirst({
      where: { name: DEFAULT_ORG_NAME },
    });
    const org =
      existingOrg ?? (await tx.org.create({ data: { name: DEFAULT_ORG_NAME } }));

    await tx.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split("@")[0],
        orgId: org.id,
      },
    });
  });
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "يرجى إدخال بريد إلكتروني وكلمة مرور صحيحين." };
  }

  const { email, password } = parsed.data;

  const rate = checkRateLimit(`signin:${email.toLowerCase()}`);
  if (!rate.allowed) {
    return {
      error: `محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد ${rate.retryAfterSeconds} ثانية.`,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return { error: "بيانات الدخول غير صحيحة." };
    }

    await ensureUserAndOrg(data.user.email ?? email);
  } catch {
    return { error: "تعذّر تسجيل الدخول، يرجى المحاولة لاحقاً." };
  }

  // WHY: redirect() throws NEXT_REDIRECT, so it must run outside the try/catch
  // above or it would be swallowed as an error.
  redirect("/");
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // WHY: even if the remote sign-out call fails, we still send the user to the
    // login page; the middleware will re-check the (now invalid) session.
  }

  redirect("/login");
}
