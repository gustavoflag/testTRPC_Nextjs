import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,components,lib}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["{app,components,lib}/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "test/**"],
      thresholds: { lines: 99.9, functions: 99.9, branches: 99.9, statements: 99.9 },
    },
  },
});
