import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/avatar-chat-prompt";

describe("avatar-chat-prompt", () => {
  it("builds French system prompt with player name", () => {
    const prompt = buildSystemPrompt({
      message: "hello",
      lang: "fr",
      stats: {
        username: "MagnusClone",
        style: "Agressif",
        winRate: 55,
        topOpenings: [{ name: "Sicilian", count: 10 }],
      },
      config: {
        playStyle: "agressif",
        elo: 1800,
        favoriteOpening: "Sicilian",
      },
    });
    expect(prompt).toContain("MagnusClone");
    expect(prompt).toContain("français");
  });

  it("uses the house-coach prompt for ChessAvatarPro", () => {
    const prompt = buildSystemPrompt({
      message: "why",
      lang: "en",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
    });
    expect(prompt).toContain("ChessAvatarPro");
    expect(prompt).toContain("official ChessAvatar coach");
  });

  it("tells the review coach the student is Black and that c3 is White's move", () => {
    const prompt = buildSystemPrompt({
      message: "Pourquoi ce coup ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6",
        lastMove: "c3",
        lastMoveUci: "c2c3",
        bestMove: "O-O",
        bestMoveUci: "e1g1",
        classification: "blunder",
        cpl: 295,
        sideToMove: "white",
        playerColor: "black",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("les Noirs");
    expect(prompt).toContain("les Blancs");
    expect(prompt).toContain("c3");
    expect(prompt).toContain("O-O");
    expect(prompt).toContain("PAS un coup du joueur");
    expect(prompt).toContain("N'inverse jamais Blancs et Noirs");
    expect(prompt).toContain("T=tour");
  });

  it("uses French piece letters in the review prompt (Te1, not Re1)", () => {
    const prompt = buildSystemPrompt({
      message: "Pourquoi ce coup ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "Re1",
        bestMove: "Ne7+",
        sideToMove: "white",
        playerColor: "white",
        isPlayerMove: true,
        classification: "mistake",
      },
    });
    expect(prompt).toContain("Te1");
    expect(prompt).toContain("Ce7+");
    expect(prompt).not.toContain("Coup affiché, joué par les Blancs : Re1");
  });
});
