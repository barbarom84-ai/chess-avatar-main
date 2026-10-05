import { describe, expect, it } from "vitest";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { fallbackPlayerLabel, opponentFromGame, pvpGameDurationSec } from "@/lib/pvp-utils";

const WHITE = "11111111-1111-1111-1111-111111111111";
const BLACK = "22222222-2222-2222-2222-222222222222";

function game(names: { white?: string | null; black?: string | null }): PvpGameRow {
  return {
    white_user_id: WHITE,
    black_user_id: BLACK,
    white_display_name: names.white ?? null,
    black_display_name: names.black ?? null,
  } as PvpGameRow;
}

describe("opponentFromGame", () => {
  it("keeps the game's name over the profile placeholder", () => {
    expect(opponentFromGame(game({ black: "LabBot B" }), WHITE, "Player")?.oppLabel).toBe("LabBot B");
  });

  it("uses the profile name when the game has none", () => {
    expect(opponentFromGame(game({}), BLACK, "Magnus")?.oppLabel).toBe("Magnus");
  });

  it("falls back to the id label when neither has a name", () => {
    expect(opponentFromGame(game({ white: "  " }), BLACK, null)?.oppLabel).toBe(fallbackPlayerLabel(WHITE));
  });

  it("returns the opponent's id and color", () => {
    expect(opponentFromGame(game({}), WHITE)).toMatchObject({ oppId: BLACK, oppColor: "black" });
  });
});

describe("pvpGameDurationSec", () => {
  const finished = {
    status: "finished" as const,
    created_at: "2026-10-05T17:00:00.000Z",
    updated_at: "2026-10-05T17:09:48.000Z",
  };
  const moves = [
    { ply: 1, created_at: "2026-10-05T17:02:53.000Z", time_spent_ms: 13_000 },
    { ply: 2, created_at: "2026-10-05T17:02:57.000Z", time_spent_ms: 3_800 },
  ];

  it("measures from White's first thinking time to the result, whatever the page saw", () => {
    expect(pvpGameDurationSec(finished, moves)).toBe(7 * 60 + 8);
  });

  it("starts at the game's creation when no move was played", () => {
    expect(pvpGameDurationSec(finished, [])).toBe(9 * 60 + 48);
  });

  it("is unknown while the game is not finished", () => {
    expect(pvpGameDurationSec({ ...finished, status: "playing" }, moves)).toBeNull();
    expect(pvpGameDurationSec({ ...finished, status: "aborted" }, [])).toBeNull();
  });
});
