const PII_PATTERNS = [
  // WHY: Blackboard exports may embed student names in grade/roster tables
  /(?:student|طالب|اسم الطالب)[:\s]*[^\n<]{2,50}/gi,
  // WHY: email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // WHY: Saudi national ID format (10 digits starting with 1 or 2)
  /\b[12]\d{9}\b/g,
  // WHY: phone numbers (Saudi format)
  /\b(?:\+?966|05)\d{8,9}\b/g,
  // WHY: grade/score patterns in context
  /(?:grade|score|درجة|علامة|تقدير)[:\s]*\d{1,3}(?:\s*[/%])?/gi,
];

const STUDENT_CONTENT_MARKERS = [
  "student_submission",
  "submission_text",
  "attempt_",
  "grade_",
  "roster",
  "gradebook",
  "discussion_board",
  "journal_entry",
  "blog_entry",
];

export function isStudentContent(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return STUDENT_CONTENT_MARKERS.some((marker) => lower.includes(marker));
}

export function scrubPii(text: string): string {
  let scrubbed = text;
  for (const pattern of PII_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, "[REDACTED]");
  }
  return scrubbed;
}

export interface ScrubResult {
  cleanContent: string;
  piiRemoved: boolean;
  studentFilesExcluded: string[];
}

export function scrubCourseContent(
  files: Array<{ fileName: string; content: string | null }>
): ScrubResult {
  const studentFilesExcluded: string[] = [];
  const cleanParts: string[] = [];
  let piiRemoved = false;

  for (const file of files) {
    if (!file.content) continue;

    if (isStudentContent(file.fileName)) {
      studentFilesExcluded.push(file.fileName);
      continue;
    }

    const scrubbed = scrubPii(file.content);
    if (scrubbed !== file.content) {
      piiRemoved = true;
    }

    cleanParts.push(`--- ${file.fileName} ---\n${scrubbed}`);
  }

  return {
    cleanContent: cleanParts.join("\n\n"),
    piiRemoved,
    studentFilesExcluded,
  };
}
