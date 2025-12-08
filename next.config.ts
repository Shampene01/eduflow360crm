import type { NextConfig } from "next";
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Reduce bundle size for Netlify deployment
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/linux-x64",
      "node_modules/@esbuild/darwin-arm64",
      "node_modules/sharp",
    ],
  },
  
  // Externalize heavy packages from serverless functions
  serverExternalPackages: ["firebase", "firebase-admin"],
  
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
