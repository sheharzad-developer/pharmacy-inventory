import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native driver; avoid bundling issues on Vercel/serverless
  serverExternalPackages: ["pg"],
};

export default nextConfig;
