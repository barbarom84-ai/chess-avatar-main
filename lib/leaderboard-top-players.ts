/**
 * Top joueurs Lichess / Chess.com (classements publics API).
 */

const TOP_COUNT = 10;

export type TopPlayerEntry = {
  username: string;
  rating?: number;
  title?: string;
};

/** Fallback si l’API classement est indisponible. */
export const FALLBACK_LICHESS_TOP: TopPlayerEntry[] = [
  { username: "Hikaru", title: "GM" },
  { username: "DrNykterstein", title: "GM" },
  { username: "alireza2003", title: "GM" },
  { username: "Arjun2710", title: "GM" },
  { username: "DingLiren", title: "GM" },
  { username: "FabianoCaruana", title: "GM" },
  { username: "AnishGiri", title: "GM" },
  { username: "levy", title: "IM" },
  { username: "FairChess_on_YouTube" },
  { username: "TuanTuanTuanZi" },
];

export const FALLBACK_CHESSCOM_TOP: TopPlayerEntry[] = [
  { username: "Hikaru", title: "GM" },
  { username: "MagnusCarlsen", title: "GM" },
  { username: "nihalsarin", title: "GM" },
  { username: "HansOnTwitch", title: "GM" },
  { username: "GothamChess" },
  { username: "DanielNaroditsky", title: "GM" },
  { username: "FabianoCaruana", title: "GM" },
  { username: "AnishGiri", title: "GM" },
  { username: "DingLiren", title: "GM" },
  { username: "ArjunErigaisi", title: "GM" },
];

export async function fetchLichessTopPlayers(
  perf: "blitz" | "rapid" = "blitz",
  count = TOP_COUNT
): Promise<TopPlayerEntry[]> {
  try {
    const res = await fetch(
      `https://lichess.org/api/player/top/${count}/${perf}`
    );
    if (!res.ok) return FALLBACK_LICHESS_TOP.slice(0, count);
    const data = (await res.json()) as {
      users?: {
        username: string;
        title?: string;
        perfs?: Record<string, { rating?: number }>;
      }[];
    };
    const users = data.users ?? [];
    return users.map((u) => ({
      username: u.username,
      title: u.title,
      rating: u.perfs?.[perf]?.rating,
    }));
  } catch {
    return FALLBACK_LICHESS_TOP.slice(0, count);
  }
}

export async function fetchChessComTopPlayers(
  count = TOP_COUNT
): Promise<TopPlayerEntry[]> {
  try {
    const res = await fetch("https://api.chess.com/pub/leaderboards");
    if (!res.ok) return FALLBACK_CHESSCOM_TOP.slice(0, count);
    const data = (await res.json()) as {
      live_blitz?: { username: string }[];
    };
    const rows = data.live_blitz ?? [];
    return rows.slice(0, count).map((r) => ({ username: r.username }));
  } catch {
    return FALLBACK_CHESSCOM_TOP.slice(0, count);
  }
}

export async function fetchAllFeaturedTopPlayers(): Promise<{
  lichess: TopPlayerEntry[];
  chesscom: TopPlayerEntry[];
}> {
  const [lichess, chesscom] = await Promise.all([
    fetchLichessTopPlayers("blitz", TOP_COUNT),
    fetchChessComTopPlayers(TOP_COUNT),
  ]);
  return { lichess, chesscom };
}
