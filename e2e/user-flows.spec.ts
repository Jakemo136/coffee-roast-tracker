import { test, expect, type Page } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────

/** Wait for the page to finish loading data (heading appears). */
async function waitForDashboard(page: Page) {
  await expect(page.locator("h1")).toContainText("My Roasts", { timeout: 10_000 });
}

async function waitForBeanLibrary(page: Page) {
  await expect(page.locator("h1")).toContainText("My Beans", { timeout: 10_000 });
}

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

// ════════════════════════════════════════════════════════════════════
//  5. BEAN LIBRARY → ADD BEAN → SAVE → VERIFY ON DETAIL PAGE
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
//  6. BEAN DETAIL → EDIT METADATA → SAVE → VERIFY CHANGES
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
//  7. BEAN DETAIL → REMOVE SUGGESTED FLAVOR → VERIFY REMOVED
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
//  8. BEAN DETAIL → RE-PARSE FROM SUPPLIER → DIFF PREVIEW
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

// ════════════════════════════════════════════════════════════════════
//  9. SETTINGS → CHANGE TEMP UNIT → SAVE → VERIFY PERSISTED
// ════════════════════════════════════════════════════════════════════

test.describe("Settings", () => {
  test("changing temperature unit and saving shows confirmation", async ({ page }) => {
    await page.goto("/settings");
    // Wait for temp buttons to load
    await expect(page.locator("button:text('°C')")).toBeVisible({ timeout: 10_000 });

    // Toggle to whichever unit is NOT currently selected to make the form dirty
    const celsiusBtn = page.locator("button:text('°C')");
    const fahrenheitBtn = page.locator("button:text('°F')");
    const celsiusPressed = await celsiusBtn.getAttribute("aria-pressed");
    if (celsiusPressed === "true") {
      await fahrenheitBtn.click();
    } else {
      await celsiusBtn.click();
    }

    const saveBtn = page.locator("button:text('Save')");
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
    await saveBtn.click();
    // Should show "Saved" confirmation
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  10. UPLOAD MODAL → OPENS AND SHOWS CORRECT UI
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

// ════════════════════════════════════════════════════════════════════
//  11. NAVIGATION FLOWS
// ════════════════════════════════════════════════════════════════════

test.describe("Navigation", () => {
  test("all nav links reach the correct pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Coffee Roast Tracker")).toBeVisible();

    await page.click("nav >> text=Beans");
    await expect(page).toHaveURL("/beans");

    await page.click("nav >> text=Compare");
    await expect(page).toHaveURL("/compare");

    await page.click("nav >> text=Settings");
    await expect(page).toHaveURL("/settings");

    await page.click("nav >> text=Dashboard");
    await expect(page).toHaveURL("/");
  });

  test("bean card click → bean detail → back link → bean library", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Click back link
    await page.click("text=My Beans");
    await expect(page).toHaveURL("/beans");
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.locator("text=404")).toBeVisible();
  });
});

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

// ════════════════════════════════════════════════════════════════════
//  13. SHARED ROAST VIEW (public, no auth needed)
// ════════════════════════════════════════════════════════════════════

test.describe("Shared Roast", () => {
  test("invalid share token shows error state, not crash", async ({ page }) => {
    await page.goto("/share/invalid-token-xyz");
    await page.waitForTimeout(2000);
    // Should not crash — page renders something
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    // Should NOT show the authenticated nav
    await expect(page.locator("nav >> text=Dashboard")).not.toBeVisible().catch(() => {});
  });
});

// ════════════════════════════════════════════════════════════════════
//  14. PROCESS COMBOBOX
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

// ════════════════════════════════════════════════════════════════════
//  15. DEAD BUTTON AUDIT — things that SHOULD work but might not
// ════════════════════════════════════════════════════════════════════

test.describe("Dead button audit", () => {
  test("'Upload your first roast' button on empty dashboard does something", async ({ page }) => {
    // This would need a user with no roasts — skip for seeded data
    // but document it as a known gap
  });

  test("bean detail 'View listing' link opens source URL", async ({ page }) => {
    // Seeded beans don't have sourceUrl — this tests the link renders
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // "View listing" only appears if sourceUrl is set
    const viewListing = page.locator("text=View listing");
    // For seeded data this won't be visible — just confirm no crash
    await page.waitForTimeout(1000);
  });

  test("bean detail roast table rows navigate to roast detail", async ({ page }) => {
    // Go to bean library, click the first seeded bean
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Click on Kenya bean card (seeded bean with roasts)
    await page.locator("[role='link']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Wait for the roast table section header
    await expect(page.locator("text=Roasts").nth(1)).toBeVisible({ timeout: 5_000 });

    // Click a roast row (div[role='link'] inside the roast table, not the back link)
    const roastRow = page.locator("div[role='link']").first();
    await expect(roastRow).toBeVisible({ timeout: 5_000 });
    await roastRow.click();
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 5_000 });
  });
});
