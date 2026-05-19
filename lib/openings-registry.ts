/**
 * Registre fusionné : noyau [`OPENINGS_DATABASE`](./openings-library.ts) + partitions JSON.
 * Ajouter de nouvelles lignes dans `lib/data/openings/partitions/` puis `npm run openings:refresh`.
 */

import {
  OPENINGS_DATABASE,
  type Opening,
} from "./openings-library";
import type { PrefixMatchResult } from "./openings-library";
import e4Extended from "./data/openings/partitions/e4-extended.json";
import lichessNamed from "./data/openings/partitions/lichess-named-openings.json";
import popularMainlines from "./data/openings/partitions/popular-mainlines.json";

const PARTITIONS: Opening[][] = [
  popularMainlines as Opening[],
  e4Extended as Opening[],
  lichessNamed as Opening[],
];

let aggregatedCache: Opening[] | null = null;
/** UCI prefix key → opening with the longest line through that prefix. */
let prefixIndexCache: Map<string, Opening> | null = null;

export function getAggregatedOpenings(): Opening[] {
  if (aggregatedCache) return aggregatedCache;
  const extra = PARTITIONS.flat();
  const merged =
    extra.length === 0 ? [...OPENINGS_DATABASE] : [...OPENINGS_DATABASE, ...extra];
  const seen = new Set<string>();
  const out: Opening[] = [];
  for (const o of merged) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    out.push(o);
  }
  aggregatedCache = out;
  return out;
}

function buildPrefixIndex(): Map<string, Opening> {
  const index = new Map<string, Opening>();
  for (const o of getAggregatedOpenings()) {
    for (let len = 1; len <= o.uciMoves.length; len++) {
      const key = o.uciMoves.slice(0, len).join(",");
      const prev = index.get(key);
      if (!prev || o.uciMoves.length > prev.uciMoves.length) {
        index.set(key, o);
      }
    }
  }
  return index;
}

function getPrefixIndex(): Map<string, Opening> {
  if (!prefixIndexCache) {
    prefixIndexCache = buildPrefixIndex();
  }
  return prefixIndexCache;
}

/** Test helper — clears memoized opening pool. */
export function clearAggregatedOpeningsCache(): void {
  aggregatedCache = null;
  prefixIndexCache = null;
}

function findBestOpeningByPrefixLinear(uciMoves: string[]): PrefixMatchResult {
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

/**
 * Longest opening line matching the UCI prefix (used for book detection & UI).
 */
export function findBestOpeningByPrefix(uciMoves: string[]): PrefixMatchResult {
  if (uciMoves.length === 0) {
    return { opening: null, matchedPlies: 0 };
  }

  const key = uciMoves.join(",");
  const hit = getPrefixIndex().get(key);
  if (hit) {
    let ok = true;
    for (let i = 0; i < uciMoves.length; i++) {
      if (hit.uciMoves[i] !== uciMoves[i]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return { opening: hit, matchedPlies: uciMoves.length };
    }
  }

  return findBestOpeningByPrefixLinear(uciMoves);
}

/**
 * Per-ply opening labels for a full game — extends the previous ply’s book line when
 * possible instead of rescanning the whole prefix from scratch every time.
 */
export function computeOpeningByPly(uciMoves: string[]): Array<Opening | null> {
  const result: Array<Opening | null> = [];
  let stillInBook = true;
  let active: Opening | null = null;
  let activeMatched = 0;

  for (let i = 0; i < uciMoves.length; i++) {
    if (!stillInBook) {
      result.push(null);
      continue;
    }

    const move = uciMoves[i];
    if (active && activeMatched === i && active.uciMoves[i] === move) {
      activeMatched = i + 1;
      result.push(active);
      continue;
    }

    const slice = uciMoves.slice(0, i + 1);
    const { opening, matchedPlies } = findBestOpeningByPrefix(slice);
    if (opening && matchedPlies === slice.length) {
      active = opening;
      activeMatched = matchedPlies;
      result.push(opening);
    } else {
      stillInBook = false;
      active = null;
      activeMatched = 0;
      result.push(null);
    }
  }

  return result;
}

export function detectOpening(uciMoves: string[]): Opening | null {
  return findBestOpeningByPrefix(uciMoves).opening;
}
