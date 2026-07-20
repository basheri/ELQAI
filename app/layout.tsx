import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const cairo = localFont({
  src: [
    {
      path: "../public/fonts/cairo-arabic.woff2",
      style: "normal",
    },
    {
      path: "../public/fonts/cairo-latin.woff2",
      style: "normal",
    },
  ],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELQAI",
  description: "AI-Powered Quality Assurance for E-Courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
