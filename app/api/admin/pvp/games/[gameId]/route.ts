import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import type { PvpGameRow } from "@/lib/pvp-chess";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Admin : supprimer un salon en attente ou une partie terminée. */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  if (!(await isSuperUserServer(sb, user.id))) {
    return jsonError("Forbidden", 403);
  }

  const { gameId } = await context.params;

  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("id, status")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);

  if (game.status === "playing") {
    return jsonError("Use abort for games in progress", 400);
  }

  const { error: delErr } = await sb.from("pvp_games").delete().eq("id", gameId);
  if (delErr) return jsonError(delErr.message ?? "Delete failed", 500);

  return NextResponse.json({ ok: true, action: "deleted" });
}

/** Admin : abandonner une partie en cours. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  if (!(await isSuperUserServer(sb, user.id))) {
    return jsonError("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "abort") {
    return jsonError("Invalid action", 400);
  }

  const { gameId } = await context.params;

  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("id, status")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);

  if (game.status !== "playing") {
    return jsonError("Only playing games can be aborted", 400);
  }

  const { data: updated, error: upErr } = await sb
    .from("pvp_games")
    .update({
      status: "aborted",
      result: "*",
      result_reason: "admin_cancelled",
    })
    .eq("id", gameId)
    .eq("status", "playing")
    .select("*")
    .maybeSingle();

  if (upErr) return jsonError(upErr.message ?? "Abort failed", 500);
  if (!updated) return jsonError("Game not found or not playing", 404);

  return NextResponse.json({ ok: true, action: "aborted", game: updated as PvpGameRow });
}
