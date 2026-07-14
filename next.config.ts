import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
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
