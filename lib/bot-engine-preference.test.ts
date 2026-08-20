import { describe, expect, it } from "vitest";
import {
  isBotEngineFallback,
  isMasterBot,
  MASTER_BOT_ELO,
  resolveBotEngine,
  shouldWarnChessAvatarWeak,
} from "./bot-engine-preference";

describe("isMasterBot", () => {
  it("returns true at master Elo threshold", () => {
    expect(isMasterBot({ elo: MASTER_BOT_ELO })).toBe(true);
    expect(isMasterBot({ elo: MASTER_BOT_ELO - 1 })).toBe(false);
  });

  it("returns true for difficulty 5+", () => {
    expect(isMasterBot({ difficulty: 5 })).toBe(true);
    expect(isMasterBot({ difficulty: 4 })).toBe(false);
  });
});

describe("resolveBotEngine", () => {
  const ready = { ca: true, caPlay: true, sf: true };

  it("prefers ChessAvatar when explicitly selected and play-ready", () => {
    expect(
      resolveBotEngine("chessavatar", ready.ca, ready.sf, ready.caPlay)
    ).toBe("chessavatar");
  });

  it("falls back to Stockfish when ChessAvatar is not play-ready", () => {
    expect(resolveBotEngine("chessavatar", true, ready.sf, false)).toBe("stockfish");
  });

  it("prefers Stockfish when explicitly selected", () => {
    expect(resolveBotEngine("stockfish", ready.ca, ready.sf, ready.caPlay)).toBe(
      "stockfish"
    );
  });

  it("auto uses Stockfish for master bots", () => {
    expect(
      resolveBotEngine("auto", ready.ca, ready.sf, ready.caPlay, { elo: 2700 })
    ).toBe("stockfish");
  });

  it("auto uses ChessAvatar for non-master bots when play-ready", () => {
    expect(
      resolveBotEngine("auto", ready.ca, ready.sf, ready.caPlay, { elo: 1500 })
    ).toBe("chessavatar");
  });

  it("auto falls back to Stockfish when ChessAvatar is not play-ready", () => {
    expect(resolveBotEngine("auto", true, ready.sf, false, { elo: 1500 })).toBe(
      "stockfish"
    );
  });

  it("returns null when no engine is ready", () => {
    expect(resolveBotEngine("chessavatar", false, false, false)).toBe(null);
  });

  it("uses Stockfish when ChessAvatar is disallowed", () => {
    expect(
      resolveBotEngine("chessavatar", ready.ca, ready.sf, ready.caPlay, undefined, false)
    ).toBe("stockfish");
    expect(
      resolveBotEngine("auto", ready.ca, ready.sf, ready.caPlay, { elo: 1500 }, false)
    ).toBe("stockfish");
  });
});

describe("isBotEngineFallback", () => {
  it("detects Stockfish fallback when ChessAvatar was preferred", () => {
    expect(
      isBotEngineFallback("chessavatar", "stockfish", true, true, false)
    ).toBe(true);
  });

  it("is false when runtime matches auto primary for a weak bot", () => {
    expect(
      isBotEngineFallback("auto", "chessavatar", true, true, true, { elo: 1200 })
    ).toBe(false);
  });
});

describe("shouldWarnChessAvatarWeak", () => {
  it("warns when ChessAvatar is forced on a master bot", () => {
    expect(shouldWarnChessAvatarWeak("chessavatar", { elo: 2800 })).toBe(true);
  });

  it("does not warn in auto or stockfish mode", () => {
    expect(shouldWarnChessAvatarWeak("auto", { elo: 2800 })).toBe(false);
    expect(shouldWarnChessAvatarWeak("stockfish", { elo: 2800 })).toBe(false);
  });
});
