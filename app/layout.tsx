import localFont from "next/font/local";

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

// WHY: Cairo ships as a single variable font file; the weight range covers all
// UI needs. Loaded locally from /public/fonts per CLAUDE.md (no remote fonts).
const cairo = localFont({
  src: "../public/fonts/Cairo.ttf",
  variable: "--font-cairo",
  weight: "200 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELQAI — ضمان جودة المقررات الإلكترونية",
  description:
    "منصة ذكية لتدقيق جودة المحتوى التعليمي والمقررات الإلكترونية.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
