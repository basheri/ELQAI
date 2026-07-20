import * as unzipper from "unzipper";
import { Readable } from "stream";

export interface ParsedFile {
  fileName: string;
  fileType: string;
  content: string | null;
  examinable: boolean;
  reason: string | null;
}

const EXAMINABLE_EXTENSIONS = new Set(["html", "htm", "pdf", "docx", "pptx", "txt", "xml"]);

const NON_EXAMINABLE_REASONS: Record<string, string> = {
  mp4: "فيديو — غير قابل للتقييم آلياً",
  mp3: "صوت — غير قابل للتقييم آلياً",
  wav: "صوت — غير قابل للتقييم آلياً",
  ogg: "صوت — غير قابل للتقييم آلياً",
  webm: "فيديو — غير قابل للتقييم آلياً",
  avi: "فيديو — غير قابل للتقييم آلياً",
  mov: "فيديو — غير قابل للتقييم آلياً",
  png: "صورة — غير قابلة للتقييم النصي",
  jpg: "صورة — غير قابلة للتقييم النصي",
  jpeg: "صورة — غير قابلة للتقييم النصي",
  gif: "صورة — غير قابلة للتقييم النصي",
  svg: "صورة — غير قابلة للتقييم النصي",
  zip: "ملف مضغوط — محتمل SCORM أو تفاعلي",
  swf: "Flash — محتوى تفاعلي قديم",
};

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isSystemFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.includes("__macosx") ||
    lower.includes(".ds_store") ||
    lower.includes("thumbs.db") ||
    lower.startsWith(".")
  );
}

export async function parseBlackboardExport(
  zipBuffer: Buffer
): Promise<ParsedFile[]> {
  const files: ParsedFile[] = [];
  const stream = Readable.from(zipBuffer);

  const directory = await stream.pipe(unzipper.Parse({ forceStream: true }));

  for await (const entry of directory) {
    const typedEntry = entry as unzipper.Entry;
    const fileName = typedEntry.path;

    if (typedEntry.type === "Directory" || isSystemFile(fileName)) {
      typedEntry.autodrain();
      continue;
    }

    const ext = getExtension(fileName);
    const examinable = EXAMINABLE_EXTENSIONS.has(ext);

    let content: string | null = null;
    if (examinable) {
      const buf = await typedEntry.buffer();
      if (ext === "html" || ext === "htm" || ext === "txt" || ext === "xml") {
        content = buf.toString("utf-8");
      } else {
        content = buf.toString("base64");
      }
    } else {
      typedEntry.autodrain();
    }

    files.push({
      fileName,
      fileType: ext || "other",
      examinable,
      reason: examinable ? null : (NON_EXAMINABLE_REASONS[ext] ?? "نوع ملف غير مدعوم للتقييم"),
      content,
    });
  }

  return files;
}
