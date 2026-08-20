"use client";

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;

export function isPostHogEnabled(): boolean {
  return Boolean(POSTHOG_KEY && typeof window !== "undefined");
}

export function initPostHog(): void {
  if (initialized || !isPostHogEnabled()) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
  });
  initialized = true;
}

export type AnalyticsEventName =
  | "signup_completed"
  | "profile_linked"
  | "game_started"
  | "game_finished"
  | "analyze_opened"
  | "review_completed"
  | "pvp_lobby_created"
  | "pvp_game_joined"
  | "pvp_move_played"
  | "pvp_game_ended"
  | "pvp_rematch_created"
  | "pvp_matchmaking_joined"
  | "pvp_matchmaking_matched"
  | "checkout_started"
  | "premium_activated"
  | "lesson_opened"
  | "lesson_completed"
  | "ascension_puzzle_complete"
  | "page_view"
  | "chessavatar_init_failed"
  | "chessavatar_nnue_failed"
  | "chessavatar_move_ok"
  | "bot_engine_fallback";

export function trackEvent(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized && isPostHogEnabled()) initPostHog();
  if (!initialized) return;

  const safe: Record<string, string | number | boolean> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined && v !== null) safe[k] = v;
    }
  }
  posthog.capture(name, safe);
}

export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized && isPostHogEnabled()) initPostHog();
  if (!initialized) return;

  const safe: Record<string, string | number | boolean> = {};
  if (traits) {
    for (const [k, v] of Object.entries(traits)) {
      if (v !== undefined && v !== null && k !== "email") safe[k] = v;
    }
  }
  posthog.identify(userId, safe);
}

export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}

export function capturePageView(path: string): void {
  trackEvent("page_view", { path });
}
