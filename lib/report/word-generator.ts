import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  COMPLIANCE_LEVEL_LABELS_AR,
  FRAMEWORK_LABELS_AR,
  SAFETY_STATUS_LABELS_AR,
  SEVERITY_LABELS_AR,
  SEVERITY_ORDER,
  VERDICT_LABELS_AR,
} from "@/lib/review-display";

import type { ReportData } from "@/lib/report/html-template";
import type {
  ComplianceLevel,
  SafetyStatus,
  Verdict,
} from "@prisma/client";

function complianceLabel(level: ComplianceLevel | null): string {
  return level ? COMPLIANCE_LEVEL_LABELS_AR[level] : "—";
}

function rtlParagraph(
  text: string,
  options?: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; spacing?: number },
): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    heading: options?.heading,
    spacing: options?.spacing ? { after: options.spacing } : undefined,
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        font: "Cairo",
        rightToLeft: true,
      }),
    ],
  });
}

function metaRow(label: string, value: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: "Cairo", rightToLeft: true }),
      new TextRun({ text: value, font: "Cairo", rightToLeft: true }),
    ],
  });
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
} as const;

function tableCell(text: string, isHeader = false): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text,
            bold: isHeader,
            font: "Cairo",
            size: 20,
            rightToLeft: true,
          }),
        ],
      }),
    ],
  });
}

export async function generateWord(data: ReportData): Promise<Buffer> {
  const { review, findings, examinedFiles, reviewerName } = data;
  const accepted = findings.filter((f) => f.accepted);
  const examinable = examinedFiles.filter((f) => f.examinable);
  const notExaminable = examinedFiles.filter((f) => !f.examinable);

  const verdictLabel = review.verdict
    ? VERDICT_LABELS_AR[review.verdict as Verdict]
    : "—";
  const safetyLabel = review.safetyStatus
    ? SAFETY_STATUS_LABELS_AR[review.safetyStatus as SafetyStatus]
    : "—";

  function severityCount(sev: string): number {
    return accepted.filter((f) => f.severity === sev).length;
  }

  const children: (Paragraph | Table)[] = [];

  children.push(
    rtlParagraph("تقرير مراجعة جودة المقرر الإلكتروني", {
      heading: HeadingLevel.TITLE,
    }),
    rtlParagraph("ELQAI — نظام ضمان الجودة بالذكاء الاصطناعي", {
      spacing: 300,
    }),
  );

  children.push(
    rtlParagraph("1. الملخص التنفيذي", { heading: HeadingLevel.HEADING_1 }),
    metaRow("اسم المقرر", review.courseName),
    metaRow("رمز المقرر", review.courseCode),
    metaRow(
      "نطاق المراجعة",
      `${examinedFiles.length} ملف (${examinable.length} قابل للفحص، ${notExaminable.length} غير قابل)`,
    ),
    metaRow(
      "نسبة الجاهزية الإجمالية",
      `${review.overallReadiness ?? "—"} / 100`,
    ),
    metaRow("مستوى التوافق مع Quality Matters", complianceLabel(review.qmLevel)),
    metaRow("مستوى التوافق مع NELC", complianceLabel(review.nelcLevel)),
    metaRow("مستوى جودة المحتوى", complianceLabel(review.contentLevel)),
    metaRow(
      "مستوى الوصول وسهولة الاستخدام",
      complianceLabel(review.accessibilityLevel),
    ),
    metaRow("حالة السلامة الدينية والسياسية والثقافية", safetyLabel),
    metaRow(
      "عدد الملاحظات",
      `حرجة: ${severityCount("CRITICAL")} · عالية: ${severityCount("HIGH")} · متوسطة: ${severityCount("MEDIUM")} · منخفضة: ${severityCount("LOW")}`,
    ),
  );

  children.push(
    rtlParagraph("2. الحكم النهائي", { heading: HeadingLevel.HEADING_1 }),
    rtlParagraph(verdictLabel, { bold: true, spacing: 200 }),
  );

  children.push(
    rtlParagraph("3. الملاحظات التفصيلية", {
      heading: HeadingLevel.HEADING_1,
    }),
  );

  if (accepted.length === 0) {
    children.push(rtlParagraph("لم يتم رصد ملاحظات."));
  } else {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        tableCell("الخطورة", true),
        tableCell("الإطار", true),
        tableCell("المعيار", true),
        tableCell("الوصف", true),
        tableCell("التوصية", true),
        tableCell("الموقع", true),
      ],
    });

    const dataRows = SEVERITY_ORDER.flatMap((sev) =>
      accepted
        .filter((f) => f.severity === sev)
        .map(
          (f) =>
            new TableRow({
              children: [
                tableCell(SEVERITY_LABELS_AR[f.severity]),
                tableCell(FRAMEWORK_LABELS_AR[f.framework]),
                tableCell(f.criterionRef ?? "—"),
                tableCell(f.descriptionAr),
                tableCell(f.recommendationAr),
                tableCell(f.location ?? "—"),
              ],
            }),
        ),
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      }),
    );
  }

  children.push(
    rtlParagraph("4. الملفات التي أمكن فحصها", {
      heading: HeadingLevel.HEADING_1,
    }),
  );
  if (examinable.length === 0) {
    children.push(rtlParagraph("لا توجد ملفات قابلة للفحص."));
  } else {
    examinable.forEach((f) => {
      children.push(rtlParagraph(`— ${f.fileName}`));
    });
  }

  children.push(
    rtlParagraph("5. الملفات التي تعذّر فحصها", {
      heading: HeadingLevel.HEADING_1,
    }),
  );
  if (notExaminable.length === 0) {
    children.push(rtlParagraph("لا توجد ملفات غير قابلة للفحص."));
  } else {
    notExaminable.forEach((f) => {
      children.push(
        rtlParagraph(`— ${f.fileName}${f.reason ? ` — ${f.reason}` : ""}`),
      );
    });
  }

  const signOffDate = review.signedOffAt
    ? review.signedOffAt.toLocaleDateString("ar", {
        numberingSystem: "latn",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  children.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    metaRow("المراجع", reviewerName),
    metaRow("تاريخ الاعتماد", signOffDate),
    rtlParagraph("تم إنشاء هذا التقرير بواسطة نظام ELQAI", { spacing: 100 }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
