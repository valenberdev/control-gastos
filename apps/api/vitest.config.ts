import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/**/*.test.ts"],
    globalSetup: ["./src/test/globalSetup.ts"],
    setupFiles: ["./src/test/setupEnv.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
