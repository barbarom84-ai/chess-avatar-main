/**
 * Registre fusionné : noyau [`OPENINGS_DATABASE`](./openings-library.ts) + partitions JSON.
 * Ajouter de nouvelles lignes dans `lib/data/openings/partitions/` puis importer ici.
 */

import {
  OPENINGS_DATABASE,
  type Opening,
} from "./openings-library";
import type { PrefixMatchResult } from "./openings-library";
import e4Extended from "./data/openings/partitions/e4-extended.json";

const PARTITIONS: Opening[][] = [e4Extended as Opening[]];

export function getAggregatedOpenings(): Opening[] {
  const extra = PARTITIONS.flat();
  return extra.length === 0 ? [...OPENINGS_DATABASE] : [...OPENINGS_DATABASE, ...extra];
}

/**
 * Même logique que l’ancienne implémentation sur OPENINGS_DATABASE, mais sur le pool agrégé.
 */
export function findBestOpeningByPrefix(uciMoves: string[]): PrefixMatchResult {
  if (uciMoves.length === 0) {
    return { opening: null, matchedPlies: 0 };
  }

  const pool = getAggregatedOpenings();
  let best: Opening | null = null;
  let bestMatch = 0;

  for (const o of pool) {
    let m = 0;
    const lim = Math.min(o.uciMoves.length, uciMoves.length);
    for (; m < lim; m++) {
      if (o.uciMoves[m] !== uciMoves[m]) break;
    }
    if (m === 0) continue;

    if (!best || m > bestMatch) {
      bestMatch = m;
      best = o;
    } else if (m === bestMatch && best && o.uciMoves.length > best.uciMoves.length) {
      best = o;
    } else if (m === bestMatch && !best) {
      best = o;
    }
  }

  return { opening: best, matchedPlies: bestMatch };
}

export function detectOpening(uciMoves: string[]): Opening | null {
  return findBestOpeningByPrefix(uciMoves).opening;
}
