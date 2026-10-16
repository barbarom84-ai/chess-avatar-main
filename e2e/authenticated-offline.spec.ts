import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./helpers/auth";

test.describe("Authenticated offline / network error UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await signInAsTestUser(page);
  });

  test("signed-in user sees offline puzzle daily error with retry", async ({
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
    await expect(page.getByTestId("fetch-error-retry")).toBeVisible();
    await expect(page.getByTestId("fetch-error-state")).toContainText(
      /offline|hors ligne/i
    );
    // Still authenticated (no Sign In CTA in header)
    await expect(
      page.getByRole("button", { name: /sign in|connexion/i })
    ).toHaveCount(0);
  });

  test("signed-in user sees offline play library error with retry", async ({
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
    await expect(
      page.getByRole("button", { name: /sign in|connexion/i })
    ).toHaveCount(0);
  });

  test("signed-in user can open online lobby shell", async ({ page }) => {
    await page.goto("/online");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByRole("button", { name: /sign in|connexion/i })
    ).toHaveCount(0);
  });
});
