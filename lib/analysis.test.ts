import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzePersona, estimatePersonaElo, type PersonaGameInput } from "./analysis";
import { clampProfileElo, MIN_PROFILE_ELO, MAX_PROFILE_ELO } from "./persona-engine-params";

const ITALIAN_PGN = `[Event "Test"]
[White "alice"]
[Black "bob"]
[WhiteElo "2100"]
[BlackElo "1800"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *
`;

function italianGame(overrides: Partial<PersonaGameInput> = {}): PersonaGameInput {
  return {
    pgn: ITALIAN_PGN,
    winner: "white",
    players: {
      white: { user: { name: "alice" } },
      black: { user: { name: "bob" } },
    },
    ...overrides,
  };
}

describe("estimatePersonaElo (aligned with Android AnalyzePersona)", () => {
  it("clamps like EloBounds.kt", () => {
    assert.equal(clampProfileElo(399), MIN_PROFILE_ELO);
    assert.equal(clampProfileElo(4000), MAX_PROFILE_ELO);
    assert.equal(clampProfileElo(2050.9), 2050);
  });

  it("uses platform rating when present", () => {
    assert.equal(estimatePersonaElo([italianGame()], "alice", 100, 2477), 2477);
  });

  it("averages PGN self Elo and opponent performance", () => {
    // self 2100, opp 1800 + (100-50)*4 = 2000 → 2050
    assert.equal(estimatePersonaElo([italianGame()], "alice", 100), 2050);
  });

  it("falls back to 800 + winRate * 27", () => {
    const noTags: PersonaGameInput = {
      pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *",
      winner: "white",
      players: {
        white: { user: { name: "alice" } },
        black: { user: { name: "bob" } },
      },
    };
    assert.equal(estimatePersonaElo([noTags], "alice", 50), 2150);
    assert.equal(estimatePersonaElo([noTags], "alice", 100), 3500);
  });

  it("wires Elo into analyzePersona", () => {
    const { config, stats } = analyzePersona([italianGame()], "alice", undefined, "lichess");
    assert.equal(config.elo, 2050);
    assert.equal(stats.winRate, 100);
    const withPlatform = analyzePersona([italianGame()], "alice", undefined, "lichess", 1900);
    assert.equal(withPlatform.config.elo, 1900);
  });
});
