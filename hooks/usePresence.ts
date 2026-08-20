"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type PresencePayload = {
  user_id: string;
  page: string;
  last_seen: string;
};

export function usePresence(userId: string | null): void {
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(
    null
  );

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) {
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const client = supabase;
    const ch = client.channel("presence:app", {
      config: { presence: { key: userId } },
    });

    const track = () => {
      const payload: PresencePayload = {
        user_id: userId,
        page: pathname ?? "/",
        last_seen: new Date().toISOString(),
      };
      void ch.track(payload);
    };

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") track();
    });

    channelRef.current = ch;
    track();

    return () => {
      void client.removeChannel(ch);
      channelRef.current = null;
    };
  }, [userId, pathname]);
}
