import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WHY: pdf-parse, unzipper, mammoth, playwright, docx are server-only Node
  // libraries; keep them external so the server bundle doesn't try to bundle them.
  serverExternalPackages: [
    "@prisma/client",
    "pdf-parse",
    "unzipper",
    "mammoth",
    "playwright",
    "docx",
  ],
};

export default nextConfig;
