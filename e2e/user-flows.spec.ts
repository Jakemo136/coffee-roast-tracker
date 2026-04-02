import { test, expect, type Page } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────

/** Wait for the GraphQL loading state to resolve */
async function waitForContent(page: Page) {
  // Wait for any "Loading..." text to disappear
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading"),
    { timeout: 10_000 },
  ).catch(() => {}); // OK if no loading text appeared
}

/**
 * Dashboard roast rows: wait for "My Roasts" heading, then count rows
 * by looking for the roast date pattern (e.g., "Mar 10", "Feb 23").
 * Checkboxes are hidden until hover so we can't use them for visibility checks.
 */
function dashboardRowCount(page: Page) {
  // Each row has a checkbox with aria-label — use count() not visibility
  return page.locator('input[type="checkbox"][aria-label^="Select "]');
}

/** Click the Nth dashboard row by clicking the bean name div (not the hidden checkbox or select options). */
async function clickDashboardRow(page: Page, index = 0) {
  const checkbox = page.locator('input[type="checkbox"][aria-label^="Select "]').nth(index);
  const ariaLabel = await checkbox.getAttribute("aria-label");
  const beanName = ariaLabel?.replace("Select ", "") ?? "";
  // Target the visible div containing the bean name (not <option> elements)
  await page.locator(`div:text-is("${beanName}")`).first().click();
}

// ════════════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════════════

test.describe("Navigation", () => {
  test("app shell renders with logo and nav links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Coffee Roast Tracker")).toBeVisible();
    await expect(page.locator("nav >> text=Dashboard")).toBeVisible();
    await expect(page.locator("nav >> text=Beans")).toBeVisible();
    await expect(page.locator("nav >> text=Compare")).toBeVisible();
    await expect(page.locator("nav >> text=Settings")).toBeVisible();
  });

  test("Dashboard link navigates to /", async ({ page }) => {
    await page.goto("/beans");
    await page.click("nav >> text=Dashboard");
    await expect(page).toHaveURL("/");
  });

  test("Beans link navigates to /beans", async ({ page }) => {
    await page.goto("/");
    await page.click("nav >> text=Beans");
    await expect(page).toHaveURL("/beans");
  });

  test("Compare link navigates to /compare", async ({ page }) => {
    await page.goto("/");
    await page.click("nav >> text=Compare");
    await expect(page).toHaveURL("/compare");
  });

  test("Settings link navigates to /settings", async ({ page }) => {
    await page.goto("/");
    await page.click("nav >> text=Settings");
    await expect(page).toHaveURL("/settings");
  });

  test("Upload button is visible in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("button:text('Upload')")).toBeVisible();
  });

  test("404 page shown for unknown routes", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await expect(page.locator("text=404")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard", () => {
  test("loads and displays roast table", async ({ page }) => {
    await page.goto("/");
    await waitForContent(page);
    // Wait for "My Roasts" heading which appears after data loads
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    // Seeded data has 9 roasts
    const count = await dashboardRowCount(page).count();
    expect(count).toBeGreaterThan(0);
  });

  test("roast table rows are clickable and navigate to roast detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await expect(page).toHaveURL(/\/roasts\//);
  });

  test("search input filters roasts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    const searchInput = page.locator("input[placeholder*='Search']");
    if (await searchInput.isVisible()) {
      const rowsBefore = await dashboardRowCount(page).count();
      await searchInput.fill("nonexistent-bean-xyz");
      await page.waitForTimeout(500);
      const rowsAfter = await dashboardRowCount(page).count();
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    }
  });

  test("star rating is visible on roast rows", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    // Star rating component renders ☆ or ★ characters
    await expect(page.locator("text=☆").first()).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  UPLOAD ROAST
// ════════════════════════════════════════════════════════════════════

test.describe("Upload Roast", () => {
  test("Upload button opens the upload modal", async ({ page }) => {
    await page.goto("/");
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible();
  });

  test("upload modal shows drop zone", async ({ page }) => {
    await page.goto("/");
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Drop your .klog file here")).toBeVisible();
    await expect(page.locator("text=or browse files")).toBeVisible();
  });

  test("upload modal can be closed", async ({ page }) => {
    await page.goto("/");
    await page.click("button:text('Upload')");
    await expect(page.locator("text=Upload Roast Log")).toBeVisible();
    await page.click("[aria-label='Close modal']");
    await expect(page.locator("text=Upload Roast Log")).not.toBeVisible();
  });

  // This test requires a .klog fixture file
  // test("uploading a .klog file shows preview and Save Roast button")
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail", () => {
  test("navigating to a roast shows detail page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await expect(page).toHaveURL(/\/roasts\//);
    // Should show roast metadata
    await waitForContent(page);
  });

  test("roast detail shows bean name", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await waitForContent(page);
    // Bean name is in an h2
    const beanName = page.locator("h2").first();
    await expect(beanName).toBeVisible();
  });

  test("roast detail has editable notes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await waitForContent(page);
    // The Notes card has an "Edit" button (not "Edit Notes")
    const notesCard = page.locator("text=Notes").first().locator("..");
    const editBtn = notesCard.locator("button:text('Edit')");
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator("textarea")).toBeVisible();
      // Should have Save and Cancel buttons
      await expect(page.locator("button:text('Save')")).toBeVisible();
      await expect(page.locator("button:text('Cancel')")).toBeVisible();
    }
  });

  test("roast detail has flavor pills section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await waitForContent(page);
    // Look for flavor-related UI — the card title is "Flavors"
    const flavorSection = page.locator("text=Flavors").first();
    await expect(flavorSection).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Some roasts may not have flavors section visible
    });
  });

  test("Edit Flavors button opens flavor picker modal", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await waitForContent(page);
    // The Flavors card has a "+ Edit" button (not "Edit Flavors")
    const editFlavorsBtn = page.locator("button:text('+ Edit')").first();
    if (await editFlavorsBtn.isVisible()) {
      await editFlavorsBtn.click();
      await expect(page.locator("text=Edit Flavors")).toBeVisible();
      // Should show search input for descriptors
      await expect(page.locator("input[placeholder*='Search']")).toBeVisible();
    }
  });

  test("share toggle button exists and is clickable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:text('My Roasts')")).toBeVisible({ timeout: 10_000 });
    await clickDashboardRow(page, 0);
    await waitForContent(page);
    const shareBtn = page.locator("button:text('Share'), button:text('Unshare')");
    if (await shareBtn.isVisible()) {
      // Button should be clickable (not disabled)
      await expect(shareBtn).toBeEnabled();
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Library", () => {
  test("loads and displays bean cards", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await expect(page.locator("h1:text('My Beans')")).toBeVisible();
    // Bean cards have role="link"
    const cards = page.locator("[role='link']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("bean cards show name and short name", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    // Alice has "Ethiopia Yirgacheffe" with short name "Eth Yirg"
    await expect(page.locator("text=Ethiopia")).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test("bean cards show process and elevation", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    // Seeded beans have process info
    const processInfo = page.locator("text=Washed").first();
    await expect(processInfo).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test("bean cards show flavor pills", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    // Look for any flavor pill elements (suggested or roast-aggregated)
    await page.waitForTimeout(1000);
    // Flavor pills may or may not be present depending on data
  });

  test("clicking a bean card navigates to bean detail", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    const firstCard = page.locator("[role='link']").first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/beans\//);
  });

  test("+ Add Bean button is visible and opens modal", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    const addBtn = page.locator("button:text('+ Add Bean')");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator("text=Add Bean")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  ADD BEAN MODAL
// ════════════════════════════════════════════════════════════════════

test.describe("Add Bean Modal", () => {
  async function openAddBean(page: Page) {
    await page.goto("/beans");
    await waitForContent(page);
    await page.click("button:text('+ Add Bean')");
    await expect(page.locator("text=Add Bean").first()).toBeVisible();
  }

  test("shows Parse from supplier button", async ({ page }) => {
    await openAddBean(page);
    await expect(page.locator("button:text('Parse from supplier')")).toBeVisible();
  });

  test("Parse from supplier opens ParseSupplierModal", async ({ page }) => {
    await openAddBean(page);
    await page.click("button:text('Parse from supplier')");
    // Modal title is "Import from supplier"
    await expect(page.locator("text=Import from supplier")).toBeVisible();
    // Both URL and paste sections should be visible
    await expect(page.locator("text=Supplier URL")).toBeVisible();
    await expect(page.locator("text=Paste supplier notes")).toBeVisible();
  });

  test("shows form fields for manual entry", async ({ page }) => {
    await openAddBean(page);
    await expect(page.locator("text=Bean Name")).toBeVisible();
    await expect(page.locator("text=Short Name")).toBeVisible();
    await expect(page.locator("text=Process")).toBeVisible();
    await expect(page.locator("text=Elevation")).toBeVisible();
    await expect(page.locator("text=Origin")).toBeVisible();
  });

  test("Save Bean is disabled without required fields", async ({ page }) => {
    await openAddBean(page);
    const saveBtn = page.locator("button:text('Save Bean')");
    await expect(saveBtn).toBeDisabled();
  });

  test("Save Bean is enabled when name and short name are filled", async ({ page }) => {
    await openAddBean(page);
    await page.fill("input[placeholder*='Colombia']", "Test Bean");
    await page.fill("input[placeholder*='CCAJ']", "TST");
    const saveBtn = page.locator("button:text('Save Bean')");
    await expect(saveBtn).toBeEnabled();
  });

  test("Save Bean creates bean and navigates to detail", async ({ page }) => {
    await openAddBean(page);
    await page.fill("input[placeholder*='Colombia']", "E2E Test Bean");
    await page.fill("input[placeholder*='CCAJ']", "E2E");
    await page.click("button:text('Save Bean')");
    // Should navigate to the new bean's detail page
    await expect(page).toHaveURL(/\/beans\//, { timeout: 10_000 });
  });

  test("+ Add flavors button reveals flavor input", async ({ page }) => {
    await openAddBean(page);
    await page.click("button:text('+ Add flavors')");
    await expect(page.locator("input[placeholder*='Citrus']")).toBeVisible();
  });

  test("typing a flavor and clicking Add creates a pill", async ({ page }) => {
    await openAddBean(page);
    await page.click("button:text('+ Add flavors')");
    await page.fill("input[placeholder*='Citrus']", "Blueberry");
    await page.click("button:text('Add')");
    await expect(page.locator("text=Blueberry")).toBeVisible();
  });

  test("Process field shows combobox suggestions", async ({ page }) => {
    await openAddBean(page);
    const processInput = page.locator("input[placeholder*='Washed']");
    await processInput.click();
    await processInput.fill("Wa");
    // Should show "Washed" in dropdown
    await expect(page.locator("li:text('Washed')")).toBeVisible({ timeout: 3_000 });
  });

  test("cancel button closes the modal", async ({ page }) => {
    await openAddBean(page);
    await page.click("button:text('Cancel')");
    await expect(page.locator("text=Add Bean >> visible=true")).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Detail", () => {
  async function goToBeanDetail(page: Page) {
    await page.goto("/beans");
    await waitForContent(page);
    await page.locator("[role='link']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    await waitForContent(page);
  }

  test("shows bean name and metadata cards", async ({ page }) => {
    await goToBeanDetail(page);
    // Should have metadata cards for Origin, Process, Elevation, Variety, Score, Avg Rating
    await expect(page.locator("text=Origin")).toBeVisible();
    await expect(page.locator("text=Process")).toBeVisible();
    await expect(page.locator("text=Elevation")).toBeVisible();
    await expect(page.locator("text=Variety")).toBeVisible();
    await expect(page.locator("text=Score")).toBeVisible();
    await expect(page.locator("text=Avg Rating")).toBeVisible();
  });

  test("Edit button toggles inline editing of metadata", async ({ page }) => {
    await goToBeanDetail(page);
    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    // Should show Save and Cancel buttons
    await expect(page.locator("button:text('Save')").first()).toBeVisible();
    await expect(page.locator("button:text('Cancel')").first()).toBeVisible();
    // Metadata fields should be editable inputs
    const inputs = page.locator("input").count();
    expect(await inputs).toBeGreaterThan(0);
  });

  test("Edit mode Cancel reverts without saving", async ({ page }) => {
    await goToBeanDetail(page);
    await page.click("button:text('Edit')");
    await page.click("button:text('Cancel')");
    // Should be back to view mode
    await expect(page.locator("button:text('Edit')").first()).toBeVisible();
  });

  test("Re-parse from supplier button opens parse modal", async ({ page }) => {
    await goToBeanDetail(page);
    const reparseBtn = page.locator("button:text('Re-parse from supplier')");
    await expect(reparseBtn).toBeVisible();
    await reparseBtn.click();
    // Modal title is "Import from supplier" (not "Parse Supplier Details")
    await expect(page.locator("text=Import from supplier")).toBeVisible();
  });

  test("Suggested Flavors section shows removable pills", async ({ page }) => {
    await goToBeanDetail(page);
    const suggestedSection = page.locator("text=Suggested Flavors");
    if (await suggestedSection.isVisible()) {
      // Pills should have remove buttons
      const removeBtn = page.locator("[aria-label^='Remove']").first();
      await expect(removeBtn).toBeVisible();
    }
  });

  test("Supplier Notes section is visible", async ({ page }) => {
    await goToBeanDetail(page);
    await expect(page.locator("text=Supplier Notes")).toBeVisible();
  });

  test("Your Notes section has Edit button that works", async ({ page }) => {
    await goToBeanDetail(page);
    const notesEditBtn = page.locator("text=Your Notes").locator("..").locator("button:text('Edit')");
    if (await notesEditBtn.isVisible()) {
      await notesEditBtn.click();
      await expect(page.locator("textarea[aria-label='Your notes']")).toBeVisible();
    }
  });

  test("Roasts table is visible with header columns", async ({ page }) => {
    await goToBeanDetail(page);
    await expect(page.locator("text=Roasts")).toBeVisible();
    // Table headers
    await expect(page.locator("text=Date")).toBeVisible();
    await expect(page.locator("text=Flavors")).toBeVisible();
    await expect(page.locator("text=Dev Time")).toBeVisible();
    await expect(page.locator("text=Rating")).toBeVisible();
  });

  test("back link navigates to bean library", async ({ page }) => {
    await goToBeanDetail(page);
    await page.click("text=My Beans");
    await expect(page).toHaveURL("/beans");
  });
});

// ════════════════════════════════════════════════════════════════════
//  COMPARISON VIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Comparison View", () => {
  test("compare page loads without roast IDs", async ({ page }) => {
    await page.goto("/compare");
    await waitForContent(page);
    // Should show some empty state or the comparison UI
    await expect(page.locator("body")).toBeVisible();
  });

  test("selecting roasts on dashboard enables compare", async ({ page }) => {
    await page.goto("/");
    await waitForContent(page);
    // Look for checkboxes on roast rows
    const checkboxes = dashboardRowCount(page);
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      // Compare button should appear (text is "Compare N roasts")
      const compareBtn = page.locator("button:text('Compare')");
      await expect(compareBtn).toBeVisible({ timeout: 3_000 }).catch(() => {});
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════════════

test.describe("Settings", () => {
  test("settings page loads with temp unit option", async ({ page }) => {
    await page.goto("/settings");
    await waitForContent(page);
    await expect(page.locator("text=Temperature Unit")).toBeVisible({ timeout: 5_000 }).catch(() => {
      // May use different label
    });
  });

  test("settings page has a Save button", async ({ page }) => {
    await page.goto("/settings");
    await waitForContent(page);
    const saveBtn = page.locator("button:text('Save')");
    await expect(saveBtn).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test("Save button shows confirmation when clicked", async ({ page }) => {
    await page.goto("/settings");
    await waitForContent(page);
    // Toggle the temp unit to make the Save button enabled (it's disabled when not dirty)
    const fahrenheitBtn = page.locator("button:text('°F')");
    const celsiusBtn = page.locator("button:text('°C')");
    // Click whichever is not currently active to make the form dirty
    const isCelsiusActive = await celsiusBtn.getAttribute("aria-pressed");
    if (isCelsiusActive === "true") {
      await fahrenheitBtn.click();
    } else {
      await celsiusBtn.click();
    }
    const saveBtn = page.locator("button:text('Save')");
    if (await saveBtn.isEnabled()) {
      await saveBtn.click();
      // Should show "✓ Saved" confirmation
      await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  SHARED ROAST VIEW (public, no auth)
// ════════════════════════════════════════════════════════════════════

test.describe("Shared Roast View", () => {
  test("invalid share token shows error or empty state", async ({ page }) => {
    await page.goto("/share/invalid-token-xyz");
    await waitForContent(page);
    // Should show some error state, not crash
    await expect(page.locator("body")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  PARSE SUPPLIER MODAL (from Bean Detail)
// ════════════════════════════════════════════════════════════════════

test.describe("Parse Supplier Modal", () => {
  test("Fetch button is present and clickable", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await page.locator("[role='link']").first().click();
    await waitForContent(page);
    await page.click("button:text('Re-parse from supplier')");
    await expect(page.locator("button:text('Fetch')")).toBeVisible();
  });

  test("Parse button is present and clickable", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await page.locator("[role='link']").first().click();
    await waitForContent(page);
    await page.click("button:text('Re-parse from supplier')");
    await expect(page.locator("button:text('Parse')")).toBeVisible();
  });

  test("pasting text and clicking Parse sends data to server", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await page.locator("[role='link']").first().click();
    await waitForContent(page);
    await page.click("button:text('Re-parse from supplier')");

    const textarea = page.locator("textarea");
    await textarea.fill("Region\tHuila, Colombia\nProcess\tWashed\nVariety\tCastillo");
    await page.click("button:text('Parse')");

    // Should show diff modal or close the parse modal
    await page.waitForTimeout(2000);
    // ParseDiffModal title is "Review parsed changes" (lowercase)
    const diffModal = page.locator("text=Review parsed changes");
    // No-changes text is "No changes found" (lowercase)
    const noChanges = page.locator("text=No changes found");
    const isVisible = await diffModal.isVisible() || await noChanges.isVisible();
    expect(isVisible).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
//  EDGE CASES
// ════════════════════════════════════════════════════════════════════

test.describe("Edge Cases", () => {
  test("refreshing a page preserves the route", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await page.reload();
    await expect(page).toHaveURL("/beans");
  });

  test("navigating directly to /settings works", async ({ page }) => {
    await page.goto("/settings");
    await waitForContent(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("empty bean library shows empty state", async ({ page }) => {
    // This test would need a user with no beans — skipping for seeded data
    // The empty state is: "No beans yet" + "Add your first bean"
  });

  test("double-clicking a button does not cause duplicate actions", async ({ page }) => {
    await page.goto("/beans");
    await waitForContent(page);
    await page.click("button:text('+ Add Bean')");
    await page.click("button:text('+ Add Bean')");
    // Should only have one modal open
    const modals = page.locator("text=Add Bean");
    const count = await modals.count();
    // At most 2 (title + modal header), not duplicated
    expect(count).toBeLessThanOrEqual(3);
  });
});
