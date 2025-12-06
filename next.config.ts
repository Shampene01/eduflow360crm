import type { NextConfig } from "next";
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
