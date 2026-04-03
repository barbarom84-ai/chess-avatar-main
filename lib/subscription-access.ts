/**
 * Subscription plan checks. `super` is granted manually (e.g. Supabase SQL) and
 * maps to the same feature access as premium.
 */
export function hasActivePremiumAccess(
  plan: string | null | undefined,
  status: string | null | undefined
): boolean {
  return status === 'active' && (plan === 'premium' || plan === 'super');
}

export function isActiveSuperPlan(
  plan: string | null | undefined,
  status: string | null | undefined
): boolean {
  return status === 'active' && plan === 'super';
}
