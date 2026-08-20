"use client";

import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { identifyUser, resetAnalytics, initPostHog } from "@/lib/analytics";
import { hasActivePremiumAccess } from "@/lib/subscription-access";

export function useAnalyticsIdentify(): void {
  useEffect(() => {
    initPostHog();
    if (!isSupabaseConfigured || !supabase) return;

    const client = supabase;

    async function sync() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) {
        resetAnalytics();
        return;
      }

      const { data: sub } = await client
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: profile } = await client
        .from("profiles")
        .select("platform")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      identifyUser(user.id, {
        plan: sub?.plan ?? "free",
        is_premium: hasActivePremiumAccess(sub?.plan, sub?.status),
        platform: profile?.platform ?? "unknown",
      });
    }

    void sync();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        resetAnalytics();
        return;
      }
      void sync();
    });

    return () => subscription.unsubscribe();
  }, []);
}
