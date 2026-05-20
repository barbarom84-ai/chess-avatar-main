/**
 * Registre fusionné : noyau [`OPENINGS_DATABASE`](./openings-library.ts) + partitions JSON.
 * Partitions chargées via `import()` dynamique — `npm run openings:refresh` pour régénérer.
 */

import {
  OPENINGS_DATABASE,
  type Opening,
} from "./openings-library";
import type { PrefixMatchResult } from "./openings-library";

let partitionOpenings: Opening[] = [];
let partitionsLoaded = false;
let partitionsLoadPromise: Promise<void> | null = null;
/** Vitest: use only injected partitions (no OPENINGS_DATABASE). */
let testOnlyPartitions = false;

let aggregatedCache: Opening[] | null = null;
let prefixIndexCache: Map<string, Opening> | null = null;

async function loadPartitionFiles(): Promise<void> {
  const [popular, e4, lichess] = await Promise.all([
    import("./data/openings/partitions/popular-mainlines.json"),
    import("./data/openings/partitions/e4-extended.json"),
    import("./data/openings/partitions/lichess-named-openings.json"),
  ]);
  partitionOpenings = [
    ...(popular.default as Opening[]),
    ...(e4.default as Opening[]),
    ...(lichess.default as Opening[]),
  ];
  partitionsLoaded = true;
  aggregatedCache = null;
  prefixIndexCache = null;
}

/**
 * Charge les partitions JSON (client). Sans await, seul le noyau OPENINGS_DATABASE est visible.
 */
export function ensureOpeningsPartitionsLoaded(): Promise<void> {
  if (partitionsLoaded) return Promise.resolve();
  if (!partitionsLoadPromise) {
    partitionsLoadPromise = loadPartitionFiles().catch((err) => {
      partitionsLoadPromise = null;
      console.warn("Openings partitions failed to load:", err);
    });
  }
  return partitionsLoadPromise;
}

export function getAggregatedOpenings(): Opening[] {
  if (aggregatedCache) return aggregatedCache;
  const merged = testOnlyPartitions
    ? [...partitionOpenings]
    : [...OPENINGS_DATABASE, ...partitionOpenings];
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
  partitionOpenings = [];
  partitionsLoaded = false;
  partitionsLoadPromise = null;
  testOnlyPartitions = false;
}

/** Test helper — inject partitions without dynamic import. */
export function setPartitionOpeningsForTests(openings: Opening[]): void {
  partitionOpenings = openings;
  partitionsLoaded = true;
  testOnlyPartitions = true;
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
 * Coup théorique strict : la ligne référence exige ce UCI à ce ply.
 */
export function isStrictBookPly(
  openingAtPly: Opening | null | undefined,
  uciMoves: string[],
  ply: number
): boolean {
  if (!openingAtPly) return false;
  if (ply < 0 || ply >= uciMoves.length) return false;
  if (ply >= openingAtPly.uciMoves.length) return false;
  return openingAtPly.uciMoves[ply] === uciMoves[ply];
}

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
    if (opening && matchedPlies === slice.length && isStrictBookPly(opening, uciMoves, i)) {
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

/** Lookup by id across core + loaded partitions. */
export function getOpeningById(id: string): Opening | undefined {
  return getAggregatedOpenings().find((o) => o.id === id);
}
