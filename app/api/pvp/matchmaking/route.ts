import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";
import {
  isMatchmakingEligiblePreset,
  leaveMatchmakingQueue,
  tryMatchmakingPair,
  upsertMatchmakingEntry,
  type PvpMatchmakingRow,
} from "@/lib/pvp-matchmaking";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** État de la file pour l'utilisateur connecté. */
export async function GET(request: NextRequest) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 120 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { data: row, error } = await sb
    .from("pvp_matchmaking_queue")
    .select("id,user_id,time_preset,display_name,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return jsonError(error.message ?? "Lookup failed", 500);
  if (!row) {
    return NextResponse.json({ inQueue: false });
  }

  const entry = row as PvpMatchmakingRow;
  const match = await tryMatchmakingPair(sb, user, entry);
  if (match.status === "matched") {
    return NextResponse.json({
      inQueue: false,
      matched: true,
      gameId: match.gameId,
      role: match.role,
      game: match.game,
      serverNow: Date.now(),
    });
  }

  return NextResponse.json({
    inQueue: true,
    timePreset: entry.time_preset,
    queueSize: match.queueSize,
  });
}

/** Rejoindre la file pour une cadence live (timed). */
export async function POST(request: NextRequest) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const body = (await request.json().catch(() => null)) as { timePreset?: string } | null;
  const rawPreset = typeof body?.timePreset === "string" ? body.timePreset : "";
  if (!isMatchmakingEligiblePreset(rawPreset)) {
    return jsonError("Invalid or unsupported time control for matchmaking", 400);
  }

  const entry = await upsertMatchmakingEntry(sb, user, rawPreset);
  const match = await tryMatchmakingPair(sb, user, entry);

  if (match.status === "matched") {
    return NextResponse.json({
      matched: true,
      gameId: match.gameId,
      role: match.role,
      game: match.game,
      serverNow: Date.now(),
    });
  }

  return NextResponse.json({
    matched: false,
    inQueue: true,
    timePreset: rawPreset,
    queueSize: match.queueSize,
  });
}

/** Quitter la file d'attente. */
export async function DELETE(request: NextRequest) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  await leaveMatchmakingQueue(sb, user.id);
  return NextResponse.json({ ok: true });
}
