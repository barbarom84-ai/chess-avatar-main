import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import {
  mapDbCampaignTrack,
  normalizeTrackSlug,
  type CampaignTrackLayout,
  type CampaignTrackUnlockRule,
} from "@/lib/ascension/campaign-tracks";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }) };
  }
  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  const admin = createServiceSupabase();
  if (!admin) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }) };
  }
  if (!(await isSuperUserServer(admin, user.id))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin };
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate && gate.error) return gate.error;

  const { data, error } = await gate.admin!
    .from("campaign_tracks")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tracks: (data ?? []).map((row) => mapDbCampaignTrack(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate && gate.error) return gate.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const originalSlug =
    typeof body.original_slug === "string" ? body.original_slug.trim() : "";
  const slug = normalizeTrackSlug(
    typeof body.slug === "string" ? body.slug : originalSlug
  );
  if (!slug) {
    return NextResponse.json({ error: "Invalid track slug" }, { status: 400 });
  }

  const labelFr =
    typeof body.label_fr === "string" ? body.label_fr.trim() : slug;
  const labelEn =
    typeof body.label_en === "string" ? body.label_en.trim() : slug;
  const layout: CampaignTrackLayout =
    body.layout === "main" ? "main" : "sequential";
  const sortOrder = Number(body.sort_order ?? 0);
  const unlockRule = (body.unlock_rule ?? { type: "always" }) as CampaignTrackUnlockRule;

  if (originalSlug && originalSlug !== slug) {
    const puzzleCount = await gate.admin!
      .from("campaign_puzzles")
      .select("id", { count: "exact", head: true })
      .eq("track", originalSlug);
    if ((puzzleCount.count ?? 0) > 0) {
      const { error: renameErr } = await gate.admin!
        .from("campaign_puzzles")
        .update({ track: slug })
        .eq("track", originalSlug);
      if (renameErr) {
        return NextResponse.json({ error: renameErr.message }, { status: 500 });
      }
    }
    await gate.admin!.from("campaign_tracks").delete().eq("slug", originalSlug);
  }

  const row = {
    slug,
    label: { fr: labelFr, en: labelEn },
    sort_order: sortOrder,
    layout,
    unlock_rule: unlockRule,
    is_system: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await gate.admin!
    .from("campaign_tracks")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ track: mapDbCampaignTrack(data as Record<string, unknown>) });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate && gate.error) return gate.error;

  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const existing = await gate.admin!
    .from("campaign_tracks")
    .select("slug, is_system")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing.data) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  if (existing.data.is_system) {
    return NextResponse.json({ error: "System tracks cannot be deleted" }, { status: 400 });
  }

  const puzzleCount = await gate.admin!
    .from("campaign_puzzles")
    .select("id", { count: "exact", head: true })
    .eq("track", slug);

  if ((puzzleCount.count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Delete all puzzles on this track first" },
      { status: 409 }
    );
  }

  const { error } = await gate.admin!.from("campaign_tracks").delete().eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: slug });
}
