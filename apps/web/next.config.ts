import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mediflow/shared"],
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
