"use client";

import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hydrateBotEnginePreferenceFromAccount } from "@/lib/bot-engine-account-sync";

/** Hydrates bot engine preference from Supabase after auth. */
export default function BotEnginePreferenceSync() {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const hydrate = () => {
      void hydrateBotEnginePreferenceFromAccount();
    };

    hydrate();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") hydrate();
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
