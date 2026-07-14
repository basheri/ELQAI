import unzipper from "unzipper";

// WHY: the inventory the reviewer sees is derived purely from the export's
// content files. fileType values match the ExaminedFile.fileType comment in
// schema.prisma (html | pdf | docx | pptx | video | audio | scorm | other).
export interface ClassifiedFile {
  fileName: string;
  fileType: string;
  examinable: boolean;
  reason: string | null;
}

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "wmv",
  "flv",
  "m4v",
  "mpg",
  "mpeg",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "wma",
  "flac",
]);

const INTERACTIVE_EXTENSIONS = new Set(["swf"]);

// WHY: Blackboard packaging/metadata files that are not course content and must
// never appear in the inventory.
const SKIPPED_BASENAMES = new Set([
  "imsmanifest.xml",
  ".bb-package-info",
  "manifest.xml",
]);

const SKIPPED_EXTENSIONS = new Set(["dat", "xml"]);

function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

// WHY: turn one zip entry path into an ExaminedFile classification, or null when
// the entry is a directory / packaging metadata that should be skipped entirely.
export function classifyEntry(path: string): ClassifiedFile | null {
  if (!path || path.endsWith("/")) {
    return null;
  }

  const base = path.split("/").pop() ?? "";
  // WHY: skip empty names and hidden/system dotfiles (e.g. __MACOSX, .DS_Store).
  if (!base || base.startsWith(".") || path.startsWith("__MACOSX/")) {
    return null;
  }

  const lower = base.toLowerCase();
  if (SKIPPED_BASENAMES.has(lower)) {
    return null;
  }

  const extension = extensionOf(path);
  if (SKIPPED_EXTENSIONS.has(extension)) {
    return null;
  }

  switch (extension) {
    case "html":
    case "htm":
      return { fileName: path, fileType: "html", examinable: true, reason: null };
    case "pdf":
      return { fileName: path, fileType: "pdf", examinable: true, reason: null };
    case "docx":
      return { fileName: path, fileType: "docx", examinable: true, reason: null };
    case "pptx":
      return { fileName: path, fileType: "pptx", examinable: true, reason: null };
    default:
      break;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return {
      fileName: path,
      fileType: "video",
      examinable: false,
      reason: "ملف فيديو — يتعذّر فحص محتواه آلياً.",
    };
  }

  if (AUDIO_EXTENSIONS.has(extension)) {
    return {
      fileName: path,
      fileType: "audio",
      examinable: false,
      reason: "ملف صوتي — يتعذّر فحص محتواه آلياً.",
    };
  }

  if (INTERACTIVE_EXTENSIONS.has(extension)) {
    return {
      fileName: path,
      fileType: "scorm",
      examinable: false,
      reason: "محتوى تفاعلي (Flash) — يتعذّر فحصه آلياً.",
    };
  }

  if (extension === "zip") {
    return {
      fileName: path,
      fileType: "scorm",
      examinable: false,
      reason: "حزمة مضغوطة/تفاعلية (SCORM) — يتعذّر فحصها آلياً.",
    };
  }

  return {
    fileName: path,
    fileType: "other",
    examinable: false,
    reason: extension
      ? `صيغة غير مدعومة للفحص (‎.${extension}).`
      : "نوع ملف غير معروف — يتعذّر فحصه آلياً.",
  };
}

// WHY: classify a list of entry paths (examinable first, then alphabetical) —
// the pure core, unit-tested without needing a real zip.
export function classifyEntries(paths: string[]): ClassifiedFile[] {
  const seen = new Set<string>();
  const results: ClassifiedFile[] = [];

  for (const path of paths) {
    const classified = classifyEntry(path);
    if (classified && !seen.has(classified.fileName)) {
      seen.add(classified.fileName);
      results.push(classified);
    }
  }

  results.sort((a, b) => {
    if (a.examinable !== b.examinable) {
      return a.examinable ? -1 : 1;
    }
    return a.fileName.localeCompare(b.fileName);
  });

  return results;
}

// WHY: unzip the stored export (in memory), read the manifest to confirm it is a
// package, and enumerate the content files. We only need entry names for the
// inventory, so file bodies are never buffered.
export async function parseBlackboardExport(
  zipBuffer: Buffer,
): Promise<ClassifiedFile[]> {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const paths = directory.files
    .filter((entry) => entry.type === "File")
    .map((entry) => entry.path);

  return classifyEntries(paths);
}
