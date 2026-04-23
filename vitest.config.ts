import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["server/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "server/scripts/**",
        "server/seed.ts",
        "server/rag/scripts/**",
        "**/*.test.ts",
        "**/node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
