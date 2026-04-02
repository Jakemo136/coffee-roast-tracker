import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 20_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "bash e2e/start-server.sh",
      url: "http://localhost:4000",
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: "VITE_E2E_TEST=true VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder npm run dev:client",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
