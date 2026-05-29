import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import {
  normalizeLichessPuzzlePayload,
  type NormalizedLichessPuzzle,
} from "@/lib/lichess-puzzle";
import {
  assignTargetLevels,
  lichessPuzzleSlug,
  lichessPuzzleToCampaignRow,
  nextFreeStandardLevel,
  type CampaignLevelSlot,
} from "@/lib/ascension/lichess-import";

export const runtime = "nodejs";

const DIFFICULTIES = new Set([
  "easiest",
  "easier",
  "normal",
  "harder",
  "hardest",
]);
const MAX_COUNT = 30;

function clampCount(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(MAX_COUNT, n));
}

function rawPuzzleId(entry: unknown): string | null {
  if (entry && typeof entry === "object") {
    const puzzle = (entry as { puzzle?: unknown }).puzzle;
    if (puzzle && typeof puzzle === "object") {
      const id = (puzzle as { id?: unknown }).id;
      if (typeof id === "string" && id) return id;
    }
  }
  return null;
}

async function fetchLichessDetail(
  puzzleId: string
): Promise<NormalizedLichessPuzzle | null> {
  try {
    const res = await fetch(
      `https://lichess.org/api/puzzle/${encodeURIComponent(puzzleId)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw: unknown = await res.json().catch(() => null);
    return normalizeLichessPuzzlePayload(raw);
  } catch {
    return null;
  }
}

function isValidPuzzle(p: NormalizedLichessPuzzle | null): p is NormalizedLichessPuzzle {
  return (
    !!p &&
    p.solutionUci.length > 0 &&
    validateStandardPuzzleLine(p.fen, p.solutionUci).ok
  );
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const count = clampCount(body.count);
  const difficulty =
    typeof body.difficulty === "string" && DIFFICULTIES.has(body.difficulty)
      ? body.difficulty
      : undefined;
  const startLevelRaw = Number(body.startLevel);

  // 1. Fetch a batch of puzzles from Lichess.
  const lichessUrl = new URL("https://lichess.org/api/puzzle/batch/mix");
  lichessUrl.searchParams.set("nb", String(count));
  if (difficulty) lichessUrl.searchParams.set("difficulty", difficulty);

  let batchRaw: unknown;
  try {
    const batchRes = await fetch(lichessUrl.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!batchRes.ok) {
      return NextResponse.json(
        { error: `Lichess returned ${batchRes.status}` },
        { status: batchRes.status === 429 ? 429 : 502 }
      );
    }
    batchRaw = await batchRes.json().catch(() => null);
  } catch (e) {
    console.error("[ascension/import-lichess] fetch", e);
    return NextResponse.json({ error: "Lichess request failed" }, { status: 502 });
  }

  const entries =
    batchRaw && typeof batchRaw === "object" && Array.isArray((batchRaw as { puzzles?: unknown }).puzzles)
      ? ((batchRaw as { puzzles: unknown[] }).puzzles)
      : [];

  if (entries.length === 0) {
    return NextResponse.json({ error: "Could not parse puzzle batch" }, { status: 502 });
  }

  // 2. Normalize + validate each puzzle (fallback to the detail endpoint for FEN).
  const normalized: NormalizedLichessPuzzle[] = [];
  let invalid = 0;
  for (const entry of entries) {
    const candidate = normalizeLichessPuzzlePayload(entry);
    const fallbackId = rawPuzzleId(entry) ?? candidate?.puzzleId ?? null;
    let puzzle: NormalizedLichessPuzzle | null = candidate;
    if (!isValidPuzzle(puzzle)) {
      puzzle = fallbackId ? await fetchLichessDetail(fallbackId) : null;
    }
    if (!isValidPuzzle(puzzle)) {
      invalid++;
      continue;
    }
    normalized.push(puzzle);
  }

  // 3. Load existing puzzles for dedup + level assignment.
  const { data: existingRows, error: loadError } = await admin
    .from("campaign_puzzles")
    .select("slug, sort_order, is_published");
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  const existing = (existingRows ?? []) as Array<
    CampaignLevelSlot & { slug: string }
  >;
  const existingSlugs = new Set(existing.map((r) => r.slug));

  // 4. Deduplicate by slug (already imported or duplicated within the batch).
  const seen = new Set<string>();
  const unique: NormalizedLichessPuzzle[] = [];
  let skippedDuplicates = 0;
  for (const puzzle of normalized) {
    const slug = lichessPuzzleSlug(puzzle.puzzleId);
    if (existingSlugs.has(slug) || seen.has(slug)) {
      skippedDuplicates++;
      continue;
    }
    seen.add(slug);
    unique.push(puzzle);
  }

  // 5. Order by ascending rating so the campaign difficulty ramps up.
  unique.sort((a, b) => a.rating - b.rating);

  const startLevel =
    Number.isFinite(startLevelRaw) && startLevelRaw >= 1
      ? Math.floor(startLevelRaw)
      : nextFreeStandardLevel(existing);

  const assignments = assignTargetLevels(existing, unique, startLevel);

  // 6. Upsert + publish each puzzle on its target level.
  const levels: number[] = [];
  let imported = 0;
  let failed = 0;
  for (const { puzzle, level } of assignments) {
    const row = lichessPuzzleToCampaignRow(puzzle, level);
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
  });
}
