import { test, expect } from "./helpers.js";

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
