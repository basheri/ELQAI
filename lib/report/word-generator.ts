import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Packer,
} from "docx";
import type { Review, Finding, ExaminedFile, User } from "@/types";
import {
  VERDICT_LABELS,
  SEVERITY_LABELS,
  COMPLIANCE_LABELS,
  SAFETY_LABELS,
  FRAMEWORK_LABELS,
} from "@/types";

interface ReportData {
  review: Review & {
    findings: Finding[];
    examinedFiles: ExaminedFile[];
    reviewedBy: User | null;
  };
}

function textRun(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: "Cairo", size: 24, rightToLeft: true });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [textRun(text, true)],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
      }),
    ],
    shading: { fill: "F5F5F5" },
  });
}

function cell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [textRun(text)],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
      }),
    ],
  });
}

function summaryRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [headerCell(label), cell(value)],
  });
}

function severityCount(findings: Finding[], severity: string): number {
  return findings.filter((f) => f.accepted && f.severity === severity).length;
}

export async function generateWord(data: ReportData): Promise<Buffer> {
  const { review } = data;
  const examinable = review.examinedFiles.filter((f) => f.examinable);
  const notExaminable = review.examinedFiles.filter((f) => !f.examinable);
  const acceptedFindings = review.findings.filter((f) => f.accepted);

  const findingsByFramework = acceptedFindings.reduce(
    (acc, f) => {
      const key = f.framework;
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    },
    {} as Record<string, Finding[]>
  );

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
  } as const;

  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      text: "تقرير مراجعة جودة المقرر الإلكتروني",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      bidirectional: true,
    }),
    new Paragraph({
      text: "ELQAI — ضمان جودة المقررات الإلكترونية بالذكاء الاصطناعي",
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 400 },
    })
  );

  sections.push(
    new Paragraph({
      text: "1. الملخص التنفيذي",
      heading: HeadingLevel.HEADING_1,
      bidirectional: true,
    })
  );

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorder,
    rows: [
      summaryRow("اسم المقرر", review.courseName),
      summaryRow("رمز المقرر", review.courseCode),
      summaryRow("نطاق المراجعة", `${review.examinedFiles.length} ملف (${examinable.length} قابل، ${notExaminable.length} غير قابل)`),
      summaryRow("نسبة الجاهزية", `${review.overallReadiness ?? 0}%`),
      summaryRow("مستوى QM", COMPLIANCE_LABELS[review.qmLevel ?? "NOT_ASSESSED"]),
      summaryRow("مستوى NELC", COMPLIANCE_LABELS[review.nelcLevel ?? "NOT_ASSESSED"]),
      summaryRow("جودة المحتوى", COMPLIANCE_LABELS[review.contentLevel ?? "NOT_ASSESSED"]),
      summaryRow("الوصول", COMPLIANCE_LABELS[review.accessibilityLevel ?? "NOT_ASSESSED"]),
      summaryRow("حالة السلامة", SAFETY_LABELS[review.safetyStatus ?? "CLEAR"]),
      summaryRow(
        "الملاحظات",
        `حرجة: ${severityCount(acceptedFindings, "CRITICAL")} | عالية: ${severityCount(acceptedFindings, "HIGH")} | متوسطة: ${severityCount(acceptedFindings, "MEDIUM")} | منخفضة: ${severityCount(acceptedFindings, "LOW")}`
      ),
    ],
  });

  sections.push(
    new Paragraph({
      text: "2. الحكم النهائي",
      heading: HeadingLevel.HEADING_1,
      bidirectional: true,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        textRun(VERDICT_LABELS[review.verdict ?? "INCOMPLETE_EVIDENCE"], true),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 200, after: 200 },
    })
  );

  if (review.reviewedBy) {
    sections.push(
      new Paragraph({
        children: [
          textRun(
            `اعتمد بواسطة: ${review.reviewedBy.name} — ${review.signedOffAt ? new Date(review.signedOffAt).toLocaleDateString("ar-SA") : ""}`
          ),
        ],
        bidirectional: true,
      })
    );
  }

  // Findings sections
  for (const [framework, findings] of Object.entries(findingsByFramework)) {
    sections.push(
      new Paragraph({
        text: FRAMEWORK_LABELS[framework] ?? framework,
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        spacing: { before: 300 },
      })
    );

    for (const finding of findings) {
      sections.push(
        new Paragraph({
          children: [
            textRun(`[${SEVERITY_LABELS[finding.severity]}] `, true),
            textRun(finding.descriptionAr),
          ],
          bidirectional: true,
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            textRun("التوصية: ", true),
            textRun(finding.recommendationAr),
          ],
          bidirectional: true,
        })
      );
      if (finding.location) {
        sections.push(
          new Paragraph({
            children: [textRun(`الموقع: ${finding.location}`)],
            bidirectional: true,
          })
        );
      }
    }
  }

  sections.push(
    new Paragraph({
      text: `تم إنشاء هذا التقرير بواسطة نظام ELQAI — ${new Date().toLocaleDateString("ar-SA")}`,
      bidirectional: true,
      spacing: { before: 600 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, bottom: 1440, right: 1440, left: 1440 } },
        },
        children: [
          ...sections.slice(0, 2),
          summaryTable,
          ...sections.slice(2),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
