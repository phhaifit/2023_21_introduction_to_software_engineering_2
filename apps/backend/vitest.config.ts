import { defineConfig } from "vitest/config";

// The subscription/payment suite runs under Vitest and lives in src/.
// The auth suite in tests/ uses node:test and is executed via the
// test:unit / test:auth:integration scripts, so it is excluded here.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"]
  }
});
