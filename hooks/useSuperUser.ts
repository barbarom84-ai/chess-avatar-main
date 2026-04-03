"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isActiveSuperPlan } from "@/lib/subscription-access";

export function useSuperUser(): { isSuperUser: boolean; loading: boolean; userId: string | null } {
  const [state, setState] = useState({
    isSuperUser: false,
    loading: Boolean(isSupabaseConfigured && supabase),
    userId: null as string | null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ isSuperUser: false, loading: false, userId: null });
      return;
    }

    let mounted = true;
    const client = supabase;

    async function check() {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          if (mounted) setState({ isSuperUser: false, loading: false, userId: null });
          return;
        }

        const { data } = await client
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .single();

        const isSuperUser = isActiveSuperPlan(data?.plan, data?.status);
        if (mounted) {
          setState({ isSuperUser, loading: false, userId: user.id });
        }
      } catch {
        if (mounted) setState({ isSuperUser: false, loading: false, userId: null });
      }
    }

    check();

    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
