import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: [
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-bedrock-agent-runtime",
  ],
};

export default nextConfig;
