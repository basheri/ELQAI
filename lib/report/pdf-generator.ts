import { chromium } from "playwright";

import { buildReportHtml } from "@/lib/report/html-template";

import type { ReportData } from "@/lib/report/html-template";

export async function generatePdf(data: ReportData): Promise<Buffer> {
  const html = buildReportHtml(data);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
