import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/supabase-service";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";

export const runtime = "nodejs";

type PuzzleRow = Record<string, unknown>;

async function unpublishOtherLevels(
  admin: SupabaseClient,
  sortOrder: number,
  track: string,
  keepId: string
) {
  await admin
    .from("campaign_puzzles")
    .update({ is_published: false })
    .eq("sort_order", sortOrder)
    .eq("track", track)
    .neq("id", keepId);
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

  const puzzleId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const kind = body.kind === "fantasy" ? "fantasy" : "standard";
  const track = body.track === "fantasy" ? "fantasy" : "main";
  const fen = typeof body.fen === "string" ? body.fen : "";
  const solutionUcis = Array.isArray(body.solution_ucis)
    ? (body.solution_ucis as string[])
    : [];
  if (!slug || !fen || solutionUcis.length === 0) {
    return NextResponse.json({ error: "Missing slug, fen, or solution" }, { status: 400 });
  }

  if (kind === "fantasy") {
    const rules = (body.fantasy_rules ?? {}) as FantasyRuleSet;
    const replay = FantasyChessEngine.replaySolution(fen, rules, solutionUcis);
    if (!replay.ok) {
      return NextResponse.json({ error: replay.error }, { status: 400 });
    }
  } else {
    const validation = validateStandardPuzzleLine(fen, solutionUcis);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  const row = {
    slug,
    kind,
    fen,
    solution_ucis: solutionUcis,
    fantasy_rules: body.fantasy_rules ?? {},
    prompt: body.prompt ?? { fr: slug, en: slug },
    hints: body.hints ?? [],
    insight: body.insight ?? { fr: "", en: "" },
    min_elo: Number(body.min_elo ?? 0),
    max_elo: Number(body.max_elo ?? 3000),
    xp_reward: Number(body.xp_reward ?? 20),
    elo_reward: Number(body.elo_reward ?? 20),
    sort_order: Number(body.sort_order ?? 0),
    track,
    is_published: Boolean(body.is_published ?? false),
  };

  const slugOwner = await admin
    .from("campaign_puzzles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugOwner.data && slugOwner.data.id !== puzzleId) {
    return NextResponse.json({ error: `Slug already used: ${slug}` }, { status: 409 });
  }

  let saved: PuzzleRow | null = null;
  let saveError: string | null = null;

  if (puzzleId) {
    const existing = await admin.from("campaign_puzzles").select("id").eq("id", puzzleId).maybeSingle();
    if (!existing.data) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const updateRes = await admin
      .from("campaign_puzzles")
      .update(row)
      .eq("id", puzzleId)
      .select("*")
      .single();

    saved = updateRes.data as PuzzleRow | null;
    saveError = updateRes.error?.message ?? null;
  } else {
    const upsertRes = await admin
      .from("campaign_puzzles")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();

    saved = upsertRes.data as PuzzleRow | null;
    saveError = upsertRes.error?.message ?? null;
  }

  if (saveError || !saved) {
    return NextResponse.json({ error: saveError ?? "Save failed" }, { status: 500 });
  }

  const savedId = String(saved.id);

  if (row.is_published) {
    await unpublishOtherLevels(admin, row.sort_order, row.track, savedId);
  }

  const { data: refreshed } = await admin
    .from("campaign_puzzles")
    .select("*")
    .eq("id", savedId)
    .single();

  return NextResponse.json({ puzzle: refreshed ?? saved });
}

export async function GET(request: NextRequest) {
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

  const { data, error } = await admin
    .from("campaign_puzzles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ puzzles: data ?? [] });
}
