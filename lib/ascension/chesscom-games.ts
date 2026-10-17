import { isValidChessUsername } from "@/lib/chess-username";
import { mapWithConcurrency } from "@/lib/fetch-concurrency";

const ARCHIVE_FETCH_CONCURRENCY = 4;
const DEFAULT_MAX_MONTHS = 24;
const DEFAULT_MAX_GAMES = 150;
const HARD_MAX_MONTHS = 120;
const HARD_MAX_GAMES = 500;

export interface ChessComCampaignGame {
  id: string;
  pgn: string;
  white: string;
  black: string;
  endTime: number;
  url?: string;
}

interface ChessComArchiveGame {
  uuid?: string;
  url?: string;
  end_time?: number;
  pgn?: string;
  white?: { username?: string; result?: string };
  black?: { username?: string; result?: string };
}

export function clampMaxMonths(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_MAX_MONTHS;
  return Math.max(1, Math.min(HARD_MAX_MONTHS, n));
}

export function clampMaxGames(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_MAX_GAMES;
  return Math.max(1, Math.min(HARD_MAX_GAMES, n));
}

/**
 * Fetch public Chess.com monthly archives for a player (no persona 15-game cap).
 * Returns newest games first. Null when username is invalid or the player has no games.
 */
export async function fetchChessComCampaignGames(
  username: string,
  opts?: { maxMonths?: number; maxGames?: number }
): Promise<ChessComCampaignGame[] | null> {
  if (!isValidChessUsername(username)) return null;

  const maxMonths = clampMaxMonths(opts?.maxMonths);
  const maxGames = clampMaxGames(opts?.maxGames);
  const encoded = encodeURIComponent(username);

  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encoded}/games/archives`,
    { cache: "no-store" }
  );
  if (!archivesRes.ok) return null;

  const archivesData: unknown = await archivesRes.json().catch(() => null);
  const archiveUrls: string[] = Array.isArray(
    (archivesData as { archives?: unknown })?.archives
  )
    ? (archivesData as { archives: string[] }).archives
    : [];

  if (archiveUrls.length === 0) return [];

  const recentArchiveUrls = archiveUrls.slice(-maxMonths).reverse();
  const monthlyResults = await mapWithConcurrency(
    recentArchiveUrls,
    ARCHIVE_FETCH_CONCURRENCY,
    async (archiveUrl) => {
      try {
        const monthlyRes = await fetch(archiveUrl, { cache: "no-store" });
        if (!monthlyRes.ok) return [] as ChessComArchiveGame[];
        const monthlyData: unknown = await monthlyRes.json().catch(() => null);
        if (
          monthlyData &&
          typeof monthlyData === "object" &&
          Array.isArray((monthlyData as { games?: unknown }).games)
        ) {
          return (monthlyData as { games: ChessComArchiveGame[] }).games;
        }
        return [];
      } catch {
        return [];
      }
    }
  );

  const collected: ChessComArchiveGame[] = [];
  for (const games of monthlyResults) {
    if (games.length > 0) collected.push(...games);
    if (collected.length >= maxGames) break;
  }

  collected.sort((a, b) => (b?.end_time ?? 0) - (a?.end_time ?? 0));

  const out: ChessComCampaignGame[] = [];
  for (let i = 0; i < collected.length && out.length < maxGames; i++) {
    const g = collected[i]!;
    const pgn = typeof g.pgn === "string" ? g.pgn.trim() : "";
    if (!pgn) continue;
    const white =
      typeof g.white?.username === "string" && g.white.username.trim()
        ? g.white.username.trim()
        : "White";
    const black =
      typeof g.black?.username === "string" && g.black.username.trim()
        ? g.black.username.trim()
        : "Black";
    const endTime =
      typeof g.end_time === "number" && Number.isFinite(g.end_time)
        ? g.end_time
        : 0;
    const id =
      typeof g.uuid === "string" && g.uuid.trim()
        ? g.uuid.trim()
        : `${endTime || Date.now()}-${i}`;
    const url =
      typeof g.url === "string" && g.url.trim() ? g.url.trim() : undefined;
    out.push({ id, pgn, white, black, endTime, url });
  }

  return out;
}
