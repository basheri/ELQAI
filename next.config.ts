import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "playwright", "pdf-parse", "mammoth"],
  serverActions: {
    bodySizeLimit: "50mb",
  },
};

export default nextConfig;
