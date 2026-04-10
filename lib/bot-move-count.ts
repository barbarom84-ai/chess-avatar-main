/**
 * Compte les coups déjà joués par le bot dans l'historique UCI.
 * Indice pair = coup des blancs, impair = coup des noirs (partie standard).
 */
export function countBotMovesPlayed(
  moveHistoryUci: string[],
  botPlaysWhite: boolean
): number {
  let n = 0;
  for (let i = 0; i < moveHistoryUci.length; i++) {
    const whiteMove = i % 2 === 0;
    const botMove = whiteMove === botPlaysWhite;
    if (botMove) n++;
  }
  return n;
}

/** Défaut plan : erreur « humaine » tous les 10 coups du bot. */
export const DEFAULT_HUMAN_BLUNDER_INTERVAL = 10;

/**
 * Indique si le prochain coup du bot est le Nᵉ (N multiple de interval), ex. 10, 20…
 * @param interval 0 = désactivé
 */
export function shouldPlayHumanBlunderMove(
  moveHistoryUci: string[],
  botPlaysWhite: boolean,
  interval: number
): boolean {
  if (!interval || interval < 1) return false;
  const played = countBotMovesPlayed(moveHistoryUci, botPlaysWhite);
  const nextBotMoveIndex = played + 1;
  return nextBotMoveIndex % interval === 0;
}

/**
 * Choisit un coup sous-optimal parmi MultiPV (rangs 2–4), pour blunder « forcé ».
 */
export function pickForcedHumanBlunder(
  bestFromEngine: string,
  lineMoves: Map<number, string>
): string {
  const n = lineMoves.size;
  if (n < 2 || !bestFromEngine) return bestFromEngine;

  const candidates: number[] = [];
  for (let rank = 2; rank <= 4; rank++) {
    const m = lineMoves.get(rank);
    if (m && m !== bestFromEngine) candidates.push(rank);
  }
  if (candidates.length === 0) return bestFromEngine;

  const r = Math.floor(Math.random() * candidates.length);
  const pickRank = candidates[r]!;
  return lineMoves.get(pickRank) ?? bestFromEngine;
}
