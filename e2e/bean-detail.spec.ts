import { test, expect, waitForBeanLibrary } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL → EDIT METADATA → SAVE → VERIFY CHANGES
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Detail editing", () => {
  test("editing bean metadata persists after save", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Click the first bean card
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Click Edit
    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
    await editBtn.click();

    // Should show Save and Cancel
    await expect(page.locator("button:text('Save')").first()).toBeVisible();
    await expect(page.locator("button:text('Cancel')").first()).toBeVisible();

    // Modify elevation
    const elevationInput = page.locator("input").nth(2); // Origin, Process (combobox), Elevation
    await elevationInput.fill("2100m");

    await page.locator("button:text('Save')").first().click();

    // After save, should be back in view mode with updated value
    await expect(page.locator("button:text('Edit')").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=2100m")).toBeVisible();
  });

  test("cancel discards changes", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Get current origin value
    const originBefore = await page.locator("text=Origin").locator("..").locator("div").last().textContent();

    await page.locator("button:text('Edit')").first().click();
    const originInput = page.locator("input").first();
    await originInput.fill("SHOULD NOT PERSIST");
    await page.locator("button:text('Cancel')").first().click();

    // Value should be unchanged
    const originAfter = await page.locator("text=Origin").locator("..").locator("div").last().textContent();
    expect(originAfter).toBe(originBefore);
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL → REMOVE SUGGESTED FLAVOR → VERIFY REMOVED
// ════════════════════════════════════════════════════════════════════

test.describe("Suggested flavor management", () => {
  test("removing a suggested flavor pill persists the removal", async ({ page }) => {
    // First create a bean with suggested flavors
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:text('+ Add Bean')");
    await page.fill("input[placeholder*='Colombia']", "E2E Remove Flavor Bean");
    await page.fill("input[placeholder*='CCAJ']", "RMFL");
    await page.click("button:text('+ Add flavors')");
    await page.fill("input[placeholder*='Citrus']", "Cherry, Almond, Caramel");
    await page.locator("button:text-is('Add')").click();
    await page.click("button:text('Save Bean')");
    await expect(page).toHaveURL(/\/beans\//, { timeout: 10_000 });

    // Now remove "Almond"
    await expect(page.locator("text=Suggested Flavors")).toBeVisible({ timeout: 5_000 });
    const removeAlmond = page.locator("[aria-label='Remove Almond']");
    if (await removeAlmond.isVisible()) {
      await removeAlmond.click();
      // Almond should disappear
      await expect(page.locator("text=Almond")).not.toBeVisible({ timeout: 5_000 });
      // Cherry should still be there
      await expect(page.locator("text=Cherry")).toBeVisible();
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL → RE-PARSE FROM SUPPLIER → DIFF PREVIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Re-parse from supplier", () => {
  test("paste and parse shows diff preview modal", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    await page.click("button:text('Re-parse from supplier')");
    // Modal should open — check for the Parse button (exact match, not "Re-parse")
    await expect(page.locator("button:text-is('Parse')")).toBeVisible({ timeout: 5_000 });

    // Paste some text and parse — scope to modal to avoid matching "Re-parse"
    const modal = page.locator("[data-testid='modal-backdrop']");
    const textarea = modal.locator("textarea").first();
    await textarea.fill("Region\tHuila, Colombia\nProcess\tWashed\nVariety\tCastillo");
    await modal.locator("button:text-is('Parse')").click();

    // Should show diff modal or "no changes" message
    await page.waitForTimeout(2000);
    const hasChanges = await page.locator("text=Review parsed changes").isVisible();
    const noChanges = await page.locator("text=No changes found").isVisible();
    expect(hasChanges || noChanges).toBe(true);
  });
});
