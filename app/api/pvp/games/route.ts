import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { isValidPvpTimePresetId, resolvePvpTimePreset } from "@/lib/pvp-time-controls";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Liste des parties en attente d’un adversaire (lobbies ouverts, dernières 24 h). */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 120 });
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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from("pvp_games")
    .select(
      "id, created_at, white_user_id, white_display_name, time_preset, clock_mode, clock_initial_sec, clock_increment_sec"
    )
    .eq("status", "waiting")
    .is("black_user_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return jsonError(error.message ?? "List failed", 500);

  const games = (data ?? []).map(
    (row: {
      id: string;
      created_at: string;
      white_user_id: string;
      white_display_name?: string | null;
      time_preset?: string | null;
      clock_mode?: string | null;
      clock_initial_sec?: number | null;
      clock_increment_sec?: number | null;
    }) => ({
      id: row.id,
      created_at: row.created_at,
      isHost: row.white_user_id === user.id,
      host_display_name: row.white_display_name?.trim() || null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
    })
  );

  const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeRows, error: activeErr } = await sb
    .from("pvp_games")
    .select(
      "id, created_at, updated_at, white_user_id, black_user_id, white_display_name, black_display_name, time_preset, clock_mode, clock_initial_sec, clock_increment_sec, status"
    )
    .eq("status", "playing")
    .not("black_user_id", "is", null)
    .or(`white_user_id.eq.${user.id},black_user_id.eq.${user.id}`)
    .gte("updated_at", activeSince)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (activeErr) return jsonError(activeErr.message ?? "Active list failed", 500);

  type ActiveRow = {
    id: string;
    created_at: string;
    updated_at: string;
    white_user_id: string;
    black_user_id: string | null;
    white_display_name?: string | null;
    black_display_name?: string | null;
    time_preset?: string | null;
    clock_mode?: string | null;
    clock_initial_sec?: number | null;
    clock_increment_sec?: number | null;
    status: string;
  };

  const activeGames = (activeRows ?? []).map((row: ActiveRow) => {
    const isWhite = row.white_user_id === user.id;
    const oppId = isWhite ? row.black_user_id : row.white_user_id;
    const oppLabel = isWhite ? row.black_display_name : row.white_display_name;
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: isWhite ? ("white" as const) : ("black" as const),
      opponent_user_id: oppId ?? "",
      opponent_display_name: oppLabel?.trim() || null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
    };
  });

  return NextResponse.json({ games, activeGames });
}

/** Create a new PvP lobby: creator plays White until an opponent joins as Black. */
export async function POST(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const body = (await request.json().catch(() => null)) as { timePreset?: string } | null;
  const rawPreset = typeof body?.timePreset === "string" ? body.timePreset : "unlimited";
  const presetId = isValidPvpTimePresetId(rawPreset) ? rawPreset : "unlimited";
  const preset = resolvePvpTimePreset(presetId);

  const { data, error } = await sb
    .from("pvp_games")
    .insert({
      created_by: user.id,
      white_user_id: user.id,
      status: "waiting",
      white_display_name: displayNameFromAuthUser(user),
      time_preset: preset.id,
      clock_mode: preset.mode,
      clock_initial_sec: preset.mode === "timed" ? preset.initialSec : 0,
      clock_increment_sec: preset.mode === "timed" ? preset.incrementSec : 0,
    })
    .select(
      "id,status,white_user_id,black_user_id,created_at,time_preset,clock_mode,clock_initial_sec,clock_increment_sec,white_display_name,black_display_name"
    )
    .single();

  if (error || !data) {
    return jsonError(error?.message ?? "Failed to create game", 500);
  }

  return NextResponse.json({ game: data });
}
