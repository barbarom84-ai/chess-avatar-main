"use client";

import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/analytics";
import type { BotEngineId, BotEngineRuntime } from "@/lib/bot-engine-preference";

export type ChessAvatarTelemetryEvent =
  | "chessavatar_init_failed"
  | "chessavatar_nnue_failed"
  | "chessavatar_move_ok"
  | "bot_engine_fallback";

export function trackChessAvatarTelemetry(
  name: ChessAvatarTelemetryEvent,
  properties?: Record<string, string | number | boolean>
): void {
  trackEvent(name, properties);

  if (name === "chessavatar_init_failed" || name === "chessavatar_nnue_failed") {
    Sentry.captureMessage(`ChessAvatar: ${name}`, {
      level: "warning",
      extra: properties,
    });
  }
}

export function trackBotEngineFallback(
  preference: BotEngineId,
  from: BotEngineRuntime,
  to: BotEngineRuntime,
  reason: string
): void {
  trackChessAvatarTelemetry("bot_engine_fallback", {
    preference,
    from,
    to,
    reason,
  });
}
