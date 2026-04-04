import { Chess, type Move } from "chess.js";

function moveToUci(m: Move): string {
  const promo = m.promotion ?? "";
  return `${m.from}${m.to}${promo}`;
}

/** Extrait la liste des coups UCI (ex. e2e4) d’un bloc PGN d’une seule partie. */
export function pgnBlockToUciMoves(pgnBlock: string): string[] | null {
  const trimmed = pgnBlock.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const verbose = chess.history({ verbose: true });
    return verbose.map(moveToUci);
  } catch {
    return null;
  }
}
