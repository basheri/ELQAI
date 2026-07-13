"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export interface FindingActionState {
  error?: string;
}

// WHY: the reviewer's edited version of a finding. Saving marks it overridden
// (human-authored) and accepted (included in the report).
const UpdateFindingSchema = z.object({
  findingId: z.string().min(1),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  descriptionAr: z.string().trim().min(1, "وصف الملاحظة مطلوب."),
  recommendationAr: z.string().trim().min(1, "التوصية مطلوبة."),
  location: z.string().trim().max(300).optional().nullable(),
});

export type UpdateFindingInput = z.infer<typeof UpdateFindingSchema>;

// WHY: load a finding only if it belongs to the current org, and surface whether
// its review is signed off (locked). Reviewers can't touch other orgs' findings
// or edit a signed-off review (governance rule #1).
async function loadEditableFinding(findingId: string, orgId: string) {
  return db.finding.findFirst({
    where: { id: findingId, review: { orgId } },
    include: { review: { select: { signedOffAt: true } } },
  });
}

export async function updateFinding(
  input: UpdateFindingInput,
): Promise<FindingActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  const parsed = UpdateFindingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const finding = await loadEditableFinding(parsed.data.findingId, user.orgId);
  if (!finding) {
    return { error: "الملاحظة غير موجودة." };
  }
  if (finding.review.signedOffAt) {
    return { error: "تم اعتماد المراجعة ولا يمكن تعديل الملاحظات." };
  }

  try {
    await db.finding.update({
      where: { id: finding.id },
      data: {
        severity: parsed.data.severity,
        descriptionAr: parsed.data.descriptionAr,
        recommendationAr: parsed.data.recommendationAr,
        location: parsed.data.location?.trim() ? parsed.data.location.trim() : null,
        overridden: true,
        accepted: true,
      },
    });
  } catch {
    return { error: "تعذّر حفظ التعديل، يرجى المحاولة لاحقاً." };
  }

  revalidatePath(`/reviews/${finding.reviewId}`);
  return {};
}

// WHY: exclude a finding from the report (accepted=false) or re-include it. The
// report uses only accepted findings.
export async function setFindingAccepted(
  findingId: string,
  accepted: boolean,
): Promise<FindingActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  const finding = await loadEditableFinding(findingId, user.orgId);
  if (!finding) {
    return { error: "الملاحظة غير موجودة." };
  }
  if (finding.review.signedOffAt) {
    return { error: "تم اعتماد المراجعة ولا يمكن تعديل الملاحظات." };
  }

  try {
    await db.finding.update({
      where: { id: findingId },
      data: { accepted },
    });
  } catch {
    return { error: "تعذّر تحديث الملاحظة، يرجى المحاولة لاحقاً." };
  }

  revalidatePath(`/reviews/${finding.reviewId}`);
  return {};
}
