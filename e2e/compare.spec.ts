import { test, expect, waitForDashboard } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  12. COMPARE VIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Compare", () => {
  test("selecting two roasts on dashboard shows compare button", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    // Checkboxes are hidden until hover — use dispatchEvent to check them
    const checkboxes = page.locator('input[type="checkbox"][aria-label^="Select "]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).dispatchEvent("click");
      await checkboxes.nth(1).dispatchEvent("click");
      // Compare button should appear
      await expect(page.locator("button:has-text('Compare')").first()).toBeVisible({ timeout: 3_000 });
    }
  });

  test("compare button navigates to compare page with roast IDs", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const checkboxes = page.locator('input[type="checkbox"][aria-label^="Select "]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).dispatchEvent("click");
      await checkboxes.nth(1).dispatchEvent("click");
      await page.locator("button:has-text('Compare')").first().click();
      await expect(page).toHaveURL(/\/compare\?ids=/);
    }
  });
});
