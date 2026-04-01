import { defineConfig } from "@playwright/test";

const E2E_DB = "postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 15_000,
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      // Resolve Alice's user ID at launch time (after globalSetup seeds)
      command: `bash -c 'export E2E_TEST_USER_ID=$(psql -d coffee_roast_tracker_test -tAc "SELECT id FROM \\"User\\" WHERE \\"clerkId\\" = '"'"'clerk_seed_alice_001'"'"'") && export DATABASE_URL="${E2E_DB}" && export CLERK_SECRET_KEY=sk_test_placeholder && npm run dev:server'`,
      url: "http://localhost:4000",
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: "npm run dev:client",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 15_000,
      env: {
        VITE_E2E_TEST: "true",
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
      },
    },
  ],
});
