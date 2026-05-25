import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { hasActivePremiumAccess } from "@/lib/subscription-access";

export interface AscensionAuthContext {
  user: User;
  admin: SupabaseClient;
  isPremium: boolean;
}

export function getAscensionSupabaseEnv(): {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
} | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) return null;
  return { supabaseUrl, anonKey, serviceKey };
}

export async function requireAscensionPremium(
  request: NextRequest
): Promise<
  | { ok: true; ctx: AscensionAuthContext }
  | { ok: false; status: number; error: string }
> {
  const env = getAscensionSupabaseEnv();
  if (!env) {
    return { ok: false, status: 503, error: "Supabase not configured" };
  }

  const user = await getAuthedUserFromRequest(request, env.supabaseUrl, env.anonKey);
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const admin = createClient(env.supabaseUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subRow } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPremium = hasActivePremiumAccess(subRow?.plan, subRow?.status);
  if (!isPremium) {
    return { ok: false, status: 403, error: "Premium subscription required" };
  }

  return { ok: true, ctx: { user, admin, isPremium } };
}

export function mapDbChampionCard(row: Record<string, unknown>) {
  return {
    user_id: String(row.user_id),
    display_name: String(row.display_name ?? "Champion"),
    avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
    class_key: String(row.class_key ?? "tactique"),
    element: String(row.element ?? "neutral"),
    elo: Number(row.elo ?? 0),
    xp: Number(row.xp ?? 0),
    tier: String(row.tier ?? "stone"),
    customization:
      row.customization && typeof row.customization === "object"
        ? (row.customization as Record<string, string>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function mapDbCampaignPuzzle(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    kind: row.kind === "fantasy" ? ("fantasy" as const) : ("standard" as const),
    min_elo: Number(row.min_elo ?? 0),
    max_elo: Number(row.max_elo ?? 3000),
    xp_reward: Number(row.xp_reward ?? 10),
    elo_reward: Number(row.elo_reward ?? 10),
    fen: String(row.fen),
    solution_ucis: Array.isArray(row.solution_ucis)
      ? (row.solution_ucis as string[])
      : [],
    fantasy_rules:
      row.fantasy_rules && typeof row.fantasy_rules === "object"
        ? (row.fantasy_rules as Record<string, unknown>)
        : {},
    prompt:
      row.prompt && typeof row.prompt === "object"
        ? (row.prompt as { fr: string; en: string })
        : { fr: "", en: "" },
    hints: Array.isArray(row.hints) ? (row.hints as { fr: string; en: string }[]) : [],
    insight:
      row.insight && typeof row.insight === "object"
        ? (row.insight as { fr: string; en: string })
        : { fr: "", en: "" },
    sort_order: Number(row.sort_order ?? 0),
    is_published: Boolean(row.is_published),
  };
}
