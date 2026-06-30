import { test, expect } from "@playwright/test";

test.describe("Chess Avatar smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Chess Avatar/i);
  });

  test("analyze page loads", async ({ page }) => {
    await page.goto("/analyze");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("avatars page loads", async ({ page }) => {
    await page.goto("/avatars");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
