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
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 6",
        lastMove: "c3",
        lastMoveUci: "c2c3",
        bestMove: "O-O",
        bestMoveUci: "e1g1",
        classification: "blunder",
        cpl: 295,
        sideToMove: "white",
        turnToMove: "black",
        boardPieces: "White: Ra1 Nb1 Bc1 Qd1 Ke1 Bf1 Ng1 Rh1 Pa2 Pb2 Pc3 Pd3 Pe4 Pf2 Pg2 Ph2; Black: Ra8 Bc8 Qd8 Ke8 Rh8 Pa7 Pb7 Pc7 Pd7 Pe5 Pf7 Pg7 Ph7 Nc6 Nf6 Bc5",
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
    expect(prompt).toContain("TRAIT ACTUEL");
    expect(prompt).toContain("n'est PAS le camp qui vient de jouer");
    expect(prompt).toContain("Nc6");
    expect(prompt).toContain("n'invente aucune pièce");
  });

  it("tells the English review coach Black is to move after White's displayed move", () => {
    const prompt = buildSystemPrompt({
      message: "Why this move?",
      lang: "en",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "c3",
        sideToMove: "white",
        turnToMove: "black",
        boardPieces: "White: Ke1 Pc3; Black: ke8",
        playerColor: "black",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("SIDE TO MOVE NOW");
    expect(prompt).toContain("Black");
    expect(prompt).toContain("That side no longer has the move");
    expect(prompt).toContain("White: Ke1 Pc3");
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
