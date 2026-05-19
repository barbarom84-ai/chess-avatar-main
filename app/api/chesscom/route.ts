import { NextRequest, NextResponse } from "next/server";
import { isValidChessUsername } from "@/lib/chess-username";
import { rateLimit } from "@/lib/rate-limit";
import { mapWithConcurrency } from "@/lib/fetch-concurrency";
import {
  getCachedProfileResponse,
  profileCacheKey,
  setCachedProfileResponse,
} from "@/lib/profile-api-cache";

interface ChessComArchiveGame {
  uuid?: string;
  end_time?: number;
  pgn?: string;
  white?: { username?: string; result?: string };
  black?: { username?: string; result?: string };
}

const ARCHIVE_FETCH_CONCURRENCY = 4;

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  if (!isValidChessUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const cacheKey = profileCacheKey("chesscom", username);
  const cached = getCachedProfileResponse(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const encoded = encodeURIComponent(username);

  try {
    const profileRes = await fetch(`https://api.chess.com/pub/player/${encoded}`);
    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "Player not found", errorKey: "chesscomPlayerNotFound" },
        { status: 404 }
      );
    }

    const profile: unknown = await profileRes.json().catch(() => null);
    if (!profile || typeof profile !== "object") {
      return NextResponse.json(
        { error: "Chess.com API error", errorKey: "genericError" },
        { status: 500 }
      );
    }

    const avatar =
      "avatar" in profile && typeof (profile as { avatar?: string }).avatar === "string"
        ? (profile as { avatar: string }).avatar
        : undefined;

    const archivesRes = await fetch(`https://api.chess.com/pub/player/${encoded}/games/archives`);
    if (!archivesRes.ok) {
      return NextResponse.json({ error: "Chess.com API error", errorKey: "genericError" }, { status: 500 });
    }

    const archivesData: unknown = await archivesRes.json().catch(() => null);
    const archiveUrls: string[] = Array.isArray((archivesData as { archives?: unknown })?.archives)
      ? ((archivesData as { archives: string[] }).archives)
      : [];

    if (archiveUrls.length === 0) {
      return NextResponse.json({ error: "No games found for this player", errorKey: "noGamesFound" }, { status: 404 });
    }

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
            monthlyData !== null &&
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

    if (collectedGames.length === 0) {
      return NextResponse.json({ error: "No games found for this player", errorKey: "noGamesFound" }, { status: 404 });
    }

    collectedGames.sort((a, b) => (b?.end_time ?? 0) - (a?.end_time ?? 0));

    const normalizedGames = collectedGames.slice(0, 15).map((g, idx: number) => {
        const whiteUsername = g?.white?.username || "White";
        const blackUsername = g?.black?.username || "Black";

        let winner: "white" | "black" | null = null;
        if (g?.white?.result === "win") winner = "white";
        if (g?.black?.result === "win") winner = "black";

        return {
            id: g?.uuid || `${g?.end_time || Date.now()}-${idx}`,
            pgn: g?.pgn || "",
            winner: winner,
            createdAt: typeof g?.end_time === "number" ? g.end_time * 1000 : Date.now(),
            players: {
                white: { user: { name: whiteUsername, title: null } },
                black: { user: { name: blackUsername, title: null } }
            },
            userAvatar: avatar
        };
    });

    const payload = {
        games: normalizedGames,
        avatarUrl: avatar || "https://www.chess.com/bundles/web/images/user-image.svg"
    };
    setCachedProfileResponse(cacheKey, payload);
    return NextResponse.json(payload);

  } catch {
    return NextResponse.json({ error: "Chess.com API error", errorKey: "genericError" }, { status: 500 });
  }
}
