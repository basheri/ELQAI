import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "playwright", "pdf-parse", "mammoth"],
  serverActions: {
    bodySizeLimit: "200mb",
  },
};

export default nextConfig;
