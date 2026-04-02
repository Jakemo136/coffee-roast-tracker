import { test, expect, waitForDashboard } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  1. DASHBOARD → DATA LOADS WITH CORRECT COUNTS
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard data loading", () => {
  test("shows correct roast and bean counts from seeded data", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Alice has 9 roasts across 3 beans
    await expect(page.locator("text=9 roasts across 3 beans")).toBeVisible();
  });

  test("shows bean names from seeded data in roast rows", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await expect(page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first()).toBeVisible();
    await expect(page.locator("div:text-is('Colombia Huila Excelso EP')").first()).toBeVisible();
    await expect(page.locator("div:text-is('Ethiopia Yirgacheffe Kochere Debo')").first()).toBeVisible();
  });

  test("bean filter dropdown filters roast rows", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const beanFilter = page.locator("[aria-label='Filter by bean']");
    await expect(beanFilter).toBeVisible();
    // Select Kenya from the dropdown
    await beanFilter.selectOption({ label: "Kenya Nyeri Ichamama AA" });
    await page.waitForTimeout(300);
    // After filtering, only Kenya roasts should be visible
    await expect(page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first()).toBeVisible();
    // Colombia should not be in filtered results
    await expect(page.locator("div:text-is('Colombia Huila Excelso EP')")).not.toBeVisible({ timeout: 2_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  2. DASHBOARD → CLICK ROAST → ROAST DETAIL WITH CORRECT DATA
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard → Roast Detail navigation", () => {
  test("clicking a roast row navigates to its detail page", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Click the bean name div (not the hidden checkbox or <option>)
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
  });

  test("roast detail page shows the correct bean name", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    // The detail page should show the bean name in the h2 heading
    await expect(page.locator("h2:text-is('Kenya Nyeri Ichamama AA')")).toBeVisible({ timeout: 5_000 });
  });

  test("roast detail page shows development time and temperature data", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    // Should show phase/development data (these exist in seeded roasts)
    await expect(page.locator("text=Dev Time")).toBeVisible({ timeout: 5_000 });
  });
});
