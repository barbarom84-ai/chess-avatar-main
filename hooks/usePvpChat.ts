"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpChatMessage } from "@/lib/pvp-chat";

const lastSentByUserGame = new Map<string, number>();

function mergeMessages(existing: PvpChatMessage[], incoming: PvpChatMessage): PvpChatMessage[] {
  if (existing.some((m) => m.id === incoming.id)) return existing;
  return [...existing, incoming].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function usePvpChat(gameId: string | null, userId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<PvpChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const chatVisibleRef = useRef(false);

  const markChatVisible = useCallback((visible: boolean) => {
    chatVisibleRef.current = visible;
    if (visible) setUnreadCount(0);
  }, []);

  const fetchWithAuth = useCallback(async (path: string, init?: RequestInit) => {
    if (!supabase) throw new Error("Supabase unavailable");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (
      init?.body &&
      typeof init.body === "string" &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(path, { ...init, headers });
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err =
        json &&
        typeof json === "object" &&
        "error" in json &&
        typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : res.statusText;
      throw new Error(err);
    }
    return json as Record<string, unknown>;
  }, []);

  const refresh = useCallback(async () => {
    if (!gameId || !userId || !enabled) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`/api/pvp/games/${gameId}/chat`);
      const list = data.messages;
      setMessages(Array.isArray(list) ? (list as PvpChatMessage[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [gameId, userId, enabled, fetchWithAuth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !gameId || !userId || !enabled) return;

    const channel = supabase
      .channel(`pvp-chat-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pvp_chat_messages",
          filter: `game_id=eq.${gameId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const row = payload.new as PvpChatMessage | undefined;
          if (!row?.id) return;
          setMessages((prev) => mergeMessages(prev, row));
          if (row.user_id !== userId && !chatVisibleRef.current) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    const client = supabase;
    return () => {
      void client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId, userId, enabled]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!gameId || !userId) throw new Error("Not ready");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Empty message");

      const key = `${gameId}:${userId}`;
      const now = Date.now();
      const last = lastSentByUserGame.get(key) ?? 0;
      if (now - last < 2000) throw new Error("Too fast");

      const data = await fetchWithAuth(`/api/pvp/games/${gameId}/chat`, {
        method: "POST",
        body: JSON.stringify({ body: trimmed }),
      });
      lastSentByUserGame.set(key, now);
      const msg = data.message as PvpChatMessage | undefined;
      if (msg?.id) {
        setMessages((prev) => mergeMessages(prev, msg));
      }
    },
    [gameId, userId, fetchWithAuth]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    refresh,
    unreadCount,
    markChatVisible,
  };
}
