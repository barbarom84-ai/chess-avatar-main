"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type PvpPresencePayload = {
  user_id: string;
  game_id: string;
  last_seen: string;
};

const HEARTBEAT_MS = 12_000;

/** Présence Supabase par partie — heartbeat local + suivi adversaire. */
export function usePvpGamePresence(
  gameId: string | null,
  userId: string | null,
  opponentUserId: string | null,
  enabled: boolean
): { opponentPresenceAt: number | null } {
  const [opponentPresenceAt, setOpponentPresenceAt] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!enabled || !gameId || !userId || !opponentUserId || !isSupabaseConfigured || !supabase) {
      setOpponentPresenceAt(null);
      return;
    }

    const client = supabase;
    const ch = client.channel(`presence:pvp:${gameId}`, {
      config: { presence: { key: userId } },
    });

    const readOpponent = () => {
      const state = ch.presenceState<PvpPresencePayload>();
      let latest: number | null = null;
      for (const entries of Object.values(state)) {
        for (const entry of entries) {
          if (entry.user_id !== opponentUserId) continue;
          const ts = Date.parse(entry.last_seen);
          if (Number.isFinite(ts) && (latest == null || ts > latest)) latest = ts;
        }
      }
      if (latest != null) setOpponentPresenceAt(latest);
    };

    const track = () => {
      const payload: PvpPresencePayload = {
        user_id: userId,
        game_id: gameId,
        last_seen: new Date().toISOString(),
      };
      void ch.track(payload);
    };

    ch.on("presence", { event: "sync" }, readOpponent)
      .on("presence", { event: "join" }, readOpponent)
      .on("presence", { event: "leave" }, readOpponent)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") track();
      });

    channelRef.current = ch;
    const heartbeat = window.setInterval(track, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      void client.removeChannel(ch);
      channelRef.current = null;
    };
  }, [enabled, gameId, userId, opponentUserId]);

  return { opponentPresenceAt };
}
