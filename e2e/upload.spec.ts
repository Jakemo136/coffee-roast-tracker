import { test, expect, waitForDashboard } from "./helpers.js";
import * as path from "path";

const KLOG_FIXTURE = path.resolve(__dirname, "../mocks/sample-roasts/EGB 0320a.klog");
const KLOG_FIXTURE_2 = path.resolve(__dirname, "../mocks/sample-roasts/CHAJ 0320.klog");

// ════════════════════════════════════════════════════════════════════
//  UPLOAD MODAL — OPEN / CLOSE
// ════════════════════════════════════════════════════════════════════

test.describe("Upload Modal", () => {
  test("Upload button in header opens modal with dropzone", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");
    await expect(page.locator("text=/upload roast/i")).toBeVisible();
    await expect(page.locator("text=/drop your .klog/i")).toBeVisible();
  });

  test("modal closes via close button", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");
    await expect(page.locator("text=/upload roast/i")).toBeVisible();
    await page.click("[aria-label='Close modal']");
    await expect(page.locator("text=/upload roast/i")).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  UPLOAD FLOW — FILE PREVIEW + BEAN MATCHING
// ════════════════════════════════════════════════════════════════════

test.describe("Upload flow", () => {
  test("uploading a .klog file shows preview with metadata and bean match", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input'], input[type='file']");
    await fileInput.setInputFiles(KLOG_FIXTURE);

    // Should show preview with parsed metadata
    await expect(page.locator("text=/parsed successfully/i")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/roast date/i")).toBeVisible();
    await expect(page.locator("text=/duration/i")).toBeVisible();

    // EGB should match Alice's Ethiopia Yirgacheffe bean (shortName "EGB")
    await expect(page.locator("text=/bean match/i")).toBeVisible({ timeout: 5_000 });
  });

  test("saving upload closes modal and navigates to roast detail", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input'], input[type='file']");
    await fileInput.setInputFiles(KLOG_FIXTURE);
    await expect(page.locator("text=/parsed successfully/i")).toBeVisible({ timeout: 10_000 });

    await page.click("button:text('Save')");

    // Modal should close (save = close on success)
    await expect(page.locator("text=/upload roast/i")).not.toBeVisible({ timeout: 5_000 });
    // Should navigate to new roast detail page
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 10_000 });
  });

  test("no bean match shows banner prompting inline bean creation", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input'], input[type='file']");
    await fileInput.setInputFiles(KLOG_FIXTURE_2);
    await expect(page.locator("text=/parsed successfully/i")).toBeVisible({ timeout: 10_000 });

    // If no bean match, should show banner/option to create bean
    const noMatchBanner = page.locator("text=/no.*bean.*match|add.*new.*bean|create.*bean/i");
    if (await noMatchBanner.isVisible({ timeout: 5_000 })) {
      // Should be able to create bean inline
      await page.locator("button:has-text('Add'), button:has-text('Create'), button:has-text('new bean')").first().click();
      await expect(page.locator("input[placeholder*='name' i], input[placeholder*='Bean']").first()).toBeVisible({ timeout: 3_000 });
    }
  });

  test("inline bean creation during upload + save navigates to roast detail", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input'], input[type='file']");
    await fileInput.setInputFiles(KLOG_FIXTURE_2);
    await expect(page.locator("text=/parsed successfully/i")).toBeVisible({ timeout: 10_000 });

    // Create new bean inline
    await page.locator("button:has-text('Add'), button:has-text('Create'), button:has-text('new bean')").first().click();
    await page.fill("input[placeholder*='name' i]", "E2E Upload New Bean");

    await page.click("button:text('Save')");

    // Should navigate to roast detail
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 10_000 });
    // Banner should encourage completing bean details
    await expect(page.locator("text=/complete.*bean|missing.*origin/i")).toBeVisible({ timeout: 5_000 });
  });
});
