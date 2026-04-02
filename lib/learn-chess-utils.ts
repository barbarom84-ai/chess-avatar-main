import { Chess } from "chess.js";

/** chess.js lève une erreur sur coup illégal (objet {from,to}) — on renvoie false sans propager. */
function applyUci(game: Chess, uci: string): boolean {
  const s = uci.trim().toLowerCase();
  if (s.length < 4) return false;
  const from = s.slice(0, 2);
  const to = s.slice(2, 4);
  const promotion = s.length > 4 ? (s[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    const m = game.move({ from, to, promotion });
    return !!m;
  } catch {
    return false;
  }
}

/** FEN après avoir joué les `count` premiers coups UCI (count peut être 0). */
export function fenAfterUciMoves(uciMoves: string[], count: number): string {
  try {
    const g = new Chess();
    const n = Math.min(count, uciMoves.length);
    for (let i = 0; i < n; i++) {
      if (!applyUci(g, uciMoves[i])) break;
    }
    return g.fen();
  } catch {
    return new Chess().fen();
  }
}

/** SAN du coup UCI depuis une position FEN (pour affichage boutons). */
export function uciToSanFromFen(fen: string, uci: string): string {
  const s = uci.trim().toLowerCase();
  if (s.length < 4) return uci;
  const from = s.slice(0, 2);
  const to = s.slice(2, 4);
  const promotion = s.length > 4 ? (s[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    const g = new Chess(fen);
    const m = g.move({ from, to, promotion });
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
