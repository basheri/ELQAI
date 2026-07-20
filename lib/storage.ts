import { promises as fs } from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// WHY: course exports live in Supabase Storage in production, but local dev
// often runs with placeholder Supabase credentials. This layer falls back to
// a local ./uploads directory (gitignored) so the full review flow works
// without external services.

const BUCKET = "course-exports";
const LOCAL_ROOT = path.join(process.cwd(), "uploads");

export function isSupabaseStorageConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("YOUR-PROJECT") &&
    key.length > 0 &&
    !key.startsWith("your-")
  );
}

// WHY: service-role client bypasses storage RLS for server-side upload/download;
// the key never leaves the server (this module must only be imported server-side)
function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// WHY: storagePath originates from the client on review creation — resolve it
// and refuse anything that escapes the uploads root
function resolveLocalPath(storagePath: string): string {
  const resolved = path.resolve(LOCAL_ROOT, storagePath);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error("مسار الملف غير صالح");
  }
  return resolved;
}

export async function saveCourseExport(
  storagePath: string,
  data: Buffer
): Promise<void> {
  if (isSupabaseStorageConfigured()) {
    const { error } = await serviceClient()
      .storage.from(BUCKET)
      .upload(storagePath, data, { contentType: "application/zip" });
    if (error) throw new Error(error.message);
    return;
  }

  const localPath = resolveLocalPath(storagePath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, data);
}

export async function loadCourseExport(storagePath: string): Promise<Buffer> {
  if (isSupabaseStorageConfigured()) {
    const { data, error } = await serviceClient()
      .storage.from(BUCKET)
      .download(storagePath);
    if (error || !data) {
      throw new Error(error?.message ?? "تعذر تحميل الملف من التخزين");
    }
    return Buffer.from(await data.arrayBuffer());
  }

  return fs.readFile(resolveLocalPath(storagePath));
}
