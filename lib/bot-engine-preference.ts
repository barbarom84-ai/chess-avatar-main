export type BotEngineId = "chessavatar" | "stockfish" | "auto";
export type BotEngineRuntime = "chessavatar" | "stockfish";

export type BotEngineContext = {
  elo?: number;
  difficulty?: number;
};

export const BOT_ENGINE_STORAGE_KEY = "chessavatar.botEngine";

/** Elo threshold above which Stockfish is preferred in Auto mode. */
export const MASTER_BOT_ELO = 2600;

const CHANGE_EVENT = "chessavatar-bot-engine-change";

export function getBotEnginePreference(): BotEngineId {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(BOT_ENGINE_STORAGE_KEY);
  if (stored === "chessavatar" || stored === "stockfish" || stored === "auto") {
    return stored;
  }
  return "auto";
}

export function setBotEnginePreference(value: BotEngineId): void {
  localStorage.setItem(BOT_ENGINE_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
}

/** Apply remote value without re-syncing to server. */
export function applyBotEnginePreferenceFromServer(value: BotEngineId): void {
  if (typeof window === "undefined") return;
  const current = getBotEnginePreference();
  if (current === value) return;
  localStorage.setItem(BOT_ENGINE_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
}

export function subscribeBotEnginePreference(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function isMasterBot(ctx?: BotEngineContext): boolean {
  if (!ctx) return false;
  return (ctx.elo ?? 0) >= MASTER_BOT_ELO || (ctx.difficulty ?? 0) >= 5;
}

/** Which engine will play bot moves given preference and worker readiness. */
export function resolveBotEngine(
  preference: BotEngineId,
  chessAvatarReady: boolean,
  stockfishReady: boolean,
  chessAvatarPlayReady = chessAvatarReady,
  ctx?: BotEngineContext,
  chessAvatarAllowed = true
): BotEngineRuntime | null {
  const master = isMasterBot(ctx);
  const caPlayReady = chessAvatarAllowed && chessAvatarPlayReady;
  const caReady = chessAvatarAllowed && chessAvatarReady;

  if (preference === "chessavatar") {
    if (caPlayReady) return "chessavatar";
    if (stockfishReady) return "stockfish";
    return null;
  }
  if (preference === "stockfish") {
    if (stockfishReady) return "stockfish";
    if (caPlayReady) return "chessavatar";
    return null;
  }

  // Auto: master-level bots use Stockfish (WASM ChessAvatar ~d9–12 is far below 2600+ Elo).
  if (master && stockfishReady) return "stockfish";
  if (caPlayReady) return "chessavatar";
  if (stockfishReady) return "stockfish";
  return null;
}

export function isBotEngineFallback(
  preference: BotEngineId,
  runtime: BotEngineRuntime,
  chessAvatarReady: boolean,
  stockfishReady: boolean,
  chessAvatarPlayReady = chessAvatarReady,
  ctx?: BotEngineContext,
  chessAvatarAllowed = true
): boolean {
  const master = isMasterBot(ctx);
  const caPlayReady = chessAvatarAllowed && chessAvatarPlayReady;
  const primary =
    preference === "auto"
      ? master && stockfishReady
        ? "stockfish"
        : caPlayReady
          ? "chessavatar"
          : "stockfish"
      : preference === "chessavatar" && !chessAvatarAllowed
        ? "stockfish"
        : preference;
  return primary !== runtime;
}

export function shouldWarnChessAvatarWeak(
  preference: BotEngineId,
  ctx?: BotEngineContext
): boolean {
  return preference === "chessavatar" && isMasterBot(ctx);
}
