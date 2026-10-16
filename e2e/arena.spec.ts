import { test, expect, type Locator, type Page } from "@playwright/test";

const ENGINE_TIMEOUT = 60_000;

/** The app's sticky header and mobile bottom nav can cover elements scrolled to an edge. */
async function tap(locator: Locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await locator.click();
}

async function movesPlayed(page: Page): Promise<number> {
  const text = (await page.getByTestId("arena-move-count").textContent()) ?? "";
  const match = text.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

async function playerName(page: Page, color: "w" | "b"): Promise<string> {
  return ((await page.getByTestId(`arena-player-${color}`).getByTestId("arena-player-name").textContent()) ?? "").trim();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("arena-e2e-init")) return;
    sessionStorage.setItem("arena-e2e-init", "1");
    localStorage.setItem("chess-arena.speed", "fast");
  });
});

test.describe("Arena — spectator", () => {
  test("shows the board first with both player bars", async ({ page }) => {
    await page.goto("/arena");
    await expect(page.getByRole("tab", { selected: true })).toBeVisible();
    await expect(page.getByTestId("arena-board-panel")).toBeVisible();
    await expect(page.getByTestId("arena-player-w")).toBeVisible();
    await expect(page.getByTestId("arena-player-b")).toBeVisible();
    await expect(page.getByTestId("arena-move-list")).toHaveCount(0);
    expect(await movesPlayed(page)).toBe(0);
  });

  test("swaps colors and picks a random matchup", async ({ page }) => {
    await page.goto("/arena");
    await expect(page.getByTestId("arena-player-w")).toBeVisible();
    await expect.poll(() => playerName(page, "w")).not.toBe("");
    const white = await playerName(page, "w");
    const black = await playerName(page, "b");
    expect(white).not.toBe(black);

    await tap(page.getByTestId("arena-swap"));
    await expect.poll(() => playerName(page, "w")).toBe(black);
    expect(await playerName(page, "b")).toBe(white);

    await tap(page.getByTestId("arena-random"));
    await expect.poll(async () => (await playerName(page, "w")) !== (await playerName(page, "b"))).toBe(true);
  });

  test("steps one move, then plays and pauses", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/arena");
    const step = page.getByTestId("arena-step");
    await expect(step).toBeEnabled({ timeout: ENGINE_TIMEOUT });

    await tap(step);
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBe(1);
    await expect(page.getByTestId("arena-move-list").getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /PGN/ }).first()).toBeEnabled();

    await tap(page.getByTestId("arena-start"));
    await expect(page.getByTestId("arena-pause")).toBeVisible();
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBeGreaterThanOrEqual(3);
    await tap(page.getByTestId("arena-pause"));
    await expect(page.getByTestId("arena-start")).toBeVisible({ timeout: ENGINE_TIMEOUT });

    const paused = await movesPlayed(page);
    await page.waitForTimeout(1_500);
    expect(await movesPlayed(page)).toBe(paused);

    await tap(page.getByTestId("arena-reset"));
    await expect.poll(() => movesPlayed(page)).toBe(0);
  });

  test("keyboard shortcuts step and flip the board", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/arena");
    await expect(page.getByTestId("arena-step")).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    const topBefore = await page.getByTestId("arena-board-panel").locator("[data-testid^=arena-player-]").first().getAttribute("data-testid");

    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("f");
    await expect
      .poll(() =>
        page.getByTestId("arena-board-panel").locator("[data-testid^=arena-player-]").first().getAttribute("data-testid")
      )
      .not.toBe(topBefore);

    await page.keyboard.press("ArrowRight");
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBe(1);
  });

  test("plays a 2-game match with a live eval graph and head-to-head", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/arena");
    await expect(page.getByTestId("arena-h2h")).toBeVisible();
    // Setup starts collapsed on mobile so the board stays above the fold.
    const setup = page.locator("[aria-controls=arena-setup]");
    if ((await setup.getAttribute("aria-expanded")) === "false") await tap(setup);
    await tap(page.getByTestId("arena-series-2"));
    await expect(page.getByTestId("arena-series-2")).toHaveAttribute("aria-checked", "true");

    const start = page.getByTestId("arena-start");
    await expect(start).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(start);
    await expect(page.getByTestId("arena-series")).toBeVisible();
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId("arena-eval-graph")).toBeVisible();
    await expect(page.getByTestId("arena-share-image")).toBeEnabled();

    await tap(page.getByTestId("arena-pause"));
    await expect(start).toBeVisible({ timeout: ENGINE_TIMEOUT });
    // The match length can't change mid-match.
    await tap(page.locator("[aria-controls=arena-setup]"));
    await expect(page.getByTestId("arena-series-4")).toBeDisabled();
    await tap(page.getByTestId("arena-reset"));
    await expect(page.getByTestId("arena-series")).toHaveCount(0);
  });

  test("shows the local Arena leaderboard", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "chess-arena.ratings.v1",
        JSON.stringify({
          players: {
            "alpha|lichess": { key: "alpha|lichess", name: "Alpha", rating: 1650, games: 12, wins: 8, draws: 2, losses: 2 },
            "beta|chesscom": { key: "beta|chesscom", name: "Beta", rating: 1580, games: 3, wins: 1, draws: 0, losses: 2 },
          },
          h2h: {},
        })
      );
    });
    await page.goto("/arena");
    const board = page.getByTestId("arena-leaderboard");
    await tap(board.getByRole("button", { expanded: false }).first());
    const rows = board.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("Alpha");
    await expect(rows.first()).toContainText("1650");
  });
});

test.describe("Arena — playoff", () => {
  test("tab is reflected in the URL and survives reload", async ({ page }) => {
    await page.goto("/arena");
    await tap(page.getByRole("tab", { name: /Playoff/i }));
    await expect(page).toHaveURL(/mode=playoff/);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /Playoff/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("playoff-seed-elo")).toBeVisible();
  });

  test("seeds by Elo and starts the bracket", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/arena?mode=playoff");
    await expect(page.getByTestId("playoff-seed-elo")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await tap(page.getByTestId("playoff-seed-elo"));
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`playoff-slot-${i}`)).not.toHaveText(/^\s*$/);
    }
    const run = page.getByTestId("playoff-run");
    await expect(run).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(run);

    // Wait for the live game UI first (engine can be slow under parallel workers).
    await expect(page.getByTestId("arena-board-panel")).toBeVisible();
    await expect(page.getByTestId("playoff-pause")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await expect(page.getByTestId("playoff-seed-elo")).toBeDisabled();
    await expect
      .poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT * 2 })
      .toBeGreaterThanOrEqual(1);

    await tap(page.getByTestId("playoff-pause"));
    await expect(page.getByTestId("playoff-pause")).toBeHidden({ timeout: ENGINE_TIMEOUT });
  });

  test("runs a round-robin with live standings", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/arena?mode=playoff");
    await tap(page.getByTestId("playoff-format-roundrobin"));
    await expect(page.getByTestId("playoff-format-roundrobin")).toHaveAttribute("aria-checked", "true");
    await tap(page.getByRole("radio", { name: /^4 / }));
    await tap(page.getByTestId("playoff-seed-elo"));
    const run = page.getByTestId("playoff-run");
    await expect(run).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(run);

    const league = page.getByTestId("playoff-league");
    // On narrow screens the standings fold away while games run.
    const panel = page.locator("[aria-controls=playoff-bracket]");
    if ((await panel.getAttribute("aria-expanded")) === "false" && !(await league.isVisible())) {
      await tap(panel);
    }
    await expect(league).toBeVisible();
    await expect(league.locator("tbody tr")).toHaveCount(4);
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBeGreaterThanOrEqual(2);
    await tap(page.getByTestId("playoff-pause"));
    await expect(page.getByTestId("playoff-pause")).toBeHidden({ timeout: ENGINE_TIMEOUT });
  });
});

async function playSquares(page: Page, from: string, to: string) {
  const board = page.locator("[data-testid=arena-board][data-interactive=true]");
  await expect(board).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await tap(board.locator(`[data-chess-square=${from}]`));
  await tap(board.locator(`[data-chess-square=${to}]`));
}

function seedHumans(page: Page, names: string[]) {
  return page.addInitScript((list) => {
    localStorage.setItem(
      "chess-arena.humans.v1",
      JSON.stringify(list.map((name, i) => ({ id: `e2e${i}`, name, elo: 1500 - i * 100, createdAt: i })))
    );
  }, names);
}

test.describe("Arena — human players", () => {
  test("the Humans tab asks for players first", async ({ page }) => {
    await page.goto("/arena?mode=humans");
    await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("id", "arena-tab-humans");
    await expect(page.getByTestId("humans-need-players")).toBeVisible();
    await expect(page.getByTestId("arena-human-name")).toBeVisible();
  });

  test("a human joins and plays White against an avatar", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/arena");
    const humansPanel = page.locator("[aria-controls=arena-humans-body]");
    if ((await humansPanel.getAttribute("aria-expanded")) === "false") await tap(humansPanel);
    await page.getByTestId("arena-human-name").fill("Alice");
    await tap(page.getByTestId("arena-human-add"));
    await expect(page.getByTestId("arena-human-list")).toContainText("Alice");

    const setup = page.locator("[aria-controls=arena-setup]");
    if ((await setup.getAttribute("aria-expanded")) === "false") await tap(setup);
    await tap(page.getByTestId("arena-profile-list").getByRole("option", { name: /Alice/ }));
    await expect.poll(() => playerName(page, "w")).toBe("Alice");

    const start = page.getByTestId("arena-start");
    await expect(start).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(start);
    await expect(page.getByTestId("arena-your-move-w")).toBeVisible();
    await expect(page.getByTestId("arena-status")).toContainText("Alice");

    await playSquares(page, "e2", "e4");
    // The avatar answers, then it is Alice's turn again.
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId("arena-your-move-w")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await expect(page.getByTestId("arena-eval-graph")).toHaveCount(0);

    await tap(page.getByTestId("arena-pause"));
    await expect(start).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await expect(page.locator("[data-testid=arena-board][data-interactive=true]")).toHaveCount(0);
  });

  test("runs a humans-only knockout, hot-seat", async ({ page }) => {
    test.setTimeout(150_000);
    await seedHumans(page, ["Ana", "Ben", "Cleo", "Dan"]);
    await page.goto("/arena?mode=humans");
    await tap(page.getByRole("radio", { name: /^4 / }));
    await tap(page.getByTestId("playoff-seed-elo"));
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`playoff-slot-${i}`)).not.toHaveText(/^\s*$/);
    }
    const run = page.getByTestId("playoff-run");
    await expect(run).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(run);

    await expect(page.getByTestId("arena-your-move-w")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await playSquares(page, "e2", "e4");
    await expect(page.getByTestId("arena-your-move-b")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    // Two humans: the board turns to the side to move.
    await expect(
      page.getByTestId("arena-board-panel").locator(".arena-player-bar").last()
    ).toHaveAttribute("data-testid", "arena-player-b");
    await playSquares(page, "e7", "e5");
    await expect.poll(() => movesPlayed(page)).toBe(2);

    await tap(page.getByTestId("playoff-pause"));
    await expect(page.getByTestId("playoff-pause")).toBeHidden({ timeout: ENGINE_TIMEOUT });
  });
});

test.describe("Arena — polish", () => {
  test("Swiss format seeds and starts with progress", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/arena?mode=playoff");
    await tap(page.getByTestId("playoff-format-swiss"));
    await expect(page.getByTestId("playoff-format-swiss")).toHaveAttribute("aria-checked", "true");
    await tap(page.getByRole("radio", { name: /^8 / }));
    await tap(page.getByTestId("playoff-seed-elo"));
    const run = page.getByTestId("playoff-run");
    await expect(run).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(run);
    await expect(page.getByTestId("playoff-progress")).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBeGreaterThanOrEqual(1);
    await tap(page.getByTestId("playoff-pause"));
    await expect(page.getByTestId("playoff-pause")).toBeHidden({ timeout: ENGINE_TIMEOUT });
  });

  test("share image button is enabled after a move", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/arena");
    await expect(page.getByTestId("arena-step")).toBeEnabled({ timeout: ENGINE_TIMEOUT });
    await tap(page.getByTestId("arena-step"));
    await expect.poll(() => movesPlayed(page), { timeout: ENGINE_TIMEOUT }).toBe(1);
    await expect(page.getByTestId("arena-share-image")).toBeEnabled();
  });

  test("deep link seeds white and black keys", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "chess-arena.humans.v1",
        JSON.stringify([{ id: "deeplink", name: "Deeplink", elo: 1500, createdAt: 1 }])
      );
    });
    await page.goto("/arena?white=human:deeplink");
    await expect.poll(() => playerName(page, "w"), { timeout: 15_000 }).toBe("Deeplink");
  });
});
