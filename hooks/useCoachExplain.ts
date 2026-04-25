"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReviewedMove } from "@/lib/game-review";

export type CoachStatus = "idle" | "loading" | "ready" | "error";

export type CoachErrorCode =
  | "NOT_AUTHENTICATED"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "OPENAI_ERROR"
  | "OPENAI_KEY_MISSING"
  | "SUPABASE_NOT_CONFIGURED"
  | "NETWORK"
  | "INVALID_BODY"
  | "UNKNOWN";

export interface CoachState {
  status: CoachStatus;
  explanation: string | null;
  cached: boolean;
  /** For free users: null while unknown, otherwise remaining quota for the day. */
  remaining: number | null;
  limit: number | null;
  error: CoachErrorCode | null;
  /** Extra payload returned with QUOTA_EXCEEDED. */
  used?: number;
  /** Optional human-readable detail (e.g. OpenAI error message). */
  detail?: string;
  /** Optional warning when the route succeeded but a degraded path was used. */
  warning?: string;
}

export interface CoachExplainArgs {
  move: ReviewedMove;
  fenBefore: string;
  lang: "fr" | "en";
  moveNumber?: number;
}

interface ExplainPayload {
  fenBefore: string;
  uciPlayed: string;
  uciBest: string;
  cpl: number;
  classification: string;
  sideToMove: "white" | "black";
  lang: "fr" | "en";
  moveNumber?: number;
  sanPlayed?: string;
  sanBest?: string;
}

const INITIAL_STATE: CoachState = {
  status: "idle",
  explanation: null,
  cached: false,
  remaining: null,
  limit: null,
  error: null,
};

/**
 * useCoachExplain — fetches a single LLM explanation per call. Each `explain()`
 * call is its own request; the most recent one wins (older requests are
 * dropped on the floor via an AbortController).
 */
export function useCoachExplain() {
  const [state, setState] = useState<CoachState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort in-flight requests on unmount.
    return () => abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const explain = useCallback(async (args: CoachExplainArgs): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, status: "loading" });

    if (!supabase) {
      setState({
        ...INITIAL_STATE,
        status: "error",
        error: "SUPABASE_NOT_CONFIGURED",
      });
      return;
    }

    let token: string | null = null;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token ?? null;
    } catch {
      // fall through — handled below
    }
    if (!token) {
      setState({ ...INITIAL_STATE, status: "error", error: "NOT_AUTHENTICATED" });
      return;
    }

    const payload: ExplainPayload = {
      fenBefore: args.fenBefore,
      uciPlayed: args.move.uci,
      uciBest: args.move.bestMove,
      cpl: args.move.cpl,
      classification: args.move.classification,
      sideToMove: args.move.sideToMove,
      lang: args.lang,
      moveNumber: args.moveNumber,
      sanPlayed: args.move.san,
      sanBest: args.move.bestSan || undefined,
    };

    try {
      const res = await fetch("/api/coach/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      // Per project rule: null-check API responses before parsing.
      const json = (await res.json().catch(() => null)) as
        | {
            explanation?: unknown;
            cached?: unknown;
            remaining?: unknown;
            limit?: unknown;
            error?: unknown;
            used?: unknown;
            detail?: unknown;
            warning?: unknown;
          }
        | null;
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        const code: CoachErrorCode =
          (typeof json?.error === "string"
            ? (json.error as CoachErrorCode)
            : null) ?? "UNKNOWN";
        setState({
          status: "error",
          explanation: null,
          cached: false,
          remaining: typeof json?.remaining === "number" ? json.remaining : null,
          limit: typeof json?.limit === "number" ? json.limit : null,
          error: code,
          used: typeof json?.used === "number" ? json.used : undefined,
          detail: typeof json?.detail === "string" ? json.detail : undefined,
        });
        return;
      }

      if (typeof json.explanation !== "string") {
        setState({ ...INITIAL_STATE, status: "error", error: "OPENAI_ERROR" });
        return;
      }

      setState({
        status: "ready",
        explanation: json.explanation,
        cached: Boolean(json.cached),
        remaining: typeof json.remaining === "number" ? json.remaining : null,
        limit: typeof json.limit === "number" ? json.limit : null,
        error: null,
        warning: typeof json.warning === "string" ? json.warning : undefined,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Coach fetch error:", err);
      setState({ ...INITIAL_STATE, status: "error", error: "NETWORK" });
    }
  }, []);

  return { ...state, explain, reset };
}
