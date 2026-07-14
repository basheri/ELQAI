// PII scrubber — GOVERNANCE CRITICAL (docs/governance.md rule #3).
//
// Blackboard exports can contain student submissions, grades, discussion posts,
// and rosters. This module produces a clean instructional-content payload with
// all such data removed. It MUST run before any Claude API call — raw export
// content is never sent to the API. Two layers:
//   1. structural exclusion — drop whole content items that come from
//      student-data areas of the export (gradebook, discussions, submissions,
//      roster, journals/blogs, messages).
//   2. redaction — scrub residual PII (emails, IDs/phones, labeled grades, and
//      any known student identifiers) from the retained instructional text.

export interface ContentItem {
  /** Source path of the content within the export (used to detect student areas). */
  path: string;
  /** Extracted instructional text of the file. */
  text: string;
}

export interface ScrubOptions {
  /**
   * Known student identifiers (names/emails/ids) gathered from the export roster,
   * redacted verbatim from any retained content. Optional but strongly preferred.
   */
  studentIdentifiers?: string[];
}

export interface ScrubResult {
  /** Concatenated, scrubbed instructional content — safe to send to the API. */
  cleanText: string;
  /** Paths dropped entirely as student-data areas. */
  excludedPaths: string[];
  /** Number of redactions applied to retained content. */
  redactionCount: number;
}

export const REDACTION_PLACEHOLDER = "[محجوب]";

// WHY: path tokens that mark a Blackboard student-data area. Matched on tokenized
// path segments so we exclude the whole item rather than trying to redact it.
const STUDENT_DATA_TOKENS = new Set([
  "gradebook",
  "gradecenter",
  "gradehistory",
  "grades",
  "grade",
  "discussionboard",
  "discussion",
  "discussions",
  "forum",
  "forums",
  "conference",
  "conferences",
  "submission",
  "submissions",
  "attempt",
  "attempts",
  "roster",
  "rosters",
  "membership",
  "memberships",
  "enrollment",
  "enrollments",
  "user",
  "users",
  "journal",
  "journals",
  "blog",
  "blogs",
  "message",
  "messages",
]);

function tokenizePath(path: string): string[] {
  return path
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// WHY: a content item is student data if any of its path tokens is a known
// student-data marker. Governance favors over-exclusion over any leak.
export function isStudentDataPath(path: string): boolean {
  return tokenizePath(path).some((token) => STUDENT_DATA_TOKENS.has(token));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// WHY: redact residual PII from retained instructional text. Returns the scrubbed
// text and a count of replacements for auditability (we never log the content).
export function redactPii(
  input: string,
  studentIdentifiers: string[] = [],
): { text: string; count: number } {
  let text = input;
  let count = 0;

  const apply = (pattern: RegExp): void => {
    text = text.replace(pattern, () => {
      count += 1;
      return REDACTION_PLACEHOLDER;
    });
  };

  // Known student identifiers first (names/emails/ids from the roster).
  for (const identifier of studentIdentifiers) {
    const trimmed = identifier.trim();
    // WHY: skip very short tokens to avoid redacting common substrings.
    if (trimmed.length < 3) {
      continue;
    }
    apply(new RegExp(escapeRegExp(trimmed), "gi"));
  }

  // Email addresses.
  apply(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);

  // Labeled grades/scores (Arabic + English), e.g. "الدرجة: 95", "Grade 88/100".
  apply(
    /(?:الدرجة|درجة|العلامة|علامة|grade|score|mark)\s*[:：=]?\s*\d+(?:\s*\/\s*\d+)?\s*%?/gi,
  );

  // Bare score fractions, e.g. "95/100".
  apply(/\b\d{1,3}\s*\/\s*\d{1,3}\b/g);

  // Long digit runs — student/national IDs and phone numbers (6+ digits).
  apply(/\b\d{6,}\b/g);

  return { text, count };
}

// WHY: the entry point used by the analysis pipeline (Step 7) — drops
// student-data items and redacts the rest into one clean payload. This is the
// mandatory pre-processing before any Claude API call.
export function scrubContent(
  items: ContentItem[],
  options: ScrubOptions = {},
): ScrubResult {
  const excludedPaths: string[] = [];
  const retained: string[] = [];
  let redactionCount = 0;

  for (const item of items) {
    if (isStudentDataPath(item.path)) {
      excludedPaths.push(item.path);
      continue;
    }

    const { text, count } = redactPii(item.text, options.studentIdentifiers);
    redactionCount += count;
    // WHY: prefix with the (non-PII) file path so the analyzer can cite locations.
    retained.push(`# ${item.path}\n${text}`);
  }

  return {
    cleanText: retained.join("\n\n"),
    excludedPaths,
    redactionCount,
  };
}
