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
    expect(prompt).toContain("Stay side-neutral");
  });

  it("tells the review coach about White's c3 without taking the student's side", () => {
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
        legalMovesNow: ["a6", "a5", "Nf6", "O-O"],
        boardAscii: "8 | r . b q k . . r",
        playerColor: "black",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("les Noirs");
    expect(prompt).toContain("les Blancs");
    expect(prompt).toContain("c3");
    expect(prompt).toContain("O-O");
    expect(prompt).toContain("Reste NEUTRE");
    expect(prompt).not.toContain("L'élève joue");
    expect(prompt).not.toContain("PAS un coup du joueur");
    expect(prompt).toContain("T=tour");
    expect(prompt).toContain("TRAIT ACTUEL");
    expect(prompt).toContain("n'est PAS le camp qui vient de jouer");
    expect(prompt).toContain("Nc6");
    expect(prompt).not.toContain("Coups LÉGAUX MAINTENANT");
    expect(prompt).toContain("DERNIER COUP DÉJÀ JOUÉ");
    expect(prompt).toContain("DIAGRAMME ACTUEL");
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
        legalMovesNow: ["a6", "Nf6"],
        bestMove: "O-O",
        playerColor: "black",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("SIDE TO MOVE NOW");
    expect(prompt).toContain("Black");
    expect(prompt).toContain("That side no longer has the move");
    expect(prompt).toContain("White: Ke1 Pc3");
    expect(prompt).not.toContain("Legal moves NOW");
    expect(prompt).toContain("Stay NEUTRAL");
    expect(prompt).not.toContain("The student plays");
    expect(prompt).toContain("Stay side-neutral");
  });

  it("lists legal moves when asked how to play the position", () => {
    const prompt = buildSystemPrompt({
      message: "Comment jouer cette position ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "Qg7",
        lastMoveUci: "g5g7",
        sideToMove: "black",
        turnToMove: "white",
        legalMovesNow: ["c5", "Qd2"],
        playerColor: "white",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("Coups LÉGAUX MAINTENANT");
    expect(prompt).toContain("meilleure suite MAINTENANT pour les Blancs");
    expect(prompt).not.toContain("INTENTION : expliquer le DERNIER COUP");
  });

  it("grounds how-to-play on Stockfish's top 3 instead of the full legal list", () => {
    const prompt = buildSystemPrompt({
      message: "Comment jouer cette position ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "e5",
        lastMoveUci: "e7e5",
        sideToMove: "black",
        turnToMove: "white",
        legalMovesNow: ["c5", "Qd2", "Nf3", "a3"],
        engineLinesNow: [
          {
            rank: 1,
            san: "Nf3",
            uci: "g1f3",
            pvSan: ["Nf3"],
            evalWhitePov: 0.32,
          },
          {
            rank: 2,
            san: "d4",
            uci: "d2d4",
            pvSan: ["d4"],
            evalWhitePov: 0.28,
          },
          {
            rank: 3,
            san: "c4",
            uci: "c2c4",
            pvSan: ["c4"],
            evalWhitePov: 0.2,
          },
        ],
        playerColor: "white",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("3 MEILLEURS COUPS Stockfish");
    expect(prompt).toContain("Cf3");
    expect(prompt).toContain("d4");
    expect(prompt).toContain("c4");
    expect(prompt).not.toContain("Coups LÉGAUX MAINTENANT");
    expect(prompt).toContain("INTERDIT d'inventer un autre SAN");
  });

  it("grounds the best continuation on Stockfish now instead of a missed Black move", () => {
    const prompt = buildSystemPrompt({
      message: "Quelle était la meilleure suite ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "Qxg7",
        lastMoveUci: "g5g7",
        sideToMove: "black",
        turnToMove: "white",
        bestMove: "f6",
        legalMovesNow: ["d4", "e4", "g4"],
        engineLinesNow: [
          {
            rank: 1,
            san: "d4",
            uci: "d2d4",
            pvSan: ["d4"],
            evalWhitePov: 0.48,
          },
          {
            rank: 2,
            san: "e4",
            uci: "e3e4",
            pvSan: ["e4"],
            evalWhitePov: 0.41,
          },
          {
            rank: 3,
            san: "g4",
            uci: "g2g4",
            pvSan: ["g4"],
            evalWhitePov: 0.39,
          },
        ],
        playerColor: "white",
        isPlayerMove: false,
      },
    });
    expect(prompt).toContain("meilleure suite MAINTENANT pour les Blancs");
    expect(prompt).toContain("d4");
    expect(prompt).toContain("e4");
    expect(prompt).toContain("g4");
    expect(prompt).toContain("INTERDIT de proposer un coup joué par les Noirs");
    expect(prompt).not.toContain("AUCUNE alternative moteur");
    expect(prompt).not.toContain("Alternative moteur MANQUÉE");
  });

  it("does not invent a best continuation when the engine lines are missing", () => {
    const prompt = buildSystemPrompt({
      message: "Quelle était la meilleure suite ?",
      lang: "fr",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
      review: {
        lastMove: "Qxg7",
        sideToMove: "black",
        turnToMove: "white",
        boardPieces: "Black: Pc6 Nb8",
      },
    });
    expect(prompt).toContain("les 3 coups moteur ne sont pas prêts");
    expect(prompt).toContain("INTERDIT d'inventer un coup");
    expect(prompt).toContain("Reste NEUTRE");
    expect(prompt).not.toContain("AUCUNE alternative moteur");
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
