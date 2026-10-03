import { PARITY } from "@/lib/parity-contract";

/** ELO affiché sur les cartes / profils (aligné Chess.com top players). */
export const MAX_PROFILE_ELO = PARITY.elo.maxProfile;

export const MIN_PROFILE_ELO = PARITY.elo.minProfile;

/** Plafond UCI Stockfish (le moteur ne dépasse pas ~3190). */
export const UCI_ELO_MAX = PARITY.elo.uciMax;

export const UCI_ELO_MIN = PARITY.elo.uciMin;

export function clampProfileElo(elo: number): number {
  return Math.min(MAX_PROFILE_ELO, Math.max(MIN_PROFILE_ELO, Math.round(elo)));
}

/** ELO envoyé au moteur (profil affiché peut être > 3190). */
export function uciEloFromProfileElo(elo: number): number {
  return Math.min(UCI_ELO_MAX, Math.max(UCI_ELO_MIN, Math.round(elo)));
}
