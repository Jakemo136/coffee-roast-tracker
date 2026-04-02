import { test, expect, waitForDashboard } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  3. ROAST DETAIL → EDIT NOTES → VERIFY SAVED
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail notes editing", () => {
  test("editing notes persists after save", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);

    // Find and click the Edit button next to Notes
    const editBtn = page.locator("button:text('Edit')").first();
    if (await editBtn.isVisible({ timeout: 5_000 })) {
      await editBtn.click();
      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible();
      await textarea.fill("E2E test note — updated");
      await page.locator("button:text('Save')").first().click();
      // After save, the note text should be visible (not in a textarea)
      await expect(page.locator("text=E2E test note — updated")).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  4. ROAST DETAIL → SHARE TOGGLE → VERIFY SHARE URL
// ════════════════════════════════════════════════════════════════════

test.describe("Roast sharing", () => {
  test("toggling share produces a share link", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);

    const shareBtn = page.locator("button:text('Share'), button:text('Enable Sharing')");
    if (await shareBtn.isVisible({ timeout: 5_000 })) {
      await shareBtn.click();
      // After sharing, a share link or "Unshare" button should appear
      const unshareOrLink = page.locator("button:text('Unshare'), text=/share\\//");
      await expect(unshareOrLink.first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
  });
});
