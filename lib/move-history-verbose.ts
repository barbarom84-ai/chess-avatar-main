import { Chess, type Move } from "chess.js";

/** Rejoue une liste de coups SAN et retourne l’historique verbose ; `null` si un coup est invalide. */
export function buildVerboseHistoryFromSan(sanMoves: string[]): Move[] | null {
  const chess = new Chess();
  const out: Move[] = [];
  for (const san of sanMoves) {
    const m = chess.move(san);
    if (!m) return null;
    out.push(m);
  }
  return out;
}

/** Rejoue des coups UCI (from+to+promotion) et retourne l’historique verbose. */
export function buildVerboseHistoryFromUci(uciMoves: string[]): Move[] | null {
  const chess = new Chess();
  const out: Move[] = [];
  for (const raw of uciMoves) {
    const s = raw.trim().toLowerCase();
    if (s.length < 4) return null;
    const from = s.slice(0, 2);
    const to = s.slice(2, 4);
    const promotion =
      s.length > 4 ? (s[4] as "q" | "r" | "b" | "n") : undefined;
    const m = chess.move({ from, to, promotion });
    if (!m) return null;
    out.push(m);
  }
  return out;
}
