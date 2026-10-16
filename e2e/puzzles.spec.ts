import { test, expect } from "@playwright/test";

test.describe("Puzzles page (Ascension-style layout)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/puzzles");
  });

  test("loads with title and mode switcher", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    // Mode segmented control (EN or FR)
    const daily = page.getByRole("button", { name: /Daily|Du jour/i });
    const random = page.getByRole("button", { name: /Random|Aléatoire/i });
    const catalog = page.getByRole("button", { name: /Catalog|Catalogue/i });

    await expect(daily).toBeVisible();
    await expect(random).toBeVisible();
    await expect(catalog).toBeVisible();
  });

  test("daily mode shows a play surface after load", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    // Wait for branded loader / skeleton to settle into daily content or error+retry
    const dailyTitle = page.getByText(/Daily puzzle|Puzzle du jour/i).first();
    await expect(dailyTitle).toBeVisible({ timeout: 30_000 });

    // Daily API may succeed (board) or fail (retry) — both are valid play surfaces.
    const board = page.locator(".chessboard-frame");
    const retry = page.getByRole("button", { name: /Retry|Réessayer/i });
    await expect
      .poll(async () => (await board.count()) + (await retry.count()), {
        timeout: 45_000,
      })
      .toBeGreaterThan(0);
  });

  test("switching to random shows empty CTA then can request a puzzle", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /Random|Aléatoire/i }).click();

    const newPuzzle = page.getByRole("button", {
      name: /New puzzle|Nouveau puzzle/i,
    });
    await expect(newPuzzle).toBeVisible();

    await expect(
      page.getByText(/Load a random puzzle|Chargez un puzzle aléatoire/i)
    ).toBeVisible();
  });

  test("catalog mode shows game picker and a single challenge focus", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /Catalog|Catalogue/i }).click();

    const gameSelect = page.locator("select").first();
    await expect(gameSelect).toBeVisible({ timeout: 15_000 });

    // Challenge list items (numbered buttons in the left rail)
    const challengeItem = page.locator("button").filter({ hasText: /^\d+\./ }).first();
    await expect(challengeItem).toBeVisible();

    // Center should not stack many boards — at most one chessboard frame
    const boards = page.locator(".chessboard-frame");
    await expect(boards).toHaveCount(1);
  });

  test("meta panel exposes Learn link", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const learn = page.getByRole("link", {
      name: /Open the Learn catalog|Ouvrir le catalogue Ouvertures/i,
    });
    await expect(learn).toBeVisible();
    await expect(learn).toHaveAttribute("href", "/learn");
  });
});
