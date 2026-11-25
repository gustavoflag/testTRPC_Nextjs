import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts is a 3-line entry point (calls startServer from server.ts, which is tested over real HTTP).
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: { lines: 99.9, functions: 99.9, branches: 99.9, statements: 99.9 },
    },
  },
});
