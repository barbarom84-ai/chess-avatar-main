import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";
import { MAX_PVP_DRAW_OFFERS_PER_PLAYER } from "@/lib/pvp-draw-limits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type DrawAction = "offer" | "accept" | "decline" | "cancel";

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
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action as DrawAction | undefined;
  if (action !== "offer" && action !== "accept" && action !== "decline" && action !== "cancel") {
    return jsonError("Invalid action", 400);
  }

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

  if (action === "offer") {
    const countField = isWhite ? "white_draw_offers_count" : "black_draw_offers_count";
    const current = Number(row[countField] ?? 0);
    const isRenewal = row.draw_offered_by === user.id;
    if (!isRenewal && current >= MAX_PVP_DRAW_OFFERS_PER_PLAYER) {
      return jsonError("Draw offer limit reached", 400);
    }
    const patch: Record<string, unknown> = {
      draw_offered_by: user.id,
      takeback_offered_by: null,
    };
    if (!isRenewal) {
      patch[countField] = current + 1;
    }
    const { error } = await sb
      .from("pvp_games")
      .update(patch)
      .eq("id", gameId)
      .eq("status", "playing");
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({
      ok: true,
      drawOfferedBy: user.id,
      serverNow: Date.now(),
      drawOffersCount: isRenewal ? current : current + 1,
    });
  }

  if (action === "cancel") {
    if (row.draw_offered_by !== user.id) return jsonError("No offer to cancel", 400);
    const { error } = await sb.from("pvp_games").update({ draw_offered_by: null }).eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, drawOfferedBy: null, serverNow: Date.now() });
  }

  if (action === "decline") {
    if (!row.draw_offered_by || row.draw_offered_by === user.id) {
      return jsonError("No opponent offer to decline", 400);
    }
    const { error } = await sb.from("pvp_games").update({ draw_offered_by: null }).eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, drawOfferedBy: null, serverNow: Date.now() });
  }

  // accept
  if (!row.draw_offered_by || row.draw_offered_by === user.id) {
    return jsonError("No draw offer to accept", 400);
  }
  const { error } = await sb
    .from("pvp_games")
    .update({
      status: "finished",
      result: "1/2-1/2",
      result_reason: "draw_agreed",
      draw_offered_by: null,
    })
    .eq("id", gameId)
    .eq("status", "playing");

  if (error) return jsonError(error.message ?? "Update failed", 500);
  return NextResponse.json({ ok: true, result: "1/2-1/2", resultReason: "draw_agreed", serverNow: Date.now() });
}
