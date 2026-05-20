import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { fetchAccountSummariesByUserIds } from "@/lib/account-server";
import { aggregateHeadToHead } from "@/lib/pvp-head-to-head";
import type { PvpGameRow } from "@/lib/pvp-chess";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const opponentId = request.nextUrl.searchParams.get("opponentId")?.trim() ?? "";
  if (!opponentId || opponentId.length < 8) return jsonError("Invalid opponent id", 400);
  if (opponentId === user.id) return jsonError("Invalid opponent", 400);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { data, error } = await sb
    .from("pvp_games")
    .select("id, result, white_user_id, black_user_id, status, time_preset")
    .eq("status", "finished")
    .not("black_user_id", "is", null)
    .or(
      `and(white_user_id.eq.${user.id},black_user_id.eq.${opponentId}),and(white_user_id.eq.${opponentId},black_user_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return jsonError(error.message ?? "Query failed", 500);

  const games = (data ?? []) as PvpGameRow[];
  const record = aggregateHeadToHead(games, user.id);
  const summaries = await fetchAccountSummariesByUserIds(sb, [opponentId]);
  const opponent = summaries.get(opponentId);

  const lastGame = games[0];

  return NextResponse.json({
    record,
    opponent: {
      userId: opponentId,
      displayName: opponent?.displayName ?? "Player",
      avatarUrl: opponent?.avatarUrl ?? null,
    },
    lastTimePreset: lastGame?.time_preset ?? null,
  });
}
