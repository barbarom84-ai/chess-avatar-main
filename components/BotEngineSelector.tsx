"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  chessAvatarClient,
  type ChessAvatarSearchStats,
} from "@/lib/chessavatar-client";
import {
  isBotEngineFallback,
  resolveBotEngine,
  shouldWarnChessAvatarWeak,
  type BotEngineContext,
  type BotEngineId,
  type BotEngineRuntime,
} from "@/lib/bot-engine-preference";
import { useBotEnginePreference } from "@/hooks/useBotEnginePreference";
import { Cpu } from "lucide-react";
import { useEffect, useState } from "react";

type BotEngineSelectorProps = {
  chessAvatarReady: boolean;
  chessAvatarPlayReady?: boolean;
  chessAvatarNnueLoading?: boolean;
  chessAvatarSearchStats?: ChessAvatarSearchStats | null;
  stockfishReady: boolean;
  lastBotEngineUsed: BotEngineRuntime | null;
  botElo?: number;
  botDifficulty?: number;
  compact?: boolean;
};

export default function BotEngineSelector({
  chessAvatarReady,
  chessAvatarPlayReady = chessAvatarReady,
  chessAvatarNnueLoading = false,
  chessAvatarSearchStats = null,
  stockfishReady,
  lastBotEngineUsed,
  botElo,
  botDifficulty,
  compact = false,
}: BotEngineSelectorProps) {
  const { t } = useLanguage();
  const [preference, setPreference] = useBotEnginePreference();
  const [chessAvatarError, setChessAvatarError] = useState<string | null>(null);
  const showDevStats =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG);

  const botCtx: BotEngineContext = { elo: botElo, difficulty: botDifficulty };

  useEffect(() => {
    const sync = () => setChessAvatarError(chessAvatarClient.error);
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, [chessAvatarReady, chessAvatarPlayReady]);

  const effective = resolveBotEngine(
    preference,
    chessAvatarReady,
    stockfishReady,
    chessAvatarPlayReady,
    botCtx
  );
  const displayEngine = lastBotEngineUsed ?? effective;
  const fallback =
    lastBotEngineUsed !== null &&
    displayEngine !== null &&
    isBotEngineFallback(
      preference,
      displayEngine,
      chessAvatarReady,
      stockfishReady,
      chessAvatarPlayReady,
      botCtx
    );
  const weakChessAvatarWarning = shouldWarnChessAvatarWeak(preference, botCtx);

  const engineLabel = (id: BotEngineRuntime | null) => {
    if (!id) return t.play.botEngine.unavailable;
    return id === "chessavatar"
      ? t.play.botEngine.chessavatar
      : t.play.botEngine.stockfish;
  };

  const readinessBadge = () => {
    if (chessAvatarError && !chessAvatarReady) {
      const simdUnsupported = chessAvatarError === "WASM_SIMD_UNSUPPORTED";
      return (
        <Badge variant="outline" className="text-[10px] border-red-700/50 text-red-300 bg-red-950/30">
          {simdUnsupported
            ? t.play.botEngine.chessAvatarSimdError
            : t.play.botEngine.chessAvatarError}
        </Badge>
      );
    }
    if (chessAvatarReady && chessAvatarNnueLoading) {
      return (
        <Badge variant="outline" className="text-[10px] border-violet-700/50 text-violet-300 bg-violet-950/30">
          {t.play.botEngine.chessAvatarNnueLoading}
        </Badge>
      );
    }
    if (chessAvatarPlayReady) {
      return (
        <Badge variant="outline" className="text-[10px] border-cyan-700/50 text-cyan-300 bg-cyan-950/30">
          {t.play.botEngine.chessAvatarReady}
        </Badge>
      );
    }
    if (preference !== "stockfish") {
      return (
        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
          {t.play.botEngine.chessAvatarLoading}
        </Badge>
      );
    }
    return null;
  };

  const devStatsBadge = () => {
    if (!showDevStats || !chessAvatarSearchStats) return null;
    const s = chessAvatarSearchStats;
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-mono border-slate-600 text-slate-400 bg-slate-900/80"
        title={t.play.botEngine.searchStatsHint}
      >
        d{s.depth} · {(s.nps / 1000).toFixed(1)}k nps · {(s.timeMs / 1000).toFixed(1)}s
      </Badge>
    );
  };

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "flex-wrap" : "flex-wrap sm:flex-nowrap"}`}
      title={t.play.botEngine.hint}
    >
      <label className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
        <Cpu className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{t.play.botEngine.label}</span>
      </label>
      <select
        value={preference}
        onChange={(e) => setPreference(e.target.value as BotEngineId)}
        className="h-7 rounded-md border border-slate-700 bg-slate-900/80 px-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        aria-label={t.play.botEngine.label}
      >
        <option value="auto">{t.play.botEngine.auto}</option>
        <option value="chessavatar">{t.play.botEngine.chessavatar}</option>
        <option value="stockfish">{t.play.botEngine.stockfish}</option>
      </select>
      {readinessBadge()}
      {devStatsBadge()}
      {weakChessAvatarWarning && (
        <Badge
          variant="outline"
          className="text-[10px] border-amber-700/50 text-amber-200 bg-amber-950/30 max-w-[220px] truncate"
          title={t.play.botEngine.chessAvatarWeakHint}
        >
          {t.play.botEngine.chessAvatarWeakShort}
        </Badge>
      )}
      <Badge
        variant="outline"
        className={`text-[10px] sm:text-xs border-slate-600 ${
          displayEngine === "chessavatar"
            ? "bg-cyan-950/40 border-cyan-600/50 text-cyan-200"
            : displayEngine === "stockfish"
              ? "bg-amber-950/40 border-amber-600/50 text-amber-200"
              : "bg-slate-900 text-slate-500"
        }`}
      >
        {lastBotEngineUsed
          ? `${t.play.botEngine.active}: ${engineLabel(displayEngine)}`
          : `${t.play.botEngine.planned}: ${engineLabel(effective)}`}
        {fallback ? ` (${t.play.botEngine.fallback})` : ""}
      </Badge>
    </div>
  );
}
