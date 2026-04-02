import { test, expect } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  UPLOAD MODAL → OPENS AND SHOWS CORRECT UI
// ════════════════════════════════════════════════════════════════════

test.describe("Upload Modal", () => {
  test("Upload button in header opens modal with drop zone", async ({ page }) => {
    await page.goto("/");
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible();
    await expect(page.locator("text=Drop your .klog file here")).toBeVisible();
    await expect(page.locator("text=or browse files")).toBeVisible();
  });

  test("modal can be closed via X button", async ({ page }) => {
    await page.goto("/");
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible();
    await page.click("[aria-label='Close modal']");
    await expect(page.locator("text=Upload Roast Log")).not.toBeVisible();
  });
});
