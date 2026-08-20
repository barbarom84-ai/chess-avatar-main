import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { isValidPvpTimePresetId, presetStorageInitialSec, resolvePvpTimePreset } from "@/lib/pvp-time-controls";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import { fetchAccountSummariesByUserIds } from "@/lib/account-server";
import { pvpActiveGameIsMyTurn } from "@/lib/pvp-active-games";
import { findExistingOpenPvpLobby } from "@/lib/pvp-new-game-dedup";

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
      "id, created_at, white_user_id, white_display_name, invited_user_id, time_preset, clock_mode, clock_initial_sec, clock_increment_sec"
    )
    .eq("status", "waiting")
    .is("black_user_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return jsonError(error.message ?? "List failed", 500);

  type WaitingRow = {
    id: string;
    created_at: string;
    white_user_id: string;
    white_display_name?: string | null;
    invited_user_id?: string | null;
    time_preset?: string | null;
    clock_mode?: string | null;
    clock_initial_sec?: number | null;
    clock_increment_sec?: number | null;
  };

  const waitingRows = (data ?? []) as WaitingRow[];
  const publicWaitingRows = waitingRows.filter((row) => !row.invited_user_id);
  const hostIdsForEnrich = [
    ...new Set(
      publicWaitingRows
        .filter((row) => row.white_user_id !== user.id)
        .map((row) => row.white_user_id)
    ),
  ];
  const hostSummaries = await fetchAccountSummariesByUserIds(sb, hostIdsForEnrich);

  const games = publicWaitingRows.map((row) => {
    const summary = hostSummaries.get(row.white_user_id);
    const snapshotName = row.white_display_name?.trim() || null;
    return {
      id: row.id,
      created_at: row.created_at,
      isHost: row.white_user_id === user.id,
      host_user_id: row.white_user_id,
      host_display_name: summary?.displayName ?? snapshotName,
      host_avatar_url: summary?.avatarUrl ?? null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
    };
  });

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

  const activeList = (activeRows ?? []) as ActiveRow[];
  const activeIds = activeList.map((row) => row.id);

  const moveCountByGame = new Map<string, number>();
  if (activeIds.length > 0) {
    const { data: moveRows, error: movesErr } = await sb
      .from("pvp_moves")
      .select("game_id, ply")
      .in("game_id", activeIds);
    if (movesErr) return jsonError(movesErr.message ?? "Move count failed", 500);
    for (const moveRow of moveRows ?? []) {
      const gid = moveRow.game_id as string;
      const ply = moveRow.ply as number;
      moveCountByGame.set(gid, Math.max(moveCountByGame.get(gid) ?? 0, ply));
    }
  }

  const oppIdsForEnrich = [
    ...new Set(
      activeList
        .map((row) => {
          const isWhite = row.white_user_id === user.id;
          return isWhite ? row.black_user_id : row.white_user_id;
        })
        .filter((id): id is string => !!id && id.length >= 8)
    ),
  ];
  const oppSummaries = await fetchAccountSummariesByUserIds(sb, oppIdsForEnrich);

  const activeGames = activeList.map((row: ActiveRow) => {
    const isWhite = row.white_user_id === user.id;
    const oppId = isWhite ? row.black_user_id : row.white_user_id;
    const oppLabel = isWhite ? row.black_display_name : row.white_display_name;
    const snapshotName = oppLabel?.trim() || null;
    const summary = oppId ? oppSummaries.get(oppId) : undefined;
    const role = isWhite ? ("white" as const) : ("black" as const);
    const moveCount = moveCountByGame.get(row.id) ?? 0;
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role,
      opponent_user_id: oppId ?? "",
      opponent_display_name: summary?.displayName ?? snapshotName,
      opponent_avatar_url: summary?.avatarUrl ?? null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
      move_count: moveCount,
      is_my_turn: pvpActiveGameIsMyTurn(role, moveCount),
    };
  });

  type RematchRow = {
    id: string;
    created_at: string;
    white_user_id: string;
    black_user_id: string;
    white_display_name?: string | null;
    black_display_name?: string | null;
    time_preset?: string | null;
    clock_mode?: string | null;
    clock_initial_sec?: number | null;
    clock_increment_sec?: number | null;
    created_by?: string | null;
  };

  const { data: rematchRows, error: rematchErr } = await sb
    .from("pvp_games")
    .select(
      "id, created_at, white_user_id, black_user_id, white_display_name, black_display_name, time_preset, clock_mode, clock_initial_sec, clock_increment_sec, created_by"
    )
    .eq("status", "waiting")
    .not("black_user_id", "is", null)
    .or(`white_user_id.eq.${user.id},black_user_id.eq.${user.id}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (rematchErr) return jsonError(rematchErr.message ?? "Rematch list failed", 500);

  const rematchList = (rematchRows ?? []) as RematchRow[];
  const rematchOppIds = [
    ...new Set(
      rematchList
        .map((row) => {
          const incoming = row.white_user_id === user.id;
          return incoming ? row.black_user_id : row.white_user_id;
        })
        .filter((id): id is string => !!id && id.length >= 8)
    ),
  ];
  const rematchSummaries = await fetchAccountSummariesByUserIds(sb, rematchOppIds);

  const pendingRematches = rematchList.map((row) => {
    const incoming = row.white_user_id === user.id;
    const oppId = incoming ? row.black_user_id : row.white_user_id;
    const snapshotName = (
      incoming ? row.black_display_name : row.white_display_name
    )?.trim() || null;
    const summary = rematchSummaries.get(oppId);
    return {
      id: row.id,
      created_at: row.created_at,
      direction: incoming ? ("incoming" as const) : ("outgoing" as const),
      opponent_user_id: oppId,
      opponent_display_name: summary?.displayName ?? snapshotName,
      opponent_avatar_url: summary?.avatarUrl ?? null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
      can_cancel: row.created_by === user.id,
    };
  });

  type InviteRow = {
    id: string;
    created_at: string;
    white_user_id: string;
    white_display_name?: string | null;
    time_preset?: string | null;
    clock_mode?: string | null;
    clock_initial_sec?: number | null;
    clock_increment_sec?: number | null;
  };

  const { data: inviteRows, error: inviteErr } = await sb
    .from("pvp_games")
    .select(
      "id, created_at, white_user_id, white_display_name, time_preset, clock_mode, clock_initial_sec, clock_increment_sec"
    )
    .eq("status", "waiting")
    .is("black_user_id", null)
    .eq("invited_user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (inviteErr) return jsonError(inviteErr.message ?? "Invite list failed", 500);

  const inviteList = (inviteRows ?? []) as InviteRow[];
  const inviterIds = [
    ...new Set(inviteList.map((row) => row.white_user_id).filter((id) => id.length >= 8)),
  ];
  const inviterSummaries = await fetchAccountSummariesByUserIds(sb, inviterIds);

  const pendingInvites = inviteList.map((row) => {
    const snapshotName = row.white_display_name?.trim() || null;
    const summary = inviterSummaries.get(row.white_user_id);
    return {
      id: row.id,
      created_at: row.created_at,
      host_user_id: row.white_user_id,
      host_display_name: summary?.displayName ?? snapshotName,
      host_avatar_url: summary?.avatarUrl ?? null,
      time_preset: row.time_preset ?? "unlimited",
      clock_mode: row.clock_mode ?? "unlimited",
      clock_initial_sec: row.clock_initial_sec ?? 0,
      clock_increment_sec: row.clock_increment_sec ?? 0,
    };
  });

  return NextResponse.json({ games, activeGames, pendingRematches, pendingInvites });
}

/** Create a new PvP lobby: creator plays White until an opponent joins as Black. */
export async function POST(request: NextRequest) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const body = (await request.json().catch(() => null)) as {
    timePreset?: string;
    invitedUserId?: string;
  } | null;
  const rawPreset = typeof body?.timePreset === "string" ? body.timePreset : "correspondence_3d";
  const presetId = isValidPvpTimePresetId(rawPreset) ? rawPreset : "correspondence_3d";
  const preset = resolvePvpTimePreset(presetId);
  const invitedUserId =
    typeof body?.invitedUserId === "string" && body.invitedUserId.length >= 8
      ? body.invitedUserId
      : null;
  if (invitedUserId && invitedUserId === user.id) {
    return jsonError("Invalid invite target", 400);
  }

  if (!invitedUserId) {
    const existingLobby = await findExistingOpenPvpLobby(sb, user.id, presetId);
    if (existingLobby) {
      return NextResponse.json({ game: existingLobby, reused: true });
    }
  }

  const { data, error } = await sb
    .from("pvp_games")
    .insert({
      created_by: user.id,
      white_user_id: user.id,
      status: "waiting",
      white_display_name: displayNameFromAuthUser(user),
      invited_user_id: invitedUserId,
      time_preset: preset.id,
      clock_mode: preset.mode,
      clock_initial_sec: preset.mode === "unlimited" ? 0 : presetStorageInitialSec(preset),
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
