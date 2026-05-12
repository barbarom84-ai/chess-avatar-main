import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";

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
    const { error } = await sb
      .from("pvp_games")
      .update({ draw_offered_by: user.id })
      .eq("id", gameId)
      .eq("status", "playing");
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, drawOfferedBy: user.id });
  }

  if (action === "cancel") {
    if (row.draw_offered_by !== user.id) return jsonError("No offer to cancel", 400);
    const { error } = await sb.from("pvp_games").update({ draw_offered_by: null }).eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, drawOfferedBy: null });
  }

  if (action === "decline") {
    if (!row.draw_offered_by || row.draw_offered_by === user.id) {
      return jsonError("No opponent offer to decline", 400);
    }
    const { error } = await sb.from("pvp_games").update({ draw_offered_by: null }).eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, drawOfferedBy: null });
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
  return NextResponse.json({ ok: true, result: "1/2-1/2", resultReason: "draw_agreed" });
}
