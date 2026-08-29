import { describe, expect, it } from "vitest";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { CHESS_AVATAR_PRO_CONFIG } from "@/lib/chess-avatar-pro-coach";
import { dedupeReviewCoachAvatars } from "@/lib/review-coach-options";

function avatar(
  id: string,
  name: string,
  platform: EngineConfig["platform"] = "lichess"
): { id: string; config: EngineConfig; stats: PersonaStats } {
  return {
    id,
    config: { name, platform } as EngineConfig,
    stats: { username: name } as PersonaStats,
  };
}

describe("dedupeReviewCoachAvatars", () => {
  it("keeps the first of same name across platforms", () => {
    const rows = [
      avatar("a", "Hikaru", "lichess"),
      avatar("b", "Hikaru", "chesscom"),
    ];
    const unique = dedupeReviewCoachAvatars(rows);
    expect(unique.map((a) => a.id)).toEqual(["a"]);
  });

  it("skips ChessAvatarPro and the opponent already listed", () => {
    const opponent = { name: "Bot_Blitz", platform: "lichess" as const };
    const rows = [
      avatar("pro", CHESS_AVATAR_PRO_CONFIG.name),
      avatar("opp", "Bot_Blitz"),
      avatar("ok", "Magnus"),
      avatar("dup", "Magnus", "chesscom"),
    ];
    const unique = dedupeReviewCoachAvatars(rows, opponent);
    expect(unique.map((a) => a.id)).toEqual(["ok"]);
  });
});
