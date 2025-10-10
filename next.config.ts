import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next.js uses this project directory as the workspace root for output file tracing
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
