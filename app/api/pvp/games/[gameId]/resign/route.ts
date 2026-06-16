import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;
  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);
  const row = game as PvpGameRow;

  if (row.status !== "playing") return jsonError("Game is not active", 400);
  if (!row.black_user_id) return jsonError("Game not started", 400);

  const isWhite = row.white_user_id === user.id;
  const isBlack = row.black_user_id === user.id;
  if (!isWhite && !isBlack) return jsonError("Forbidden", 403);

  const result = isWhite ? "0-1" : "1-0";
  const { error: upErr } = await sb
    .from("pvp_games")
    .update({
      status: "finished",
      result,
      result_reason: "resignation",
      draw_offered_by: null,
    })
    .eq("id", gameId)
    .eq("status", "playing");

  if (upErr) return jsonError(upErr.message ?? "Update failed", 500);

  return NextResponse.json({ ok: true, result, resultReason: "resignation" });
}
