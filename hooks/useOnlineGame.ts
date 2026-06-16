"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import {
  replayGameFromUcis,
  uciToLastMoveSquares,
  validateUciForPlayer,
} from "@/lib/pvp-chess";
import { isPvpSideToMoveTimedOut } from "@/lib/pvp-clock";
import { playChessMoveSound } from "@/lib/chess-sound";
import { isPremoveLegalNow } from "@/lib/pvp-premove";
import { canOfferPvpTakeback, pvpGameJustStarted } from "@/lib/pvp-takeback";
import { track } from "@/lib/track";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";

type Role = "white" | "black" | null;

export interface OnlineGameState {
  game: PvpGameRow | null;
  moves: PvpMoveRow[];
  role: Role;
  canJoin: boolean;
  canAcceptRematch: boolean;
  isSpectator: boolean;
  loading: boolean;
  error: string | null;
}

type MovePostResponse = {
  ok?: boolean;
  ply?: number;
  uci?: string;
  move?: PvpMoveRow;
  game?: Partial<PvpGameRow>;
  gameOver?: boolean;
  result?: string | null;
  resultReason?: string | null;
};

function mergeMovesByPly(existing: PvpMoveRow[], incoming: PvpMoveRow): PvpMoveRow[] {
  const map = new Map<number, PvpMoveRow>();
  for (const m of existing) map.set(m.ply, m);
  map.set(incoming.ply, incoming);
  return [...map.values()].sort((a, b) => a.ply - b.ply);
}

function mergeGameRow(game: PvpGameRow, patch: Partial<PvpGameRow>): PvpGameRow {
  return { ...game, ...patch };
}

export function useOnlineGame(gameId: string | null, userId: string | null) {
  const { settings } = useChessboardSettings();
  const soundEnabledRef = useRef(settings.soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = settings.soundEnabled;
  }, [settings.soundEnabled]);

  const [state, setState] = useState<OnlineGameState>({
    game: null,
    moves: [],
    role: null,
    canJoin: false,
    canAcceptRematch: false,
    isSpectator: false,
    loading: false,
    error: null,
  });
  const [pendingUci, setPendingUci] = useState<string | null>(null);
  const [premoveUci, setPremoveUci] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const timeoutClaimInFlightRef = useRef(false);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(
    null
  );
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    const sync = () => {
      void client.auth.getSession().then(({ data }) => {
        accessTokenRef.current = data.session?.access_token ?? null;
      });
    };
    sync();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => sync());
    return () => subscription.unsubscribe();
  }, []);

  const fetchWithAuth = useCallback(async (path: string, init?: RequestInit) => {
    if (!supabase) throw new Error("Supabase client unavailable");
    let token = accessTokenRef.current;
    if (!token) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token ?? null;
      accessTokenRef.current = token;
    }
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

  const applyServerState = useCallback(
    (payload: {
      game: PvpGameRow;
      moves: PvpMoveRow[];
      role: Role;
      canJoin: boolean;
      canAcceptRematch?: boolean;
      isSpectator?: boolean;
    }) => {
      setState({
        game: payload.game,
        moves: payload.moves,
        role: payload.role,
        canJoin: payload.canJoin,
        canAcceptRematch: Boolean(payload.canAcceptRematch),
        isSpectator: Boolean(payload.isSpectator),
        loading: false,
        error: null,
      });
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!gameId || !isSupabaseConfigured || !supabase) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchWithAuth(`/api/pvp/games/${gameId}`);
      applyServerState({
        game: data.game as PvpGameRow,
        moves: (data.moves as PvpMoveRow[]) ?? [],
        role: (data.role as Role) ?? null,
        canJoin: Boolean(data.canJoin),
        canAcceptRematch: Boolean(data.canAcceptRematch),
        isSpectator: Boolean(data.isSpectator),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [gameId, fetchWithAuth, applyServerState]);

  const refreshSilent = useCallback(async () => {
    if (!gameId || !isSupabaseConfigured || !supabase) return;
    try {
      const data = await fetchWithAuth(`/api/pvp/games/${gameId}`);
      applyServerState({
        game: data.game as PvpGameRow,
        moves: (data.moves as PvpMoveRow[]) ?? [],
        role: (data.role as Role) ?? null,
        canJoin: Boolean(data.canJoin),
        canAcceptRematch: Boolean(data.canAcceptRematch),
        isSpectator: Boolean(data.isSpectator),
      });
    } catch {
      /* background resync only */
    }
  }, [gameId, fetchWithAuth, applyServerState]);

  const refreshSilentRef = useRef(refreshSilent);
  refreshSilentRef.current = refreshSilent;

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured || !supabase) {
      setState({
        game: null,
        moves: [],
        role: null,
        canJoin: false,
        canAcceptRematch: false,
        isSpectator: false,
        loading: false,
        error: null,
      });
      setPendingUci(null);
      setPremoveUci(null);
      return;
    }
    setPendingUci(null);
    setPremoveUci(null);
    void refresh();
  }, [gameId, refresh]);

  const isParticipant = useMemo(() => {
    if (!state.game || !userId) return false;
    return (
      state.game.white_user_id === userId ||
      state.game.black_user_id === userId
    );
  }, [state.game, userId]);

  const canUseRealtime = isParticipant || (state.isSpectator && Boolean(userId));

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured || !supabase || !userId || !canUseRealtime) {
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
          if (soundEnabledRef.current && row.played_by && row.played_by !== userId) {
            playChessMoveSound();
          }
          setState((s) => ({
            ...s,
            moves: mergeMovesByPly(s.moves, row),
          }));
          setPendingUci((pending) => (pending === row.uci ? null : pending));
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
          setState((s) => {
            const justStarted = pvpGameJustStarted(s.game, row);
            if (justStarted) {
              queueMicrotask(() => void refreshSilentRef.current());
            }
            return { ...s, game: row };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "pvp_moves",
          filter: `game_id=eq.${gameId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const old = payload.old as { ply?: number } | null;
          if (!old?.ply) return;
          setState((s) => ({
            ...s,
            moves: s.moves.filter((m) => m.ply !== old.ply),
          }));
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      void client.removeChannel(ch);
      channelRef.current = null;
    };
  }, [gameId, userId, canUseRealtime]);

  const prevPvpStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = state.game?.status ?? null;
    if (
      status === "finished" &&
      prevPvpStatusRef.current !== "finished" &&
      gameId
    ) {
      track("pvp_game_ended", { game_id: gameId, result: state.game?.result ?? "" });
    }
    prevPvpStatusRef.current = status;
  }, [state.game?.status, state.game?.result, gameId]);

  const effectiveUcis = useMemo(() => {
    const ucis = state.moves.map((m) => m.uci);
    if (!pendingUci) return ucis;
    if (ucis.includes(pendingUci)) return ucis;
    return [...ucis, pendingUci];
  }, [state.moves, pendingUci]);

  const chess = useMemo(() => replayGameFromUcis(effectiveUcis), [effectiveUcis]);

  const lastMove = useMemo(
    () => uciToLastMoveSquares(effectiveUcis[effectiveUcis.length - 1]),
    [effectiveUcis]
  );

  const isMyTurn = useMemo(() => {
    if (!state.game || state.game.status !== "playing" || !state.role) return false;
    if (pendingUci) return false;
    const t = chess.turn();
    return (
      (state.role === "white" && t === "w") || (state.role === "black" && t === "b")
    );
  }, [chess, state.game, state.role, pendingUci]);

  const usesMoveClock =
    state.game?.status === "playing" &&
    (state.game.clock_mode === "timed" || state.game.clock_mode === "correspondence");

  useEffect(() => {
    if (!usesMoveClock) return;
    const intervalMs = state.game?.clock_mode === "correspondence" ? 60_000 : 200;
    const id = window.setInterval(() => setClockNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [usesMoveClock, state.game?.clock_mode]);

  const isSideToMoveTimedOut = useMemo(() => {
    if (!state.game || state.game.status !== "playing") return false;
    return isPvpSideToMoveTimedOut(state.game, chess.turn(), clockNow);
  }, [state.game, chess, clockNow]);

  useEffect(() => {
    if (!gameId || !isParticipant || !isSideToMoveTimedOut || !state.game) return;
    if (state.game.status !== "playing") return;
    if (timeoutClaimInFlightRef.current) return;

    timeoutClaimInFlightRef.current = true;
    void refreshSilent().finally(() => {
      timeoutClaimInFlightRef.current = false;
    });
  }, [gameId, isParticipant, isSideToMoveTimedOut, state.game, refreshSilent]);

  useEffect(() => {
    if (!pendingUci) return;
    if (state.moves.some((m) => m.uci === pendingUci)) {
      setPendingUci(null);
    }
  }, [state.moves, pendingUci]);

  const canPremove = useMemo(() => {
    if (!state.game || state.game.status !== "playing" || !state.role) return false;
    if (pendingUci || isMyTurn) return false;
    return true;
  }, [state.game, state.role, pendingUci, isMyTurn]);

  const createLobby = useCallback(async (timePreset = "correspondence_3d"): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    const data = await fetchWithAuth("/api/pvp/games", {
      method: "POST",
      body: JSON.stringify({ timePreset }),
    });
    const game = data.game as { id?: string } | undefined;
    if (game?.id) track("pvp_lobby_created", { time_preset: timePreset });
    return game?.id ?? null;
  }, [fetchWithAuth]);

  const deleteWaitingLobby = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}`, { method: "DELETE" });
  }, [gameId, fetchWithAuth]);

  const joinLobby = useCallback(async () => {
    if (!gameId) return;
    const data = await fetchWithAuth(`/api/pvp/games/${gameId}/join`, { method: "POST" });
    track("pvp_game_joined", { game_id: gameId });

    const joinedGame = data.game as PvpGameRow | undefined;
    const joinedRole = (data.role as Role) ?? null;
    if (joinedGame) {
      setState((s) => ({
        ...s,
        game: s.game ? { ...s.game, ...joinedGame } : joinedGame,
        role: joinedRole ?? s.role,
        canJoin: false,
        canAcceptRematch: false,
        loading: false,
        error: null,
      }));
    }

    await refreshSilent();
  }, [gameId, refreshSilent, fetchWithAuth]);

  const submitMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      const role = state.role;
      const game = state.game;
      if (!role || !game || game.status !== "playing") {
        throw new Error("Game is not active");
      }
      if (isPvpSideToMoveTimedOut(game, chess.turn(), Date.now())) {
        void refreshSilent();
        throw new Error("Time expired");
      }
      if (pendingUci) {
        throw new Error("Move in progress");
      }

      const validation = validateUciForPlayer(
        state.moves.map((m) => m.uci),
        uci,
        role
      );
      if (!validation.ok) {
        throw new Error(validation.reason);
      }

      setPendingUci(validation.uci);
      if (soundEnabledRef.current) playChessMoveSound();

      try {
        const data = (await fetchWithAuth(`/api/pvp/games/${gameId}/move`, {
          method: "POST",
          body: JSON.stringify({ uci: validation.uci }),
        })) as MovePostResponse;

        const inserted = data.move;
        const gamePatch = data.game;

        setState((s) => {
          if (!s.game) return s;
          let nextGame = s.game;
          if (gamePatch && typeof gamePatch === "object") {
            nextGame = mergeGameRow(s.game, gamePatch as Partial<PvpGameRow>);
          }
          let nextMoves = s.moves;
          if (inserted?.ply) {
            nextMoves = mergeMovesByPly(s.moves, inserted);
          } else if (data.ply && data.uci) {
            nextMoves = mergeMovesByPly(s.moves, {
              id: -data.ply,
              game_id: gameId,
              ply: data.ply,
              uci: data.uci,
              played_by: userId ?? "",
              created_at: new Date().toISOString(),
            });
          }
          return { ...s, game: nextGame, moves: nextMoves };
        });

        setPendingUci(null);
        track("pvp_move_played", { game_id: gameId });
      } catch (e) {
        setPendingUci(null);
        throw e;
      }
    },
    [gameId, state.role, state.game, state.moves, pendingUci, fetchWithAuth, userId, chess, refreshSilent]
  );

  const resign = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}/resign`, { method: "POST" });
    await refresh();
  }, [gameId, refresh, fetchWithAuth]);

  const drawAction = useCallback(
    async (action: "offer" | "accept" | "decline" | "cancel") => {
      if (!gameId) return;
      await fetchWithAuth(`/api/pvp/games/${gameId}/draw`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refresh();
    },
    [gameId, refresh, fetchWithAuth]
  );

  const takebackAction = useCallback(
    async (action: "offer" | "accept" | "decline" | "cancel") => {
      if (!gameId) return;
      await fetchWithAuth(`/api/pvp/games/${gameId}/takeback`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refresh();
    },
    [gameId, refresh, fetchWithAuth]
  );

  const premoveQueuedRef = useRef(false);
  useEffect(() => {
    if (!isMyTurn || !premoveUci || pendingUci || premoveQueuedRef.current) return;
    if (!state.role || !state.game || state.game.status !== "playing") return;
    if (!isPremoveLegalNow(chess.fen(), premoveUci)) {
      setPremoveUci(null);
      return;
    }
    premoveQueuedRef.current = true;
    const uci = premoveUci;
    setPremoveUci(null);
    void submitMove(uci).finally(() => {
      premoveQueuedRef.current = false;
    });
  }, [
    isMyTurn,
    premoveUci,
    pendingUci,
    state.role,
    state.game,
    chess,
    submitMove,
  ]);

  const requestRematch = useCallback(
    async (swapColors = true): Promise<{ gameId: string; inviteUrl?: string }> => {
      if (!gameId) throw new Error("No game");
      const data = await fetchWithAuth(`/api/pvp/games/${gameId}/rematch`, {
        method: "POST",
        body: JSON.stringify({ swapColors }),
      });
      const newId =
        typeof data.gameId === "string"
          ? data.gameId
          : (data.game as { id?: string } | undefined)?.id;
      if (!newId) throw new Error("Rematch failed");
      track("pvp_rematch_created", { from_game_id: gameId, swap_colors: swapColors });
      return {
        gameId: newId,
        inviteUrl: typeof data.inviteUrl === "string" ? data.inviteUrl : undefined,
      };
    },
    [gameId, fetchWithAuth]
  );

  const canOfferTakeback = useMemo(() => {
    if (!userId || !state.role || !state.game || state.game.status !== "playing") return false;
    if (state.game.takeback_offered_by || state.game.draw_offered_by) return false;
    return canOfferPvpTakeback(userId, state.role, state.moves, chess);
  }, [userId, state.role, state.game, state.moves, chess]);

  return {
    ...state,
    chess,
    lastMove,
    pendingUci,
    premoveUci,
    setPremoveUci,
    canPremove,
    canOfferTakeback,
    isMyTurn,
    isParticipant,
    isSideToMoveTimedOut,
    refresh,
    refreshSilent,
    createLobby,
    deleteWaitingLobby,
    joinLobby,
    submitMove,
    resign,
    drawAction,
    takebackAction,
    requestRematch,
  };
}
