"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";

type Role = "white" | "black" | null;

export interface OnlineGameState {
  game: PvpGameRow | null;
  moves: PvpMoveRow[];
  role: Role;
  canJoin: boolean;
  loading: boolean;
  error: string | null;
}

async function fetchWithAuth(path: string, init?: RequestInit) {
  if (!supabase) throw new Error("Supabase client unavailable");
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
}

function mergeMovesByPly(existing: PvpMoveRow[], incoming: PvpMoveRow): PvpMoveRow[] {
  const map = new Map<number, PvpMoveRow>();
  for (const m of existing) map.set(m.ply, m);
  map.set(incoming.ply, incoming);
  return [...map.values()].sort((a, b) => a.ply - b.ply);
}

export function useOnlineGame(gameId: string | null, userId: string | null) {
  const [state, setState] = useState<OnlineGameState>({
    game: null,
    moves: [],
    role: null,
    canJoin: false,
    loading: false,
    error: null,
  });

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(
    null
  );

  const refresh = useCallback(async () => {
    if (!gameId || !isSupabaseConfigured || !supabase) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchWithAuth(`/api/pvp/games/${gameId}`);
      const game = data.game as PvpGameRow;
      const moves = (data.moves as PvpMoveRow[]) ?? [];
      const role = (data.role as Role) ?? null;
      const canJoin = Boolean(data.canJoin);
      setState({ game, moves, role, canJoin, loading: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured || !supabase) {
      setState({
        game: null,
        moves: [],
        role: null,
        canJoin: false,
        loading: false,
        error: null,
      });
      return;
    }
    void refresh();
  }, [gameId, refresh]);

  const isParticipant = useMemo(() => {
    if (!state.game || !userId) return false;
    return (
      state.game.white_user_id === userId ||
      state.game.black_user_id === userId
    );
  }, [state.game, userId]);

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured || !supabase || !userId || !isParticipant) {
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const client = supabase;
    const ch = client
      .channel(`pvp:${gameId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pvp_moves",
          filter: `game_id=eq.${gameId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const row = payload.new as PvpMoveRow | null;
          if (!row?.ply) return;
          setState((s) => ({
            ...s,
            moves: mergeMovesByPly(s.moves, row),
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pvp_games",
          filter: `id=eq.${gameId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const row = payload.new as PvpGameRow | null;
          if (!row) return;
          setState((s) => ({ ...s, game: row }));
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      void client.removeChannel(ch);
      channelRef.current = null;
    };
  }, [gameId, userId, isParticipant]);

  const chess = useMemo(
    () => replayGameFromUcis(state.moves.map((m) => m.uci)),
    [state.moves]
  );

  const isMyTurn = useMemo(() => {
    if (!state.game || state.game.status !== "playing" || !state.role) return false;
    const t = chess.turn();
    return (
      (state.role === "white" && t === "w") || (state.role === "black" && t === "b")
    );
  }, [chess, state.game, state.role]);

  const createLobby = useCallback(async (timePreset = "unlimited"): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    const data = await fetchWithAuth("/api/pvp/games", {
      method: "POST",
      body: JSON.stringify({ timePreset }),
    });
    const game = data.game as { id?: string } | undefined;
    return game?.id ?? null;
  }, []);

  const deleteWaitingLobby = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}`, { method: "DELETE" });
  }, [gameId]);

  const joinLobby = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}/join`, { method: "POST" });
    await refresh();
  }, [gameId, refresh]);

  const submitMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      await fetchWithAuth(`/api/pvp/games/${gameId}/move`, {
        method: "POST",
        body: JSON.stringify({ uci }),
      });
      await refresh();
    },
    [gameId, refresh]
  );

  const resign = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}/resign`, { method: "POST" });
    await refresh();
  }, [gameId, refresh]);

  const drawAction = useCallback(
    async (action: "offer" | "accept" | "decline" | "cancel") => {
      if (!gameId) return;
      await fetchWithAuth(`/api/pvp/games/${gameId}/draw`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refresh();
    },
    [gameId, refresh]
  );

  return {
    ...state,
    chess,
    isMyTurn,
    isParticipant,
    refresh,
    createLobby,
    deleteWaitingLobby,
    joinLobby,
    submitMove,
    resign,
    drawAction,
  };
}
