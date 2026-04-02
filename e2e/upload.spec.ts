import { test, expect, waitForDashboard } from "./helpers.js";
import * as path from "path";

const KLOG_FIXTURE = path.resolve(__dirname, "../mocks/sample-roasts/EGB 0320a.klog");
const KLOG_FIXTURE_2 = path.resolve(__dirname, "../mocks/sample-roasts/CHAJ 0320.klog");

// ════════════════════════════════════════════════════════════════════
//  UPLOAD MODAL
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

  test("uploading a .klog file shows preview with metadata and bean match", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Drop your .klog file here")).toBeVisible();

    // Upload the fixture file
    const fileInput = page.locator("[data-testid='file-input']");
    await fileInput.setInputFiles(KLOG_FIXTURE);

    // Should show preview with parsed metadata
    await expect(page.locator("text=Parsed successfully")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Roast Date")).toBeVisible();
    await expect(page.locator("text=Duration")).toBeVisible();

    // EGB should match Alice's Ethiopia Yirgacheffe bean (shortName "EGB")
    await expect(page.locator("text=Bean match found")).toBeVisible({ timeout: 5_000 });
  });

  test("uploading a .klog and saving navigates to roast detail", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input']");
    await fileInput.setInputFiles(KLOG_FIXTURE);
    await expect(page.locator("text=Parsed successfully")).toBeVisible({ timeout: 10_000 });

    // Bean should be auto-selected (single match)
    await page.click("button:text('Save Roast')");

    // Should navigate to roast detail page
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 10_000 });
    // Should show the bean name
    await expect(page.locator("text=Ethiopia Yirgacheffe")).toBeVisible({ timeout: 5_000 });
  });

  test("'+ Add new bean' flow creates bean and uploads roast", async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    // Use a different klog file (CHAJ) so it won't conflict with the previous test
    const fileInput = page.locator("[data-testid='file-input']");
    await fileInput.setInputFiles(KLOG_FIXTURE_2);
    await expect(page.locator("text=Parsed successfully")).toBeVisible({ timeout: 10_000 });

    // Click "+ Add new bean"
    await page.click("button:text('+ Add new bean')");

    // Fill in the new bean fields
    await page.fill("input[placeholder*='Bean name']", "E2E New Bean via Upload");
    const shortNameInput = page.locator("input[placeholder*='Short name']");
    // Clear any pre-fill and set our own
    await shortNameInput.fill("E2ENEW");

    await page.click("button:text('Save Roast')");

    // Should navigate to roast detail
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 10_000 });

    // Nudge banner should appear (new bean has no origin/process)
    await expect(page.locator("text=missing origin and process")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Complete bean details")).toBeVisible();
  });
});
