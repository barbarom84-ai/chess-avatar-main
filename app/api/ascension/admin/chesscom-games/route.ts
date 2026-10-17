import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { isValidChessUsername } from "@/lib/chess-username";
import {
  clampMaxGames,
  clampMaxMonths,
  fetchChessComCampaignGames,
} from "@/lib/ascension/chesscom-games";

export const runtime = "nodejs";

const DEFAULT_USERNAME = "FondueMan";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!(await isSuperUserServer(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawUsername = (searchParams.get("username") ?? DEFAULT_USERNAME).trim();
  if (!isValidChessUsername(rawUsername)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const maxMonths = clampMaxMonths(searchParams.get("maxMonths"));
  const maxGames = clampMaxGames(searchParams.get("maxGames"));

  try {
    const games = await fetchChessComCampaignGames(rawUsername, {
      maxMonths,
      maxGames,
    });
    if (games === null) {
      return NextResponse.json(
        { error: "Player not found or Chess.com error" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      username: rawUsername,
      maxMonths,
      maxGames,
      count: games.length,
      games,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Chess.com fetch failed",
      },
      { status: 500 }
    );
  }
}
