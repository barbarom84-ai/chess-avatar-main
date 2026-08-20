import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  clearArenaFeaturedCache,
  loadArenaFeaturedOptions,
} from "@/lib/arena-featured-profiles";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 8 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const user =
    url && anonKey
      ? await getAuthedUserFromRequest(request, url, anonKey)
      : null;

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";

  if (refresh) {
    clearArenaFeaturedCache();
  }

  try {
    const { options, source, persist } = await loadArenaFeaturedOptions(
      "Top Lichess",
      "Top Chess.com",
      refresh,
      user?.id ?? null
    );

    const persistOk =
      persist != null &&
      (persist.inserted > 0 || persist.updated > 0) &&
      persist.ownerId != null;

    return NextResponse.json({
      success: true,
      count: options.length,
      source,
      options,
      persisted: persistOk,
      persistStats: persist,
      sessionUserId: user?.id ?? null,
      cachedUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("[arena/featured]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to build featured profiles",
        options: [],
      },
      { status: 500 }
    );
  }
}
