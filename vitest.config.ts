import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Image tests toggle S3_* on process.env. Keep files in one worker.
    fileParallelism: false
  }
});
