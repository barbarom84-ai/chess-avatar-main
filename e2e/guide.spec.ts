import { test, expect } from "@playwright/test";

test.describe("Guide (Fritz 20 UCI)", () => {
  test("loads Fritz-first shell with mode rail and analyze CTA", async ({
    page,
  }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("guide-mode-fritz")).toBeVisible();
    await expect(page.getByTestId("guide-center")).toBeVisible();
    await expect(page.getByTestId("guide-header-cta")).toHaveAttribute(
      "href",
      "/analyze"
    );
    await expect(page.getByTestId("guide-engine-path")).toContainText(
      /ChessBase\\Engines/i
    );
  });

  test("switching modes updates the center panel", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByTestId("guide-mode-pack")).toBeVisible({
      timeout: 45_000,
    });
    await page.getByTestId("guide-mode-pack").click();
    await expect(page.getByTestId("guide-center")).toContainText(
      /ChessAvatarSetup|pack|ZIP/i
    );
    await page.getByTestId("guide-mode-help").click();
    await expect(page.getByTestId("guide-center")).toContainText(
      /SmartScreen|Stockfish|ChessAvatarSetup/i
    );
  });
});
