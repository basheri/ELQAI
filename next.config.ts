import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "playwright", "pdf-parse", "mammoth"],
};

export default nextConfig;
