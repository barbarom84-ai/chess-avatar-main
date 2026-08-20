/** ELO affiché sur les cartes / profils (aligné Chess.com top players). */
export const MAX_PROFILE_ELO = 3500;

/** Plafond UCI Stockfish (le moteur ne dépasse pas ~3190). */
export const UCI_ELO_MAX = 3190;

export const UCI_ELO_MIN = 1320;

export function clampProfileElo(elo: number): number {
  return Math.min(MAX_PROFILE_ELO, Math.max(400, Math.round(elo)));
}

/** ELO envoyé au moteur (profil affiché peut être > 3190). */
export function uciEloFromProfileElo(elo: number): number {
  return Math.min(UCI_ELO_MAX, Math.max(UCI_ELO_MIN, Math.round(elo)));
}
