import { test, expect, waitForDashboard, waitForRoastDetail } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  COMPARE — FROM DASHBOARD
// ════════════════════════════════════════════════════════════════════

test.describe("Compare from dashboard", () => {
  test("selecting 2 roasts and clicking Compare navigates to compare page", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.locator("button:has-text('Compare')").click();
      await expect(page).toHaveURL(/\/compare\?ids=/);
    }
  });

  test("compare page shows overlaid chart with multiple curves", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.locator("button:has-text('Compare')").click();
      await expect(page).toHaveURL(/\/compare\?ids=/);

      // Chart should be visible
      await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("compare page shows metrics table with star rating column", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.locator("button:has-text('Compare')").click();
      await expect(page).toHaveURL(/\/compare\?ids=/);

      // Metrics table should show
      await expect(page.getByRole("columnheader", { name: "Rating" })).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  COMPARE — FROM ROAST DETAIL
// ════════════════════════════════════════════════════════════════════

test.describe("Compare from roast detail", () => {
  test("selecting roasts from 'other roasts' table and comparing", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Navigate to a Kenya roast (has multiple roasts)
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // PR #44 folded compare into the roast detail metrics table — check a
    // per-row "Compare with ..." checkbox to overlay the roast on the chart.
    // No separate /compare page navigation happens here.
    const compareCheckbox = page.locator('input[type="checkbox"][aria-label^="Compare with"]').first();
    if ((await compareCheckbox.count()) > 0) {
      await compareCheckbox.check();
      await expect(compareCheckbox).toBeChecked();
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  COMPARE — CROSS-BEAN COMPARISON
// ════════════════════════════════════════════════════════════════════

test.describe("Cross-bean comparison", () => {
  test("can compare roasts from different beans", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    // Select a Kenya roast and a Colombia roast
    const kenyaRow = page.locator("tr:has-text('Kenya'), [data-testid='roast-row']:has-text('Kenya')").first();
    const colombiaRow = page.locator("tr:has-text('Colombia'), [data-testid='roast-row']:has-text('Colombia')").first();

    if (await kenyaRow.isVisible({ timeout: 5_000 }) && await colombiaRow.isVisible()) {
      await kenyaRow.locator('input[type="checkbox"]').check();
      await colombiaRow.locator('input[type="checkbox"]').check();
      await page.locator("button:has-text('Compare')").click();
      await expect(page).toHaveURL(/\/compare\?ids=/);
      // Both beans should appear in the comparison
      await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
