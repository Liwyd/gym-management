import { defineConfig } from "vitest/config";

/**
 * Integration tests (tests/api/) run against a real PostgreSQL when
 * TEST_DATABASE_URL is set (CI service container); they skip otherwise.
 * API files truncate shared tables, so files must run serially.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      JWT_SECRET: "unit-test-secret-at-least-16-chars",
      JWT_EXPIRES_IN: "1h",
      COOKIE_SECURE: "false",
      CORS_ORIGIN: "http://localhost:3000",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://user:pass@localhost:5432/unused_in_unit_tests",
    },
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
