import type { NextConfig } from "next";
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Enable Turbopack explicitly (Next.js 16 default)
  turbopack: {},

  // Allow cross-origin requests from local network devices in development
  allowedDevOrigins: ["192.168.3.91"],

  // Configure allowed image domains for next/image
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },

  generateBuildId: async () => {
    // Use Git commit hash for deterministic build IDs
    // Falls back to timestamp if Git is not available
    try {
      const commitHash = execSync("git rev-parse HEAD").toString().trim();
      return commitHash;
    } catch {
      return `build-${Date.now()}`;
    }
  },
};

export default nextConfig;
