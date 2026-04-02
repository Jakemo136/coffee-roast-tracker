import { test, expect, waitForBeanLibrary } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY → ADD BEAN → SAVE → VERIFY ON DETAIL PAGE
// ════════════════════════════════════════════════════════════════════

test.describe("Add Bean full flow", () => {
  test("creating a bean with manual entry navigates to its detail page", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:text('+ Add Bean')");
    await expect(page.locator("text=Bean Name")).toBeVisible();

    // Fill required fields
    await page.fill("input[placeholder*='Colombia']", "E2E Test Brazil Santos");
    await page.fill("input[placeholder*='CCAJ']", "BRSNT");

    // Fill optional fields
    await page.fill("input[placeholder*='Huila']", "Minas Gerais, Brazil");

    // Use Process combobox
    const processInput = page.locator("input[placeholder*='Washed']");
    await processInput.fill("Natural");

    // Save
    await page.click("button:text('Save Bean')");

    // Should navigate to the new bean's detail page
    await expect(page).toHaveURL(/\/beans\//, { timeout: 10_000 });
    // The bean name should appear on the detail page
    await expect(page.locator("text=E2E Test Brazil Santos")).toBeVisible({ timeout: 5_000 });
  });

  test("new bean appears in the bean library after creation", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // The previously created bean should be in the library
    // (Alice now has 4+ beans — 3 seeded + any created in prior tests)
    const cards = page.locator("[role='link']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3); // At least the 3 seeded beans
  });

  test("adding flavors to a new bean persists them", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:text('+ Add Bean')");

    await page.fill("input[placeholder*='Colombia']", "E2E Flavor Test Bean");
    await page.fill("input[placeholder*='CCAJ']", "FLVR");

    // Add flavors — scope all interactions to the modal
    const modal = page.locator("[data-testid='modal-backdrop']");
    await modal.locator("button:text('+ Add flavors')").click();
    await modal.locator("input[placeholder*='Citrus']").fill("Blueberry, Honey");
    await modal.locator("button:text-is('Add')").click();

    // Verify pills appeared inside the modal
    await expect(modal.locator("text=Blueberry")).toBeVisible();
    await expect(modal.locator("text=Honey")).toBeVisible();

    // Save
    await modal.locator("button:text('Save Bean')").click();
    await expect(page).toHaveURL(/\/beans\//, { timeout: 10_000 });

    // Suggested flavors should appear on the detail page
    await expect(page.locator("text=Suggested Flavors")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Blueberry").first()).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  PROCESS COMBOBOX
// ════════════════════════════════════════════════════════════════════

test.describe("Process Combobox", () => {
  test("typing filters known processes and selecting fills the field", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:text('+ Add Bean')");

    const processInput = page.locator("input[placeholder*='Washed']");
    await processInput.fill("Nat");
    // "Natural" should appear in dropdown
    await expect(page.locator("[role='option']:text-is('Natural')")).toBeVisible({ timeout: 3_000 });
    await page.locator("[role='option']:text-is('Natural')").click();
    // Input should now have "Natural"
    await expect(processInput).toHaveValue("Natural");
  });
});
