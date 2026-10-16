import { test, expect } from "@playwright/test";

test.describe("Fetch / network error UX", () => {
  test("puzzles daily shows retry UI when the API fails", async ({ page }) => {
    await page.route("**/api/puzzles/daily", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/puzzles");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });

    const errorState = page.getByTestId("fetch-error-state");
    await expect(errorState).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("fetch-error-retry")).toBeVisible();
  });

  test("puzzles daily shows offline messaging when navigator is offline", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });
    await page.route("**/api/puzzles/daily", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/puzzles");
    await expect(page.getByTestId("fetch-error-state")).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("fetch-error-offline-icon")).toBeVisible();
    await expect(page.getByTestId("fetch-error-state")).toContainText(
      /offline|hors ligne/i
    );
  });

  test("learn hub recovers from a slow catalog and still lists lessons", async ({
    page,
  }) => {
    // Even if cloud is slow/unavailable, built-in lessons should appear after timeout/error.
    await page.goto("/learn");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.locator('a[href^="/learn/openings/"]').first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test("play invalid config shows retry UI", async ({ page }) => {
    await page.goto("/play?config=%7Bnot-json");
    await expect(page.getByTestId("fetch-error-state")).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("fetch-error-retry")).toBeVisible();
    await page.getByTestId("fetch-error-retry").click();
    await expect(page.getByTestId("play-mode-personalities")).toBeVisible({
      timeout: 45_000,
    });
  });

  test("play library shows offline error when profiles fetch fails offline", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });
    await page.route("**/rest/v1/profiles*", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/play");
    await expect(page.getByTestId("play-mode-library")).toBeVisible({
      timeout: 45_000,
    });
    await page.getByTestId("play-mode-library").click();
    await expect(page.getByTestId("fetch-error-state")).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("fetch-error-offline-icon")).toBeVisible();
    await expect(page.getByTestId("fetch-error-retry")).toBeVisible();
  });
});
