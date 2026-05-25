import { Chess } from "chess.js";

export function validateStandardPuzzleLine(
  fen: string,
  solutionUcis: string[]
): { ok: true } | { ok: false; error: string } {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { ok: false, error: "Invalid FEN" };
  }

  for (const uci of solutionUcis) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
      if (!move) {
        return { ok: false, error: `Illegal move: ${uci}` };
      }
    } catch {
      return { ok: false, error: `Illegal move: ${uci}` };
    }
  }

  return { ok: true };
}
