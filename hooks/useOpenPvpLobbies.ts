"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type OpenPvpLobby = {
  id: string;
  created_at: string;
  isHost: boolean;
  host_user_id: string;
  host_display_name: string | null;
  host_avatar_url: string | null;
  time_preset: string;
  clock_mode: string;
  clock_initial_sec: number;
  clock_increment_sec: number;
};

export type ActivePvpGame = {
  id: string;
  created_at: string;
  updated_at: string;
  role: "white" | "black";
  opponent_user_id: string;
  opponent_display_name: string | null;
  opponent_avatar_url: string | null;
  time_preset: string;
  clock_mode: string;
  clock_initial_sec: number;
  clock_increment_sec: number;
};

async function fetchWithAuth(path: string, init?: RequestInit) {
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
  return json as { games: OpenPvpLobby[]; activeGames?: ActivePvpGame[] };
}

/** Liste des salons ouverts + parties en cours (rafraîchissement auto). */
export function useOpenPvpLobbies(userId: string | null, pollMs = 12_000) {
  const [lobbies, setLobbies] = useState<OpenPvpLobby[]>([]);
  const [activeGames, setActiveGames] = useState<ActivePvpGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured || !supabase) {
      setLobbies([]);
      setActiveGames([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth("/api/pvp/games");
      setLobbies(data.games ?? []);
      setActiveGames(Array.isArray(data.activeGames) ? data.activeGames : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLobbies([]);
      setActiveGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const cancelLobby = useCallback(
    async (id: string) => {
      await fetchWithAuth(`/api/pvp/games/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    if (!userId) {
      setLobbies([]);
      setActiveGames([]);
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [userId, pollMs, refresh]);

  return { lobbies, activeGames, loading, error, refresh, cancelLobby };
}
