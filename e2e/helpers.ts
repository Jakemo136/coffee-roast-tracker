import { test as base, expect, type Page } from "@playwright/test";

/**
 * Custom test fixture that injects the E2E auth token into every request.
 * The server recognizes "Bearer e2e-test-token" when E2E_TEST_USER_ID is set
 * and skips Clerk verification.
 *
 * Also intercepts Clerk's client-side checks so the React app renders
 * authenticated UI without a real Clerk session.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    // Mock Clerk's client-side auth so ProtectedRoute renders children
    await page.addInitScript(() => {
      // Clerk checks window.__clerk_publishable_key — provide a fake one
      (window as any).__clerk_frontend_api = "clerk.test.local";
    });

    // Intercept all GraphQL requests and add the E2E auth header
    await page.route("**/graphql", async (route) => {
      const headers = {
        ...route.request().headers(),
        authorization: "Bearer e2e-test-token",
      };
      await route.continue({ headers });
    });

    // Mock Clerk API calls to return authenticated state
    await page.route("**/clerk**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ client: null }),
      });
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";

/** Wait for the dashboard page to finish loading data (heading appears). */
export async function waitForDashboard(page: Page) {
  await expect(page.locator("h1")).toContainText("My Roasts", { timeout: 10_000 });
}

/** Wait for the bean library page to finish loading data (heading appears). */
export async function waitForBeanLibrary(page: Page) {
  await expect(page.locator("h1")).toContainText("My Beans", { timeout: 10_000 });
}
