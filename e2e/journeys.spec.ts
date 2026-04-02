import { test, expect, waitForDashboard, waitForBeanLibrary } from "./helpers.js";

/**
 * Full end-to-end user journey tests.
 * These cover cross-page flows rather than single-page interactions.
 */

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 1: First-time user adds a bean and opens the upload modal
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: add a bean then open upload modal", () => {
  test("user adds a bean manually and then verifies upload modal opens from dashboard", async ({ page }) => {
    // Step 1: navigate to bean library
    await page.goto("/beans");
    await waitForBeanLibrary(page);

    // Step 2: add a new bean
    await page.click("button:text('+ Add Bean')");
    await expect(page.locator("text=Bean Name")).toBeVisible();
    await page.fill("input[placeholder*='Colombia']", "Journey Test Bean");
    await page.fill("input[placeholder*='CCAJ']", "JRNY");
    await page.fill("input[placeholder*='Huila']", "Oaxaca, Mexico");

    const processInput = page.locator("input[placeholder*='Washed']");
    await processInput.fill("Natural");

    await page.click("button:text('Save Bean')");
    await expect(page).toHaveURL(/\/beans\//, { timeout: 10_000 });

    // Step 3: verify bean name visible on detail page
    await expect(page.locator("text=Journey Test Bean")).toBeVisible({ timeout: 5_000 });

    // Step 4: navigate back to dashboard
    await page.click("nav >> text=Dashboard");
    await waitForDashboard(page);

    // Step 5: verify upload modal opens (simulating the "upload a roast" next step)
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Drop your .klog file here")).toBeVisible();

    // Close modal cleanly
    await page.click("[aria-label='Close modal']");
    await expect(page.locator("text=Upload Roast Log")).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 2: Browse roasts, filter, select two, and compare
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: filter roasts and navigate to compare page", () => {
  test("user filters roasts by bean then compares two roasts", async ({ page }) => {
    // Step 1: load dashboard
    await page.goto("/");
    await waitForDashboard(page);

    // Step 2: filter by Kenya bean
    const beanFilter = page.locator("[aria-label='Filter by bean']");
    await expect(beanFilter).toBeVisible();
    await beanFilter.selectOption({ label: "Kenya Nyeri Ichamama AA" });
    await page.waitForTimeout(300);
    await expect(page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first()).toBeVisible();

    // Step 3: clear filter so we have enough roasts to compare
    await beanFilter.selectOption({ value: "" });
    await page.waitForTimeout(300);

    // Step 4: select two roasts via checkboxes
    const checkboxes = page.locator('input[type="checkbox"][aria-label^="Select "]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).dispatchEvent("click");
      await checkboxes.nth(1).dispatchEvent("click");

      // Step 5: click Compare → lands on compare page with IDs in URL
      await expect(page.locator("button:has-text('Compare')").first()).toBeVisible({ timeout: 3_000 });
      await page.locator("button:has-text('Compare')").first().click();
      await expect(page).toHaveURL(/\/compare\?ids=/, { timeout: 5_000 });

      // Step 6: navigate back to dashboard
      await page.click("nav >> text=Dashboard");
      await waitForDashboard(page);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 3: Full bean detail workflow
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: bean detail edit then navigate to a roast", () => {
  test("user edits bean metadata then navigates to a roast from the bean table", async ({ page }) => {
    // Step 1: navigate to beans and click Kenya (seeded bean with roasts)
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//, { timeout: 5_000 });

    // Step 2: edit elevation metadata
    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
    await editBtn.click();

    const elevationInput = page.locator("input").nth(2);
    await elevationInput.fill("1900m");
    await page.locator("button:text('Save')").first().click();

    // Verify saved
    await expect(page.locator("button:text('Edit')").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=1900m")).toBeVisible();

    // Step 3: navigate into a roast from the roast table on the bean detail page
    await expect(page.locator("text=Roasts").nth(1)).toBeVisible({ timeout: 5_000 });
    const roastRow = page.locator("div[role='link']").first();
    await expect(roastRow).toBeVisible({ timeout: 5_000 });
    await roastRow.click();
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 5_000 });

    // Step 4: navigate back to beans library
    await page.click("nav >> text=Beans");
    await waitForBeanLibrary(page);
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 4: Roast detail full interaction
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: roast detail notes, sharing, then back to beans", () => {
  test("user edits notes, shares roast, then navigates to bean library and a bean detail", async ({ page }) => {
    // Step 1: dashboard → click a roast
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("div:text-is('Kenya Nyeri Ichamama AA')").first().click();
    await expect(page).toHaveURL(/\/roasts\//);

    // Step 2: edit notes
    const editBtn = page.locator("button:text('Edit')").first();
    if (await editBtn.isVisible({ timeout: 5_000 })) {
      await editBtn.click();
      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible();
      await textarea.fill("Journey 4 note — cross-page test");
      await page.locator("button:text('Save')").first().click();
      await expect(page.locator("text=Journey 4 note — cross-page test")).toBeVisible({ timeout: 5_000 });
    }

    // Step 3: attempt to share roast
    const shareBtn = page.locator("button:text('Share'), button:text('Enable Sharing')");
    if (await shareBtn.isVisible({ timeout: 3_000 })) {
      await shareBtn.click();
      // After sharing, a share link or unshare button should appear
      await page.waitForTimeout(1000);
    }

    // Step 4: navigate to beans and verify the app is still functional
    await page.click("nav >> text=Beans");
    await waitForBeanLibrary(page);

    // Step 5: navigate into a bean detail from the library
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//, { timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 5: Settings round-trip
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: settings change persists across navigation", () => {
  test("user changes temp unit, navigates away, and returns to find the setting saved", async ({ page }) => {
    // Step 1: go to settings
    await page.goto("/settings");
    await expect(page.locator("button:text('°C')")).toBeVisible({ timeout: 10_000 });

    // Step 2: read current selection and toggle to the other unit
    const celsiusBtn = page.locator("button:text('°C')");
    const fahrenheitBtn = page.locator("button:text('°F')");
    const celsiusPressed = await celsiusBtn.getAttribute("aria-pressed");
    const targetUnit = celsiusPressed === "true" ? "°F" : "°C";

    if (celsiusPressed === "true") {
      await fahrenheitBtn.click();
    } else {
      await celsiusBtn.click();
    }

    // Step 3: save and verify confirmation
    const saveBtn = page.locator("button:text('Save')");
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
    await saveBtn.click();
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5_000 });

    // Step 4: navigate to dashboard — verify app didn't crash
    await page.click("nav >> text=Dashboard");
    await waitForDashboard(page);

    // Step 5: navigate back to settings — verify the saved unit is still selected
    await page.click("nav >> text=Settings");
    await expect(page.locator("button:text('°C')")).toBeVisible({ timeout: 10_000 });

    const savedBtn = page.locator(`button:text('${targetUnit}')`);
    await expect(savedBtn).toHaveAttribute("aria-pressed", "true", { timeout: 5_000 });
  });
});
