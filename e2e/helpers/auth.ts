import { expect, type Page } from "@playwright/test";

/** Defaults match scripts/ensure-e2e-test-user.ts */
export const E2E_TEST_EMAIL =
  process.env.E2E_TEST_EMAIL || "e2e.test@chessavatar.local";
export const E2E_TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || "ChessAvatarE2e!23456";

/** Sign in via the site Auth modal. Assumes the page is already loaded. */
export async function signInAsTestUser(page: Page): Promise<void> {
  const signInNav = page.getByRole("button", { name: /sign in|connexion/i });
  await expect(signInNav.first()).toBeVisible({ timeout: 45_000 });
  await signInNav.first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });

  // Prefer Sign in tab if Sign up is selected
  const signInTab = dialog.getByRole("tab", { name: /sign in|connexion/i });
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
  }

  await dialog.locator('input[type="email"]').fill(E2E_TEST_EMAIL);
  await dialog.locator('input[type="password"]').fill(E2E_TEST_PASSWORD);
  await dialog
    .getByRole("button", { name: /^(sign in|se connecter)$/i })
    .click();

  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: /sign in|connexion/i })
  ).toHaveCount(0, { timeout: 30_000 });
}
