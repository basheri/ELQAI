import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import unzipper from "unzipper";

export interface ExtractedContent {
  path: string;
  text: string;
}

export interface ExaminableRef {
  fileName: string;
  fileType: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

// WHY: reduce course HTML to plain instructional text — drop script/style, strip
// tags, decode common entities, collapse whitespace. Exported for unit testing.
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => HTML_ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// WHY: pptx is itself a zip; pull the text runs (<a:t> nodes) from each slide.
async function extractPptxText(buffer: Buffer): Promise<string> {
  const directory = await unzipper.Open.buffer(buffer);
  const slides = directory.files.filter((entry) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(entry.path),
  );

  const parts: string[] = [];
  for (const slide of slides) {
    const xml = (await slide.buffer()).toString("utf-8");
    const runs = xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? [];
    parts.push(runs.map((run) => run.replace(/<\/?a:t>/g, "")).join(" "));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function extractOne(
  fileType: string,
  buffer: Buffer,
): Promise<string> {
  switch (fileType) {
    case "html":
      return stripHtml(buffer.toString("utf-8"));
    case "pdf":
      return (await pdfParse(buffer)).text.replace(/\s+/g, " ").trim();
    case "docx":
      return (await mammoth.extractRawText({ buffer })).value
        .replace(/\s+/g, " ")
        .trim();
    case "pptx":
      return extractPptxText(buffer);
    default:
      return "";
  }
}

// WHY: extract instructional text from the examinable files in the export. Only
// the examinable set is read (video/audio/etc. are never opened). Unreadable
// files are skipped rather than failing the whole analysis.
export async function extractInstructionalContent(
  zipBuffer: Buffer,
  examinable: ExaminableRef[],
): Promise<ExtractedContent[]> {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const byPath = new Map(
    directory.files
      .filter((entry) => entry.type === "File")
      .map((entry) => [entry.path, entry] as const),
  );

  const results: ExtractedContent[] = [];
  for (const file of examinable) {
    const entry = byPath.get(file.fileName);
    if (!entry) {
      continue;
    }
    try {
      const buffer = await entry.buffer();
      const text = (await extractOne(file.fileType, buffer)).trim();
      if (text) {
        results.push({ path: file.fileName, text });
      }
    } catch {
      // WHY: a single corrupt/unsupported file must not abort extraction.
    }
  }

  return results;
}
