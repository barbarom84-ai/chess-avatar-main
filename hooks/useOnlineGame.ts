"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import {
  replayGameFromUcis,
  uciToLastMoveSquares,
  validateUciForPlayer,
} from "@/lib/pvp-chess";
import { isPvpSideToMoveTimedOut } from "@/lib/pvp-clock";
import {
  localConnectionFromSignals,
  mergeOpponentLastSeen,
  opponentConnectionFromLastSeen,
  type PvpConnectionInfo,
} from "@/lib/pvp-connection";
import { playChessMoveSound } from "@/lib/chess-sound";
import { isPremoveLegalNow } from "@/lib/pvp-premove";
import { optimisticGameClockAfterMove } from "@/lib/pvp-clock-client";
import { chessForPvpClockAuthority } from "@/lib/pvp-clock-sync";
import { consumePvpGameBootstrap, writePvpGameBootstrap } from "@/lib/pvp-game-bootstrap";
import { nowFromServerAnchor, syncAnchorFromResponse, type ServerTimeAnchor } from "@/lib/pvp-server-time";
import { canOfferPvpTakeback, pvpGameJustStarted } from "@/lib/pvp-takeback";
import { canUserCancelWaitingPvpGame } from "@/lib/pvp-game-cancel";
import { track } from "@/lib/track";
import { enqueuePendingPvpMove, replayPendingPvpMoves } from "@/lib/pvp-offline-moves";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { usePvpGamePresence } from "@/hooks/usePvpGamePresence";

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
  serverNow?: number;
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
  const [serverOffsetMs, setServerOffsetMs] = useState<number | null>(null);
  const serverTimeAnchorRef = useRef<ServerTimeAnchor | null>(null);
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine
  );
  const [realtimeSubscribed, setRealtimeSubscribed] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [lastApiOkAt, setLastApiOkAt] = useState<number | null>(null);
  const [opponentLastSeenAt, setOpponentLastSeenAt] = useState<number | null>(null);
  const timeoutClaimInFlightRef = useRef(false);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(
    null
  );
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const touchEvent = useCallback(() => setLastEventAt(Date.now()), []);
  const markOpponentSeen = useCallback(() => setOpponentLastSeenAt(Date.now()), []);

  const syncServerTimeFromResponse = useCallback(
    (res: Response, body: unknown, requestStartedAtMs: number, responseReceivedAtMs: number) => {
      const rec =
        body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      const bodyNow = typeof rec.serverNow === "number" ? rec.serverNow : null;
      const anchor = syncAnchorFromResponse({
        serverNow: bodyNow,
        response: res,
        requestStartedAtMs,
        responseReceivedAtMs,
      });
      if (anchor) {
        serverTimeAnchorRef.current = anchor;
        setServerOffsetMs(anchor.serverMs - Date.now());
      }
      setLastApiOkAt(Date.now());
    },
    []
  );

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

  const fetchWithAuth = useCallback(async (
    path: string,
    init?: RequestInit,
    options?: { syncTime?: boolean }
  ) => {
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
    const requestStartedAtMs = Date.now();
    const res = await fetch(path, { ...init, headers });
    const responseReceivedAtMs = Date.now();
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
    if (options?.syncTime !== false) {
      syncServerTimeFromResponse(res, json, requestStartedAtMs, responseReceivedAtMs);
    }
    return json as Record<string, unknown>;
  }, [syncServerTimeFromResponse]);

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
  const seededFromBootstrapRef = useRef(false);

  useLayoutEffect(() => {
    seededFromBootstrapRef.current = false;
    if (!gameId || !isSupabaseConfigured) return;
    const seed = consumePvpGameBootstrap(gameId);
    if (!seed) return;
    applyServerState({
      game: seed.game,
      moves: seed.moves ?? [],
      role: seed.role,
      canJoin: false,
      canAcceptRematch: false,
      isSpectator: false,
    });
    seededFromBootstrapRef.current = true;
  }, [gameId, applyServerState]);

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
    if (seededFromBootstrapRef.current) {
      seededFromBootstrapRef.current = false;
      void refreshSilent();
      return;
    }
    void refresh();
  }, [gameId, refresh, refreshSilent]);

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
          touchEvent();
          const row = payload.new as PvpMoveRow | null;
          if (!row?.ply) return;
          if (row.played_by && row.played_by !== userId) {
            markOpponentSeen();
          }
          if (soundEnabledRef.current && row.played_by && row.played_by !== userId) {
            playChessMoveSound();
          }
          setState((s) => {
            if (!row?.ply || !s.game) {
              return s;
            }
            const isNewPly = !s.moves.some((m) => m.ply === row.ply);
            let nextGame = s.game;
            if (isNewPly && s.game.status === "playing") {
              const clockPatch = optimisticGameClockAfterMove(
                s.game,
                s.moves,
                nowFromServerAnchor(serverTimeAnchorRef.current)
              );
              if (Object.keys(clockPatch).length > 0) {
                nextGame = mergeGameRow(s.game, clockPatch);
              }
            }
            return {
              ...s,
              game: nextGame,
              moves: mergeMovesByPly(s.moves, row),
            };
          });
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
          touchEvent();
          const row = payload.new as PvpGameRow | null;
          if (!row) return;
          if (userId) {
            if (row.draw_offered_by && row.draw_offered_by !== userId) markOpponentSeen();
            if (row.takeback_offered_by && row.takeback_offered_by !== userId) markOpponentSeen();
          }
          setState((s) => {
            if (!s.game) return { ...s, game: row };
            const justStarted = pvpGameJustStarted(s.game, row);
            const nextGame = mergeGameRow(s.game, row);
            if (justStarted) {
              queueMicrotask(() => void refreshSilentRef.current());
            }
            return {
              ...s,
              game: nextGame,
              canJoin: false,
              canAcceptRematch:
                row.status === "waiting" &&
                row.black_user_id != null &&
                row.white_user_id === userId,
            };
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
          touchEvent();
          const old = payload.old as { ply?: number } | null;
          if (!old?.ply) return;
          setState((s) => ({
            ...s,
            moves: s.moves.filter((m) => m.ply !== old.ply),
          }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeSubscribed(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeSubscribed(false);
        }
      });

    channelRef.current = ch;

    return () => {
      void client.removeChannel(ch);
      channelRef.current = null;
      setRealtimeSubscribed(false);
    };
  }, [gameId, userId, canUseRealtime, touchEvent, markOpponentSeen]);

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
    if (state.game?.clock_mode === "correspondence") {
      const id = window.setInterval(
        () => setClockNow(nowFromServerAnchor(serverTimeAnchorRef.current)),
        60_000
      );
      return () => window.clearInterval(id);
    }
    let rafId = 0;
    const tick = () => {
      setClockNow(nowFromServerAnchor(serverTimeAnchorRef.current));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [usesMoveClock, state.game?.clock_mode]);

  const syncedClockNow = clockNow;

  const isSideToMoveTimedOut = useMemo(() => {
    if (!state.game || state.game.status !== "playing") return false;
    const stm = chessForPvpClockAuthority(state.game, state.moves).turn();
    return isPvpSideToMoveTimedOut(state.game, stm, syncedClockNow);
  }, [state.game, state.moves, syncedClockNow]);

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
    if (!gameId || !isParticipant) return;
    const g = state.game;
    if (!g || g.status !== "waiting" || g.black_user_id) return;
    const id = window.setInterval(() => void refreshSilent(), 2_500);
    return () => window.clearInterval(id);
  }, [
    gameId,
    isParticipant,
    state.game?.status,
    state.game?.black_user_id,
    refreshSilent,
  ]);

  useEffect(() => {
    if (!gameId || !isParticipant || state.game?.status !== "playing") return;
    if (state.game.clock_mode !== "timed" && state.game.clock_mode !== "correspondence") return;
    const intervalMs = state.game.clock_mode === "timed" ? 12_000 : 120_000;
    const id = window.setInterval(() => void refreshSilent(), intervalMs);
    return () => window.clearInterval(id);
  }, [gameId, isParticipant, state.game?.status, state.game?.clock_mode, refreshSilent]);

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

  const createLobby = useCallback(async (
    timePreset = "correspondence_3d",
    invitedUserId?: string
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    const data = await fetchWithAuth("/api/pvp/games", {
      method: "POST",
      body: JSON.stringify({
        timePreset,
        ...(invitedUserId ? { invitedUserId } : {}),
      }),
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
    if (!joinedGame || !joinedRole) return;

    setState((s) => {
      const nextGame = s.game ? mergeGameRow(s.game, joinedGame) : joinedGame;
      writePvpGameBootstrap({
        gameId,
        game: nextGame,
        role: joinedRole,
        moves: s.moves,
        at: Date.now(),
      });
      return {
        ...s,
        game: nextGame,
        role: joinedRole,
        canJoin: false,
        canAcceptRematch: false,
        loading: false,
        error: null,
      };
    });
  }, [gameId, fetchWithAuth]);

  const submitMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      const role = state.role;
      const game = state.game;
      if (!role || !game || game.status !== "playing") {
        throw new Error("Game is not active");
      }
      if (isPvpSideToMoveTimedOut(game, chessForPvpClockAuthority(game, state.moves).turn(), syncedClockNow)) {
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

      if (!browserOnline) {
        enqueuePendingPvpMove(gameId, validation.uci);
        setPendingUci(null);
        return;
      }

      try {
        const data = (await fetchWithAuth(
          `/api/pvp/games/${gameId}/move`,
          {
            method: "POST",
            body: JSON.stringify({ uci: validation.uci }),
          },
          { syncTime: false }
        )) as MovePostResponse;

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
    [gameId, state.role, state.game, state.moves, pendingUci, fetchWithAuth, userId, chess, refreshSilent, syncedClockNow, browserOnline]
  );

  const submitMoveRef = useRef(submitMove);
  submitMoveRef.current = submitMove;

  useEffect(() => {
    if (!browserOnline || !gameId) return;
    void replayPendingPvpMoves(gameId, async (uci) => {
      try {
        await submitMoveRef.current(uci);
        return true;
      } catch {
        return false;
      }
    });
  }, [browserOnline, gameId]);

  const resign = useCallback(async () => {
    if (!gameId) return;
    await fetchWithAuth(`/api/pvp/games/${gameId}/resign`, { method: "POST" });
    await refreshSilent();
  }, [gameId, refreshSilent, fetchWithAuth]);

  const drawAction = useCallback(
    async (action: "offer" | "accept" | "decline" | "cancel") => {
      if (!gameId || !userId) return;
      setState((s) => {
        if (!s.game) return s;
        if (action === "offer") {
          const isRenewal = s.game.draw_offered_by === userId;
          const countField =
            s.role === "white" ? "white_draw_offers_count" : "black_draw_offers_count";
          const nextGame = {
            ...s.game,
            draw_offered_by: userId,
            takeback_offered_by: null,
          } as PvpGameRow;
          if (!isRenewal && s.role) {
            nextGame[countField] = Number(s.game[countField] ?? 0) + 1;
          }
          return { ...s, game: nextGame };
        }
        if (action === "cancel" || action === "decline") {
          return { ...s, game: { ...s.game, draw_offered_by: null } };
        }
        return s;
      });
      await fetchWithAuth(`/api/pvp/games/${gameId}/draw`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refreshSilent();
    },
    [gameId, userId, refreshSilent, fetchWithAuth]
  );

  const takebackAction = useCallback(
    async (action: "offer" | "accept" | "decline" | "cancel") => {
      if (!gameId || !userId) return;
      setState((s) => {
        if (!s.game) return s;
        if (action === "offer") {
          return {
            ...s,
            game: {
              ...s.game,
              takeback_offered_by: userId,
              draw_offered_by: null,
            },
          };
        }
        if (action === "cancel" || action === "decline") {
          return { ...s, game: { ...s.game, takeback_offered_by: null } };
        }
        return s;
      });
      await fetchWithAuth(`/api/pvp/games/${gameId}/takeback`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refreshSilent();
    },
    [gameId, userId, refreshSilent, fetchWithAuth]
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
    async (swapColors = true): Promise<{ gameId: string; inviteUrl?: string; started?: boolean }> => {
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
      const rematchGame = data.game as PvpGameRow | undefined;
      const role = (data.role as Role) ?? null;
      if (rematchGame && role && rematchGame.status === "playing") {
        writePvpGameBootstrap({
          gameId: newId,
          game: rematchGame,
          role,
          moves: [],
          at: Date.now(),
        });
      }
      track("pvp_rematch_created", { from_game_id: gameId, swap_colors: swapColors });
      return {
        gameId: newId,
        inviteUrl: typeof data.inviteUrl === "string" ? data.inviteUrl : undefined,
        started: Boolean(data.started) || rematchGame?.status === "playing",
      };
    },
    [gameId, fetchWithAuth]
  );

  const canOfferTakeback = useMemo(() => {
    if (!userId || !state.role || !state.game || state.game.status !== "playing") return false;
    if (state.game.takeback_offered_by || state.game.draw_offered_by) return false;
    return canOfferPvpTakeback(userId, state.role, state.moves, chess);
  }, [userId, state.role, state.game, state.moves, chess]);

  useEffect(() => {
    if (!userId || !state.moves.length) return;
    for (let i = state.moves.length - 1; i >= 0; i--) {
      const m = state.moves[i];
      if (m.played_by && m.played_by !== userId) {
        const ts = Date.parse(m.created_at);
        if (Number.isFinite(ts)) setOpponentLastSeenAt(ts);
        break;
      }
    }
  }, [state.moves, userId]);

  const opponentUserId = useMemo(() => {
    if (!state.game || !userId || !state.game.black_user_id) return null;
    return state.game.white_user_id === userId
      ? state.game.black_user_id
      : state.game.white_user_id;
  }, [state.game, userId]);

  const presenceEnabled =
    isParticipant && state.game?.status === "playing" && Boolean(opponentUserId);
  const { opponentPresenceAt } = usePvpGamePresence(
    gameId,
    userId,
    opponentUserId,
    presenceEnabled
  );

  const mergedOpponentLastSeen = useMemo(
    () => mergeOpponentLastSeen(opponentLastSeenAt, opponentPresenceAt),
    [opponentLastSeenAt, opponentPresenceAt]
  );

  const localConnection = useMemo(
    () =>
      localConnectionFromSignals({
        online: browserOnline,
        realtimeSubscribed,
        lastEventAt,
        lastApiOkAt,
        nowMs: clockNow,
      }),
    [browserOnline, realtimeSubscribed, lastEventAt, lastApiOkAt, clockNow]
  );

  const opponentConnection = useMemo(
    () => opponentConnectionFromLastSeen(mergedOpponentLastSeen, clockNow),
    [mergedOpponentLastSeen, clockNow]
  );

  const whiteConnection = useMemo((): PvpConnectionInfo => {
    if (!state.role) return opponentConnection;
    return state.role === "white" ? localConnection : opponentConnection;
  }, [state.role, localConnection, opponentConnection]);

  const blackConnection = useMemo((): PvpConnectionInfo => {
    if (!state.role) return opponentConnection;
    return state.role === "black" ? localConnection : opponentConnection;
  }, [state.role, localConnection, opponentConnection]);

  const canCancelLobby = useMemo(() => {
    if (!userId || !state.game) return false;
    return canUserCancelWaitingPvpGame(userId, state.game);
  }, [userId, state.game]);

  return {
    ...state,
    canCancelLobby,
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
    syncedClockNow,
    serverOffsetMs,
    localConnection,
    opponentConnection,
    whiteConnection,
    blackConnection,
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
