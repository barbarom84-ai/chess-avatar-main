import { Chess } from "chess.js";

/** Rejoue la ligne principale jusqu’au coup inclus (index 0-based). -1 = position initiale. */
export function chessAfterMainline(
  mainlineSans: string[],
  inclusiveEndIndex: number
): Chess {
  const c = new Chess();
  if (inclusiveEndIndex < 0) return c;
  for (let i = 0; i <= inclusiveEndIndex && i < mainlineSans.length; i++) {
    const m = c.move(mainlineSans[i]);
    if (!m) break;
  }
  return c;
}

/** Applique des coups SAN d’exploration depuis une copie de `base`. */
export function applyExplorationSans(base: Chess, explorationSans: string[]): Chess {
  const c = new Chess(base.fen());
  for (const san of explorationSans) {
    const m = c.move(san);
    if (!m) break;
  }
  return c;
}

/** Tous les segments d’exploration joués à la suite (sous-lignes empilées). */
export function chessWithExplorationStack(
  mainlineSans: string[],
  mainlineEndIndex: number,
  explorationSegments: string[][],
  tailMoves: string[]
): Chess {
  let c = chessAfterMainline(mainlineSans, mainlineEndIndex);
  for (const seg of explorationSegments) {
    c = applyExplorationSans(c, seg);
  }
  c = applyExplorationSans(c, tailMoves);
  return c;
}

/** Case d’arrivée du coup d’index `moveIndex` sur la ligne principale. */
export function mainlineMoveTargetSquare(
  mainlineSans: string[],
  moveIndex: number
): string | null {
  if (moveIndex < 0 || moveIndex >= mainlineSans.length) return null;
  const c = chessAfterMainline(mainlineSans, moveIndex - 1);
  const m = c.move(mainlineSans[moveIndex]);
  return m ? m.to : null;
}
