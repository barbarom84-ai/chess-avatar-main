/**
 * Extrait le meilleur ELO « live » Chess.com / Lichess pour calibrer l’avatar.
 */
export function bestChessComRating(stats: unknown): number | undefined {
  if (!stats || typeof stats !== "object") return undefined;
  const s = stats as Record<string, { last?: { rating?: number } } | undefined>;
  const keys = ["chess_rapid", "chess_blitz", "chess_bullet"] as const;
  let best = 0;
  for (const k of keys) {
    const r = s[k]?.last?.rating;
    if (typeof r === "number" && r > best) best = r;
  }
  return best > 0 ? best : undefined;
}

export function bestLichessRating(profile: unknown): number | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const perfs = (profile as { perfs?: Record<string, { rating?: number }> }).perfs;
  if (!perfs) return undefined;
  let best = 0;
  for (const p of Object.values(perfs)) {
    const r = p?.rating;
    if (typeof r === "number" && r > best) best = r;
  }
  return best > 0 ? best : undefined;
}
