import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { saveCourseExport } from "@/lib/storage";

// WHY: large .zip uploads must NOT go through a Server Action — its multipart
// parser buffers the whole body and fails ("Unexpected end of form" / body
// size limit). This route only receives the file; the Review row is still
// created by the createReview Server Action with metadata only.

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "يجب رفع ملف تصدير المقرر (.zip)" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "يجب أن يكون الملف بصيغة .zip" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد الأقصى (200 ميجابايت)" },
        { status: 413 }
      );
    }

    // WHY: the storage path is generated server-side (never taken from the
    // client) and scoped to the user's org
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const storagePath = `exports/${user.orgId}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveCourseExport(storagePath, buffer);

    return NextResponse.json({ storagePath });
  } catch {
    return NextResponse.json(
      { error: "فشل رفع الملف. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
