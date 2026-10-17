import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import { normalizeTrackSlug } from "@/lib/ascension/campaign-tracks";
import {
  brilliantMoveToCampaignRow,
  brilliantPuzzleSlug,
} from "@/lib/ascension/brilliant-import";
import {
  assignTargetLevels,
  nextFreeStandardLevel,
  type CampaignLevelSlot,
} from "@/lib/ascension/lichess-import";

export const runtime = "nodejs";

const MAX_BATCH = 50;

interface IncomingBrilliant {
  fen: string;
  uci: string;
  gameId: string;
  ply: number;
  username: string;
  gameUrl?: string;
  san?: string;
  rating?: number;
}

function parseIncoming(raw: unknown): IncomingBrilliant | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fen = typeof o.fen === "string" ? o.fen.trim() : "";
  const uci = typeof o.uci === "string" ? o.uci.trim().toLowerCase() : "";
  const gameId = typeof o.gameId === "string" ? o.gameId.trim() : "";
  const username = typeof o.username === "string" ? o.username.trim() : "";
  const ply = Math.floor(Number(o.ply));
  if (!fen || !uci || !gameId || !username || !Number.isFinite(ply) || ply < 0) {
    return null;
  }
  const gameUrl =
    typeof o.gameUrl === "string" && o.gameUrl.trim() ? o.gameUrl.trim() : undefined;
  const san = typeof o.san === "string" && o.san.trim() ? o.san.trim() : undefined;
  const ratingRaw = Number(o.rating);
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : undefined;
  return { fen, uci, gameId, ply, username, gameUrl, san, rating };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!(await isSuperUserServer(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const track = normalizeTrackSlug(String(body.track ?? ""));
  if (!track) {
    return NextResponse.json({ error: "track required" }, { status: 400 });
  }

  const { data: trackRow, error: trackError } = await admin
    .from("campaign_tracks")
    .select("slug")
    .eq("slug", track)
    .maybeSingle();
  if (trackError) {
    return NextResponse.json({ error: trackError.message }, { status: 500 });
  }
  if (!trackRow) {
    return NextResponse.json({ error: `Unknown track: ${track}` }, { status: 400 });
  }

  const rawList = Array.isArray(body.puzzles) ? body.puzzles : [];
  if (rawList.length === 0) {
    return NextResponse.json({ error: "puzzles required" }, { status: 400 });
  }
  if (rawList.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCH} puzzles per request` },
      { status: 400 }
    );
  }

  const startLevelRaw = Number(body.startLevel);
  let invalid = 0;
  const parsed: IncomingBrilliant[] = [];
  for (const item of rawList) {
    const candidate = parseIncoming(item);
    if (!candidate) {
      invalid++;
      continue;
    }
    if (!validateStandardPuzzleLine(candidate.fen, [candidate.uci]).ok) {
      invalid++;
      continue;
    }
    parsed.push(candidate);
  }

  const { data: trackRows, error: loadError } = await admin
    .from("campaign_puzzles")
    .select("sort_order, is_published")
    .eq("track", track);
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  const existing = (trackRows ?? []) as CampaignLevelSlot[];

  const { data: slugRows, error: slugError } = await admin
    .from("campaign_puzzles")
    .select("slug");
  if (slugError) {
    return NextResponse.json({ error: slugError.message }, { status: 500 });
  }
  const existingSlugs = new Set(
    (slugRows ?? []).map((r) => String((r as { slug: unknown }).slug))
  );

  const seen = new Set<string>();
  const unique: IncomingBrilliant[] = [];
  let skippedDuplicates = 0;
  for (const puzzle of parsed) {
    const slug = brilliantPuzzleSlug(puzzle.username, puzzle.gameId, puzzle.ply);
    if (existingSlugs.has(slug) || seen.has(slug)) {
      skippedDuplicates++;
      continue;
    }
    seen.add(slug);
    unique.push(puzzle);
  }

  const startLevel =
    Number.isFinite(startLevelRaw) && startLevelRaw >= 1
      ? Math.floor(startLevelRaw)
      : nextFreeStandardLevel(existing);

  const assignments = assignTargetLevels(existing, unique, startLevel);

  const levels: number[] = [];
  let imported = 0;
  let failed = 0;
  for (const { puzzle, level } of assignments) {
    const row = brilliantMoveToCampaignRow({
      fen: puzzle.fen,
      uci: puzzle.uci,
      gameId: puzzle.gameId,
      ply: puzzle.ply,
      username: puzzle.username,
      track,
      sortOrder: level,
      gameUrl: puzzle.gameUrl,
      san: puzzle.san,
      rating: puzzle.rating,
    });

    const upsertRes = await admin
      .from("campaign_puzzles")
      .upsert(row, { onConflict: "slug" })
      .select("id")
      .single();

    if (upsertRes.error || !upsertRes.data) {
      failed++;
      continue;
    }

    await admin
      .from("campaign_puzzles")
      .update({ is_published: false })
      .eq("sort_order", level)
      .eq("track", track)
      .neq("id", String(upsertRes.data.id));

    imported++;
    levels.push(level);
  }

  return NextResponse.json({
    imported,
    skippedDuplicates,
    invalid,
    failed,
    levels,
    track,
  });
}
