import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";
import { Chess } from "chess.js";

export const runtime = "nodejs";

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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await isSuperUserServer(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const kind = body.kind === "fantasy" ? "fantasy" : "standard";
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
    const chess = new Chess(fen);
    for (const uci of solutionUcis) {
      if (!chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as "q" | "r" | "b" | "n" | undefined })) {
        return NextResponse.json({ error: `Illegal move: ${uci}` }, { status: 400 });
      }
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
    is_published: Boolean(body.is_published ?? false),
  };

  const { data, error } = await admin
    .from("campaign_puzzles")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ puzzle: data });
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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await isSuperUserServer(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("campaign_puzzles")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ puzzles: data ?? [] });
}
