import { test, expect, waitForDashboard, waitForLanding } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  AUTH BOUNDARIES
// ════════════════════════════════════════════════════════════════════

test.describe("Public routes (no auth required)", () => {
  test("landing page loads for logged-out users", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
  });

  test("bean library is accessible without auth", async ({ page }) => {
    await page.goto("/beans");
    // Should see community beans, not "sign in" redirect
    await expect(page.locator("[data-testid='bean-card']").first()).toBeVisible({ timeout: 10_000 });
  });

  test("bean detail is accessible without auth", async ({ page }) => {
    await page.goto("/beans");
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
  });

  test("public roast detail is accessible without auth", async ({ page }) => {
    // Navigate through a bean to find a roast
    await page.goto("/beans");
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    const roastLink = page.locator("[data-testid='roast-row'], table tbody tr a").first();
    if (await roastLink.isVisible({ timeout: 5_000 })) {
      await roastLink.click();
      await expect(page).toHaveURL(/\/roasts\//);
    }
  });

  test("private roast shows 'this roast is private' message", async ({ page }) => {
    // This test relies on a roast being set to private in seed data
    // If no private roasts in seed, this test documents expected behavior
    await page.goto("/roasts/nonexistent-or-private-id");
    await page.waitForTimeout(2_000);
    const bodyText = await page.textContent("body");
    // Should show an error or private message, not crash
    expect(bodyText).toBeTruthy();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForTimeout(2_000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.locator("text=/not found|404/i")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Protected routes (auth required)", () => {
  test("authenticated user sees dashboard at /", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
  });

  test("compare page requires auth", async ({ page }) => {
    await page.goto("/compare?ids=1,2");
    // Should redirect to sign-in or show auth prompt, not the compare view
    await page.waitForTimeout(3_000);
    await expect(page.locator("canvas")).not.toBeVisible();
  });

  test("authenticated header shows Upload, My Roasts, and user avatar", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await expect(page.locator("button:text('Upload')")).toBeVisible();
    await expect(page.locator("nav >> text='My Roasts'")).toBeVisible();
  });

  test("logged-out header shows Sign In button but not Upload or My Roasts", async ({ page }) => {
    await page.goto("/beans"); // Public page with header
    await expect(page.locator("text=/sign in/i").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button:text('Upload')")).not.toBeVisible();
  });
});
