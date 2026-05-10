import type { SupabaseClient } from "@supabase/supabase-js";
import { isActiveSuperPlan } from "@/lib/subscription-access";

/** Comma-separated `auth.users` UUIDs with manual publish rights (in addition to Super plan). */
export function parseCommunityPuzzleAdminAllowlist(): Set<string> {
  const raw = process.env.COMMUNITY_PUZZLE_ADMIN_USER_IDS?.trim() ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export async function userMayPublishCommunityPuzzle(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (parseCommunityPuzzleAdminAllowlist().has(userId)) return true;

  const { data, error } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return isActiveSuperPlan(data?.plan, data?.status);
}
