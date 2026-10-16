import { test, expect } from "@playwright/test";

test.describe("Learn openings (Ascension-style layout)", () => {
  test("hub loads with lessons and catalog tabs", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });

    await expect(
      page.getByRole("tab", { name: /Lessons|Leçons/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /All openings|Toutes les ouvertures/i })
    ).toBeVisible();
  });

  test("opening a lesson shows mode rail and single board workspace", async ({
    page,
  }) => {
    await page.goto("/learn");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });

    const lessonLink = page
      .locator('a[href^="/learn/openings/"]')
      .first();
    await expect(lessonLink).toBeVisible({ timeout: 30_000 });
    await lessonLink.click();

    await expect(page).toHaveURL(/\/learn\/openings\//, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(
      page.getByRole("button", { name: /Study|Étude/i })
    ).toBeVisible();

    const model = page.getByRole("button", { name: /Model|Modèle/i });
    if (await model.isVisible()) {
      await model.click();
      await expect(page.locator(".chessboard-frame")).toHaveCount(1);
    }
  });
});
