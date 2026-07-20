import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "playwright", "pdf-parse", "mammoth"],
  experimental: {
    // WHY: default 1 MB Server Action body limit rejects course-export uploads
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
