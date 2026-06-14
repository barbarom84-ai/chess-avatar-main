import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { fetchAccountSummariesByUserIds } from "@/lib/account-server";
import type { PvpGameRow } from "@/lib/pvp-chess";
import type { PvpChatMessage } from "@/lib/pvp-chat";
import { PVP_CHAT_MAX_BODY_LENGTH } from "@/lib/pvp-chat";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function assertParticipant(
  sb: NonNullable<ReturnType<typeof createServiceSupabase>>,
  gameId: string,
  userId: string
): Promise<{ ok: true; game: PvpGameRow } | { ok: false; response: NextResponse }> {
  const { data: game, error } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (error || !game) return { ok: false, response: jsonError("Game not found", 404) };

  const row = game as PvpGameRow;
  const isParticipant =
    row.white_user_id === userId || row.black_user_id === userId;
  if (!isParticipant) return { ok: false, response: jsonError("Forbidden", 403) };

  return { ok: true, game: row };
}

function enrichMessages(
  rows: PvpChatMessage[],
  summaries: Awaited<ReturnType<typeof fetchAccountSummariesByUserIds>>
): PvpChatMessage[] {
  return rows.map((m) => {
    const s = summaries.get(m.user_id);
    return {
      ...m,
      display_name: s?.displayName ?? null,
      avatar_url: s?.avatarUrl ?? null,
    };
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
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

  const { gameId } = await context.params;
  const check = await assertParticipant(sb, gameId, user.id);
  if (!check.ok) return check.response;

  const { data, error } = await sb
    .from("pvp_chat_messages")
    .select("id, game_id, user_id, body, created_at")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return jsonError(error.message ?? "Query failed", 500);

  const rows = (data ?? []) as PvpChatMessage[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const summaries = await fetchAccountSummariesByUserIds(sb, userIds);

  return NextResponse.json({ messages: enrichMessages(rows, summaries) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 60 });
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

  const { gameId } = await context.params;
  const check = await assertParticipant(sb, gameId, user.id);
  if (!check.ok) return check.response;

  if (!["waiting", "playing"].includes(check.game.status)) {
    return jsonError("Chat closed for this game", 400);
  }

  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const raw = typeof body?.body === "string" ? body.body.trim() : "";
  if (!raw || raw.length > PVP_CHAT_MAX_BODY_LENGTH) {
    return jsonError("Invalid message", 400);
  }

  const { data: recent } = await sb
    .from("pvp_chat_messages")
    .select("created_at")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.created_at) {
    const elapsed = Date.now() - new Date(recent.created_at as string).getTime();
    if (elapsed < 2000) return jsonError("Too fast", 429);
  }

  const { data: inserted, error: insErr } = await sb
    .from("pvp_chat_messages")
    .insert({
      game_id: gameId,
      user_id: user.id,
      body: raw,
    })
    .select("id, game_id, user_id, body, created_at")
    .single();

  if (insErr || !inserted) {
    return jsonError(insErr?.message ?? "Insert failed", 500);
  }

  const summaries = await fetchAccountSummariesByUserIds(sb, [user.id]);
  const message = enrichMessages([inserted as PvpChatMessage], summaries)[0];

  return NextResponse.json({ ok: true, message });
}
