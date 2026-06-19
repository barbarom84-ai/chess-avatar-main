"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { writePvpGameBootstrap } from "@/lib/pvp-game-bootstrap";

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
  move_count: number;
  is_my_turn: boolean;
};

export type PendingRematch = {
  id: string;
  created_at: string;
  direction: "incoming" | "outgoing";
  opponent_user_id: string;
  opponent_display_name: string | null;
  opponent_avatar_url: string | null;
  time_preset: string;
  clock_mode: string;
  clock_initial_sec: number;
  clock_increment_sec: number;
};

type PvpGamesListResponse = {
  games: OpenPvpLobby[];
  activeGames?: ActivePvpGame[];
  pendingRematches?: PendingRematch[];
};

type PvpJoinGameResponse = {
  game?: PvpGameRow;
  role?: "white" | "black";
  serverNow?: number;
};

async function fetchWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
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
  return json as T;
}

/** Liste des salons ouverts + parties en cours + revanches en attente (rafraîchissement auto). */
export function useOpenPvpLobbies(userId: string | null, pollMs = 12_000) {
  const [lobbies, setLobbies] = useState<OpenPvpLobby[]>([]);
  const [activeGames, setActiveGames] = useState<ActivePvpGame[]>([]);
  const [pendingRematches, setPendingRematches] = useState<PendingRematch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured || !supabase) {
      setLobbies([]);
      setActiveGames([]);
      setPendingRematches([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<PvpGamesListResponse>("/api/pvp/games");
      setLobbies(data.games ?? []);
      setActiveGames(
        (Array.isArray(data.activeGames) ? data.activeGames : []).map((ag) => ({
          ...ag,
          move_count: ag.move_count ?? 0,
          is_my_turn: ag.is_my_turn ?? false,
        }))
      );
      setPendingRematches(
        Array.isArray(data.pendingRematches) ? data.pendingRematches : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLobbies([]);
      setActiveGames([]);
      setPendingRematches([]);
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

  const joinGameWithBootstrap = useCallback(
    async (targetGameId: string) => {
      const data = await fetchWithAuth<PvpJoinGameResponse>(
        `/api/pvp/games/${targetGameId}/join`,
        { method: "POST" }
      );
      const game = data.game;
      const role = data.role;
      if (game && role) {
        writePvpGameBootstrap({
          gameId: targetGameId,
          game,
          role,
          moves: [],
          at: Date.now(),
        });
      }
      void refresh();
      return { gameId: targetGameId, game, role };
    },
    [refresh]
  );

  const acceptRematch = joinGameWithBootstrap;
  const joinOpenLobby = joinGameWithBootstrap;

  useEffect(() => {
    if (!userId) {
      setLobbies([]);
      setActiveGames([]);
      setPendingRematches([]);
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [userId, pollMs, refresh]);

  return { lobbies, activeGames, pendingRematches, loading, error, refresh, cancelLobby, acceptRematch, joinOpenLobby };
}
