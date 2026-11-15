import { defineConfig } from "@playwright/test";
export default defineConfig({
  globalTeardown: "./tests/e2e-teardown.ts",
  testDir: "tests/e2e",
  timeout: 90000,
  use: {
    baseURL: "http://localhost:5174",
    actionTimeout: 10000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  workers: 1,
  reporter: "list",
  webServer: {
    command: "pnpm exec tsx scripts/e2e-server.ts",
    url: "http://localhost:5174/api/v1/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      INTEGRATION_MODE: "demo",
      PORT: "3002",
      VITE_PORT: "5174",
      WEB_ORIGIN: "http://localhost:5174",
      VITE_GIPHY_API_KEY: "e2e-not-a-provider-credential",
    },
  },
});
