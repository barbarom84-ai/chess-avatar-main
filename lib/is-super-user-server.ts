import type { SupabaseClient } from "@supabase/supabase-js";
import { isActiveSuperPlan } from "@/lib/subscription-access";

/** Server-side: true when user has active `super` plan. */
export async function isSuperUserServer(
  sb: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await sb
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return isActiveSuperPlan(data.plan, data.status);
}
