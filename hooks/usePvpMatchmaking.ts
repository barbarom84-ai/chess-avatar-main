"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isMatchmakingEligiblePreset } from "@/lib/pvp-matchmaking";
import { track } from "@/lib/track";

type MatchmakingState = {
  inQueue: boolean;
  timePreset: string | null;
  queueSize: number;
  joining: boolean;
  error: string | null;
  matchedGameId: string | null;
};

type MatchResponse = {
  matched?: boolean;
  inQueue?: boolean;
  gameId?: string;
  role?: "white" | "black";
  timePreset?: string;
  queueSize?: number;
  error?: string;
};

export function usePvpMatchmaking(userId: string | null) {
  const [state, setState] = useState<MatchmakingState>({
    inQueue: false,
    timePreset: null,
    queueSize: 0,
    joining: false,
    error: null,
    matchedGameId: null,
  });
  const accessTokenRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const json = (await res.json().catch(() => ({}))) as MatchResponse & { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? res.statusText);
    }
    return json;
  }, []);

  const applyPollResult = useCallback((data: MatchResponse): string | null => {
    if (data.matched && data.gameId) {
      setState((s) => ({
        ...s,
        inQueue: false,
        timePreset: null,
        queueSize: 0,
        joining: false,
        error: null,
        matchedGameId: data.gameId ?? null,
      }));
      track("pvp_matchmaking_matched", { game_id: data.gameId, role: data.role ?? "" });
      return data.gameId;
    }
    if (data.inQueue) {
      setState((s) => ({
        ...s,
        inQueue: true,
        timePreset: data.timePreset ?? s.timePreset,
        queueSize: data.queueSize ?? s.queueSize,
        joining: false,
        error: null,
      }));
    } else {
      setState((s) => ({
        ...s,
        inQueue: false,
        timePreset: null,
        queueSize: 0,
        joining: false,
      }));
    }
    return null;
  }, []);

  const pollOnce = useCallback(async (): Promise<string | null> => {
    try {
      const data = await fetchWithAuth("/api/pvp/matchmaking");
      return applyPollResult(data);
    } catch {
      return null;
    }
  }, [fetchWithAuth, applyPollResult]);

  useEffect(() => {
    if (!userId || !state.inQueue) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    void pollOnce();
    pollRef.current = setInterval(() => {
      void pollOnce();
    }, 800);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [userId, state.inQueue, pollOnce]);

  useEffect(() => {
    if (!userId) {
      setState({
        inQueue: false,
        timePreset: null,
        queueSize: 0,
        joining: false,
        error: null,
        matchedGameId: null,
      });
    }
  }, [userId]);

  const joinQueue = useCallback(
    async (timePreset: string): Promise<string | null> => {
      if (!isMatchmakingEligiblePreset(timePreset)) {
        throw new Error("Unsupported time control");
      }
      setState((s) => ({ ...s, joining: true, error: null }));
      try {
        const data = await fetchWithAuth("/api/pvp/matchmaking", {
          method: "POST",
          body: JSON.stringify({ timePreset }),
        });
        track("pvp_matchmaking_joined", { time_preset: timePreset });
        return applyPollResult(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Matchmaking failed";
        setState((s) => ({ ...s, joining: false, error: msg }));
        throw e;
      }
    },
    [fetchWithAuth, applyPollResult]
  );

  const leaveQueue = useCallback(async () => {
    if (!userId) return;
    try {
      await fetchWithAuth("/api/pvp/matchmaking", { method: "DELETE" });
    } finally {
      setState({
        inQueue: false,
        timePreset: null,
        queueSize: 0,
        joining: false,
        error: null,
        matchedGameId: null,
      });
    }
  }, [userId, fetchWithAuth]);

  const clearMatched = useCallback(() => {
    setState((s) => ({ ...s, matchedGameId: null }));
  }, []);

  return {
    ...state,
    joinQueue,
    leaveQueue,
    pollOnce,
    clearMatched,
    canQuickPlay: (preset: string) => isMatchmakingEligiblePreset(preset),
  };
}
