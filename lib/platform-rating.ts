/**
 * Single displayed rating for persona Elo — same idea as Android
 * `PlatformGamesResponse.platformRating`.
 *
 * Prefer the time control with the most games among standard pools.
 */

type RatedPool = { rating: number; games: number };

function bestPool(pools: RatedPool[]): number | undefined {
  let best: RatedPool | undefined;
  for (const p of pools) {
    if (!(p.rating > 0)) continue;
    if (!best || p.games > best.games || (p.games === best.games && p.rating > best.rating)) {
      best = p;
    }
  }
  return best?.rating;
}

function asPool(raw: unknown): RatedPool | null {
  if (!raw || typeof raw !== "object") return null;
  const rating = (raw as { rating?: unknown }).rating;
  const games = (raw as { games?: unknown }).games;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) return null;
  return {
    rating,
    games: typeof games === "number" && Number.isFinite(games) ? games : 0,
  };
}

/** Lichess `GET /api/user/:id` → `perfs`. */
export function pickLichessPlatformRating(perfs: unknown): number | undefined {
  if (!perfs || typeof perfs !== "object") return undefined;
  const obj = perfs as Record<string, unknown>;
  const pools: RatedPool[] = [];
  for (const key of ["blitz", "rapid", "classical", "bullet"]) {
    const p = asPool(obj[key]);
    if (p) pools.push(p);
  }
  return bestPool(pools);
}

/** Chess.com `GET /pub/player/:id/stats` live ratings. */
export function pickChessComPlatformRating(stats: unknown): number | undefined {
  if (!stats || typeof stats !== "object") return undefined;
  const obj = stats as Record<string, unknown>;
  const pools: RatedPool[] = [];
  for (const key of ["chess_blitz", "chess_rapid", "chess_bullet", "chess_daily"]) {
    const mode = obj[key];
    if (!mode || typeof mode !== "object") continue;
    const last = (mode as { last?: unknown }).last;
    if (!last || typeof last !== "object") continue;
    const rating = (last as { rating?: unknown }).rating;
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) continue;
    const record = (mode as { record?: { win?: unknown; loss?: unknown; draw?: unknown } }).record;
    const games =
      (typeof record?.win === "number" ? record.win : 0) +
      (typeof record?.loss === "number" ? record.loss : 0) +
      (typeof record?.draw === "number" ? record.draw : 0);
    pools.push({ rating, games });
  }
  return bestPool(pools);
}

/** Prod-era aliases used by restored analyze/API callers. */
export function bestChessComRating(stats: unknown): number | undefined {
  return pickChessComPlatformRating(stats);
}

/** Lichess `GET /api/user/:id` payload (uses `perfs`). */
export function bestLichessRating(profile: unknown): number | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  return pickLichessPlatformRating((profile as { perfs?: unknown }).perfs);
}
