import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["apps/mobile/**", "node_modules/**"],
    setupFiles: ["tests/setup-env.ts"],
    // Image tests toggle S3_* on process.env. Keep files in one worker.
    fileParallelism: false
  }
});
