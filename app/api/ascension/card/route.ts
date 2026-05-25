import { NextRequest, NextResponse } from "next/server";
import {
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";

export const runtime = "nodejs";

const ALLOWED_CLASSES = new Set([
  "agressif",
  "solide",
  "tactique",
  "positionnel",
  "équilibré",
]);
const ALLOWED_ELEMENTS = new Set(["fire", "earth", "water", "air", "neutral"]);

export async function GET(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.ctx.admin
    .from("player_champion_cards")
    .select("*")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Champion card not initialized" }, { status: 404 });
  }

  const skills = await auth.ctx.admin
    .from("player_skill_allocations")
    .select("skill_id")
    .eq("user_id", auth.ctx.user.id);

  const completions = await auth.ctx.admin
    .from("player_puzzle_completions")
    .select("puzzle_id")
    .eq("user_id", auth.ctx.user.id);

  return NextResponse.json({
    card: mapDbChampionCard(data as Record<string, unknown>),
    unlockedSkills: (skills.data ?? []).map((r) => String(r.skill_id)),
    completedPuzzleIds: (completions.data ?? []).map((r) => String(r.puzzle_id)),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.display_name === "string" && body.display_name.trim()) {
    updates.display_name = body.display_name.trim().slice(0, 40);
  }
  if (typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url.slice(0, 500);
  }
  if (typeof body.class_key === "string" && ALLOWED_CLASSES.has(body.class_key)) {
    updates.class_key = body.class_key;
  }
  if (typeof body.element === "string" && ALLOWED_ELEMENTS.has(body.element)) {
    updates.element = body.element;
  }
  if (body.customization && typeof body.customization === "object") {
    updates.customization = body.customization;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await auth.ctx.admin
    .from("player_champion_cards")
    .update(updates)
    .eq("user_id", auth.ctx.user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ card: mapDbChampionCard(data as Record<string, unknown>) });
}
