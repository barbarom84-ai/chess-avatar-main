import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { loadFeaturedProfilesFromDatabase } from "@/lib/arena-featured-persist";

/** Liste des champions déjà en base (sans ré-import Lichess/Chess.com). */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    const options = await loadFeaturedProfilesFromDatabase(
      "Top Lichess",
      "Top Chess.com"
    );

    return NextResponse.json({
      success: true,
      count: options.length,
      options,
      canPersist: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSeedOwner: Boolean(
        process.env.FEATURED_PROFILE_SEED_USER_ID?.trim()
      ),
    });
  } catch (err) {
    console.error("[arena/champions]", err);
    return NextResponse.json(
      { success: false, count: 0, options: [] },
      { status: 500 }
    );
  }
}
