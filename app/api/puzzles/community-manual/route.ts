import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { userMayPublishCommunityPuzzle } from "@/lib/community-puzzle-admin-auth";
import { tryBuildManualCommunityPuzzlePayload } from "@/lib/cloud-puzzle";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 40 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await userMayPublishCommunityPuzzle(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const singleId = request.nextUrl.searchParams.get("gameId")?.trim() ?? "";
  if (singleId) {
    if (!UUID_RE.test(singleId)) {
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });
    }
    const { data: one, error: oneErr } = await admin
      .from("games")
      .select("id, pgn, opponent_name, moves_count")
      .eq("id", singleId)
      .maybeSingle();

    if (oneErr) {
      console.error("[community-manual GET game]", oneErr.message);
      return NextResponse.json({ error: "Database error" }, { status: 502 });
    }
    if (!one?.pgn) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return NextResponse.json({ game: one });
  }

  const { data, error } = await admin
    .from("games")
    .select("id, opponent_name, moves_count, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[community-manual GET]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  return NextResponse.json({ games: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 15 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await userMayPublishCommunityPuzzle(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const gameId = typeof b.gameId === "string" ? b.gameId.trim() : "";
  const afterMoveCount = typeof b.afterMoveCount === "number" ? b.afterMoveCount : NaN;
  const correctUci = typeof b.correctUci === "string" ? b.correctUci : "";
  const promptFr = typeof b.promptFr === "string" ? b.promptFr : undefined;
  const promptEn = typeof b.promptEn === "string" ? b.promptEn : undefined;

  const rawSolution = b.solutionLineUci;
  const solutionLineUci = Array.isArray(rawSolution)
    ? rawSolution.filter((x): x is string => typeof x === "string")
    : typeof rawSolution === "string"
      ? rawSolution.split(/\s+/).filter(Boolean)
      : [];

  if (!UUID_RE.test(gameId)) {
    return NextResponse.json({ error: "Invalid gameId", errorKey: "invalid_game_id" }, { status: 400 });
  }

  if (!Number.isInteger(afterMoveCount) || afterMoveCount < 0) {
    return NextResponse.json({ error: "Invalid afterMoveCount", errorKey: "invalid_ply" }, { status: 400 });
  }

  if (!correctUci.trim()) {
    return NextResponse.json({ error: "Missing correctUci", errorKey: "missing_correct" }, { status: 400 });
  }

  const { data: gameRow, error: gameErr } = await admin
    .from("games")
    .select("id, pgn, opponent_name")
    .eq("id", gameId)
    .maybeSingle();

  if (gameErr || !gameRow?.pgn) {
    return NextResponse.json({ error: "Game not found", errorKey: "game_not_found" }, { status: 404 });
  }

  const built = tryBuildManualCommunityPuzzlePayload({
    pgn: gameRow.pgn,
    gameId: gameRow.id,
    opponentName: gameRow.opponent_name ?? "?",
    afterMoveCount,
    correctUci,
    solutionLineUci,
    promptFr,
    promptEn,
  });

  if (!built.ok) {
    return NextResponse.json(
      { error: "Validation failed", errorKey: built.errorKey },
      { status: 422 }
    );
  }

  const { error: upErr } = await admin.from("community_puzzles").upsert(
    {
      game_id: gameId,
      ply_index: afterMoveCount,
      mate_attacker_moves: built.mateAttackerHalfMoves,
      payload: built.payload,
      source: "manual",
      created_by: user.id,
    },
    { onConflict: "game_id,ply_index" }
  );

  if (upErr) {
    console.error("[community-manual POST upsert]", upErr.message);
    return NextResponse.json({ error: upErr.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, payload: built.payload });
}
