import { chromium } from "playwright";
import { generateReportHtml } from "./template";
import type { Review, Finding, ExaminedFile, User } from "@/types";

interface ReportData {
  review: Review & {
    findings: Finding[];
    examinedFiles: ExaminedFile[];
    reviewedBy: User | null;
  };
}

export async function generatePdf(data: ReportData): Promise<Buffer> {
  const html = generateReportHtml(data);

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
