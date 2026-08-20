import { analyzePersona, type PersonaGameInput } from "@/lib/analysis";
import { isValidChessUsername } from "@/lib/chess-username";
import { mapWithConcurrency } from "@/lib/fetch-concurrency";
import { bestChessComRating, bestLichessRating } from "@/lib/platform-rating";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import {
  getCachedProfileResponse,
  profileCacheKey,
  setCachedProfileResponse,
} from "@/lib/profile-api-cache";

const ARCHIVE_FETCH_CONCURRENCY = 4;

export type ImportedPlayerProfile = {
  username: string;
  platform: "lichess" | "chesscom";
  stats: PersonaStats;
  config: EngineConfig;
};

interface ChessComArchiveGame {
  uuid?: string;
  end_time?: number;
  pgn?: string;
  white?: { username?: string; result?: string };
  black?: { username?: string; result?: string };
}

function normalizeLichessGames(
  raw: unknown[],
  username: string
): PersonaGameInput[] {
  const out: PersonaGameInput[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const game = g as Record<string, unknown>;
    const pgn =
      typeof game.pgn === "string"
        ? game.pgn
        : typeof (game as { pgn?: string }).pgn === "string"
          ? (game as { pgn: string }).pgn
          : "";
    if (!pgn.trim()) continue;

    const players = game.players as
      | {
          white?: { user?: { name?: string; id?: string } };
          black?: { user?: { name?: string; id?: string } };
        }
      | undefined;

    let winner: "white" | "black" | null = null;
    const w = game.winner;
    if (w === "white" || w === "black") winner = w;

    out.push({
      pgn,
      winner,
      players: players
        ? {
            white: {
              user: { name: players.white?.user?.name ?? players.white?.user?.id },
            },
            black: {
              user: { name: players.black?.user?.name ?? players.black?.user?.id },
            },
          }
        : undefined,
      opening:
        game.opening && typeof game.opening === "object"
          ? { name: (game.opening as { name?: string }).name }
          : undefined,
    });
  }
  return out;
}

export async function fetchChessComPlayerData(username: string): Promise<{
  games: PersonaGameInput[];
  avatarUrl?: string;
  platformRating?: number;
} | null> {
  if (!isValidChessUsername(username)) return null;

  const cacheKey = profileCacheKey("chesscom", username);
  const cached = getCachedProfileResponse(cacheKey) as {
    games?: PersonaGameInput[];
    avatarUrl?: string;
    platformRating?: number;
  } | null;
  if (cached?.games?.length) {
    return {
      games: cached.games,
      avatarUrl: cached.avatarUrl,
      platformRating: cached.platformRating,
    };
  }

  const encoded = encodeURIComponent(username);
  const profileRes = await fetch(`https://api.chess.com/pub/player/${encoded}`);
  if (!profileRes.ok) return null;

  const profile: unknown = await profileRes.json().catch(() => null);
  if (!profile || typeof profile !== "object") return null;

  const avatar =
    "avatar" in profile && typeof (profile as { avatar?: string }).avatar === "string"
      ? (profile as { avatar: string }).avatar
      : undefined;

  let platformRating: number | undefined;
  try {
    const statsRes = await fetch(
      `https://api.chess.com/pub/player/${encoded}/stats`
    );
    if (statsRes.ok) {
      platformRating = bestChessComRating(await statsRes.json().catch(() => null));
    }
  } catch {
    /* ignore */
  }

  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encoded}/games/archives`
  );
  if (!archivesRes.ok) return null;

  const archivesData: unknown = await archivesRes.json().catch(() => null);
  const archiveUrls: string[] = Array.isArray(
    (archivesData as { archives?: unknown })?.archives
  )
    ? (archivesData as { archives: string[] }).archives
    : [];

  if (archiveUrls.length === 0) return null;

  const recentArchiveUrls = archiveUrls.slice(-12).reverse();
  const monthlyResults = await mapWithConcurrency(
    recentArchiveUrls,
    ARCHIVE_FETCH_CONCURRENCY,
    async (archiveUrl) => {
      try {
        const monthlyRes = await fetch(archiveUrl);
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

  const collectedGames: ChessComArchiveGame[] = [];
  for (const games of monthlyResults) {
    if (games.length > 0) collectedGames.push(...games);
    if (collectedGames.length >= 30) break;
  }

  if (collectedGames.length === 0) return null;

  collectedGames.sort((a, b) => (b?.end_time ?? 0) - (a?.end_time ?? 0));

  const normalizedGames: PersonaGameInput[] = collectedGames
    .slice(0, 15)
    .map((g, idx) => {
      const whiteUsername = g?.white?.username || "White";
      const blackUsername = g?.black?.username || "Black";
      let winner: "white" | "black" | null = null;
      if (g?.white?.result === "win") winner = "white";
      if (g?.black?.result === "win") winner = "black";
      return {
        id: g?.uuid || `${g?.end_time || Date.now()}-${idx}`,
        pgn: g?.pgn || "",
        winner,
        players: {
          white: { user: { name: whiteUsername } },
          black: { user: { name: blackUsername } },
        },
      };
    });

  const payload = {
    games: normalizedGames,
    avatarUrl:
      avatar || "https://www.chess.com/bundles/web/images/user-image.svg",
    platformRating,
  };
  setCachedProfileResponse(cacheKey, payload);
  return payload;
}

export async function fetchLichessPlayerData(username: string): Promise<{
  games: PersonaGameInput[];
  avatarUrl?: string;
  platformRating?: number;
} | null> {
  if (!isValidChessUsername(username)) return null;

  const cacheKey = profileCacheKey("lichess", username);
  const cached = getCachedProfileResponse(cacheKey) as {
    games?: unknown[];
    avatarUrl?: string;
    platformRating?: number;
  } | null;
  if (cached?.games?.length) {
    return {
      games: normalizeLichessGames(cached.games, username),
      avatarUrl: cached.avatarUrl,
      platformRating: cached.platformRating,
    };
  }

  const profileResponse = await fetch(
    `https://lichess.org/api/user/${encodeURIComponent(username)}`
  );
  let avatarUrl = `https://lichess.org/assets/logo/lichess-pad3.svg`;
  let platformRating: number | undefined;

  if (profileResponse.ok) {
    const profileData: unknown = await profileResponse.json().catch(() => null);
    if (profileData && typeof profileData === "object") {
      const profile = profileData as { profile?: { avatar?: string } };
      avatarUrl =
        profile.profile?.avatar ||
        `https://lichess1.org/assets/_Qr0fOa/logo/lichess-favicon-512.png`;
      platformRating = bestLichessRating(profileData);
    }
  }

  const response = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=10&opening=true&pgnInJson=true`,
    { headers: { Accept: "application/x-ndjson" } }
  );

  if (!response.ok) return null;

  const textData = await response.text();
  const rawGames = textData
    .trim()
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return null;
      }
    })
    .filter((g) => g !== null);

  const games = normalizeLichessGames(rawGames, username);
  if (games.length === 0) return null;

  const payload = { games: rawGames, avatarUrl, platformRating };
  setCachedProfileResponse(cacheKey, payload);
  return { games, avatarUrl, platformRating };
}

export async function importPlayerProfile(
  username: string,
  platform: "lichess" | "chesscom"
): Promise<ImportedPlayerProfile | null> {
  const data =
    platform === "chesscom"
      ? await fetchChessComPlayerData(username)
      : await fetchLichessPlayerData(username);

  if (!data?.games?.length) return null;

  const { stats, config } = analyzePersona(
    data.games,
    username,
    data.avatarUrl,
    platform,
    data.platformRating
  );

  const featuredConfig: EngineConfig = {
    ...config,
    name: username,
    platform,
    avatarUrl: data.avatarUrl ?? config.avatarUrl,
    featuredSeed: true,
  };

  return {
    username,
    platform,
    stats: { ...stats, username, platform, avatarUrl: data.avatarUrl },
    config: featuredConfig,
  };
}
