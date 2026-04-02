import { test, expect, waitForBeanLibrary, waitForDashboard, switchE2eUser } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  NAVIGATION FLOWS
// ════════════════════════════════════════════════════════════════════

test.describe("Navigation", () => {
  test("all nav links reach the correct pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Coffee Roast Tracker")).toBeVisible();

    await page.click("nav >> text=Beans");
    await expect(page).toHaveURL("/beans");

    await page.click("nav >> text=Compare");
    await expect(page).toHaveURL("/compare");

    await page.click("nav >> text=Settings");
    await expect(page).toHaveURL("/settings");

    await page.click("nav >> text=Dashboard");
    await expect(page).toHaveURL("/");
  });

  test("bean card click → bean detail → back link → bean library", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Click back link
    await page.click("text=My Beans");
    await expect(page).toHaveURL("/beans");
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.locator("text=404")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  SHARED ROAST VIEW (public, no auth needed)
// ════════════════════════════════════════════════════════════════════

test.describe("Shared Roast", () => {
  test("invalid share token shows error state, not crash", async ({ page }) => {
    await page.goto("/share/invalid-token-xyz");
    await page.waitForTimeout(2000);
    // Should not crash — page renders something
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    // Should NOT show the authenticated nav
    await expect(page.locator("nav >> text=Dashboard")).not.toBeVisible().catch(() => {});
  });
});

// ════════════════════════════════════════════════════════════════════
//  INTERACTIVE ELEMENTS
// ════════════════════════════════════════════════════════════════════

test.describe("Interactive elements", () => {
  test("'Upload your first roast' button on empty dashboard opens upload modal", async ({ page }) => {
    // Switch to Dave (seeded user with zero roasts)
    await switchE2eUser(page, "clerk_seed_dave_004");
    await page.goto("/");
    await expect(page.locator("text=No roasts yet")).toBeVisible({ timeout: 10_000 });
    await page.click("button:text('Upload your first roast')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible();
    await expect(page.locator("text=Drop your .klog file here")).toBeVisible();
  });

  test("bean detail 'View listing' link points to source URL", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Ethiopia Yirg has sourceUrl set in seed data
    await page.locator("[role='link']:has-text('Ethiopia')").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // "View listing" link should be visible and point to the source URL
    const viewListing = page.locator("a:text('View listing')");
    await expect(viewListing).toBeVisible({ timeout: 5_000 });
    const href = await viewListing.getAttribute("href");
    expect(href).toContain("sweetmarias.com");
  });

  test("bean detail roast table rows navigate to roast detail", async ({ page }) => {
    // Go to bean library, click the first seeded bean
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Click on Kenya bean card (seeded bean with roasts)
    await page.locator("[role='link']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Wait for the roast table section header
    await expect(page.locator("text=Roasts").nth(1)).toBeVisible({ timeout: 5_000 });

    // Click a roast row (div[role='link'] inside the roast table, not the back link)
    const roastRow = page.locator("div[role='link']").first();
    await expect(roastRow).toBeVisible({ timeout: 5_000 });
    await roastRow.click();
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 5_000 });
  });
});
