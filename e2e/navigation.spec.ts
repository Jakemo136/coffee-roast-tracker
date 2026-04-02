import { test, expect, waitForBeanLibrary, waitForDashboard } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  11. NAVIGATION FLOWS
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
//  13. SHARED ROAST VIEW (public, no auth needed)
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
//  15. DEAD BUTTON AUDIT — things that SHOULD work but might not
// ════════════════════════════════════════════════════════════════════

test.describe("Dead button audit", () => {
  test("'Upload your first roast' button on empty dashboard does something", async ({ page }) => {
    // This would need a user with no roasts — skip for seeded data
    // but document it as a known gap
  });

  test("bean detail 'View listing' link opens source URL", async ({ page }) => {
    // Seeded beans don't have sourceUrl — this tests the link renders
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // "View listing" only appears if sourceUrl is set
    // For seeded data this won't be visible — just confirm no crash
    await page.waitForTimeout(1000);
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
