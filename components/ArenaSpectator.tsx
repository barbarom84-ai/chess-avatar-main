"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useStockfish } from "@/hooks/useStockfish";
import type { EngineConfig } from "@/lib/analysis";
import { getSavedConfigs, getRecentConfigs } from "@/lib/storage";
import { normalizeEnginePlatform } from "@/lib/normalize-engine-platform";
import { getFilteredProfiles } from "@/lib/supabase-storage";
import { saveArenaMatchToCloud } from "@/lib/arena-cloud-save";
import { prepareArenaEngineConfig } from "@/lib/arena-forced-opening";
import {
  getArenaMoveDisplayDelayMs,
  getArenaPhase,
  getArenaThinkBudgetMs,
  getCadenceDepthCap,
  getSingleLegalMoveUci,
  isArenaTheoreticalOpening,
  sleepArenaThinkRemainder,
} from "@/lib/arena-move-timing";
import {
  cadenceFromPreset,
  resolveArenaTimePreset,
} from "@/lib/arena-time-controls";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import EvaluationBar from "@/components/EvaluationBar";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import {
  buildAvatarCardModel,
  minimalPersonaStatsFromConfig,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { generateAIAnalysis } from "@/lib/ai-analysis";
import { derivePlayingStyle } from "@/lib/avatar-card-model";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Search,
  CopyMinus,
  Globe,
  Loader2,
} from "lucide-react";

const ARENA_STORAGE_PLATFORM = "chess-arena.platform";
const ARENA_STORAGE_DEDUPE = "chess-arena.dedupe";
const ARENA_STORAGE_SAVE_CLOUD = "chess-arena.saveCloud";
const MAX_PICKER_ROWS = 36;

type ProfilePlatformFilter = "all" | "lichess" | "chesscom";

import type { ProfileOption } from "@/lib/arena-types";

function replayUci(history: string[]): Chess {
  const g = new Chess();
  for (const u of history) {
    if (!u || u.length < 4) continue;
    const from = u.slice(0, 2);
    const to = u.slice(2, 4);
    const promotion =
      u.length > 4 ? (u[4] as "q" | "r" | "b" | "n") : undefined;
    const ok = g.move(
      promotion ? { from, to, promotion } : { from, to }
    );
    if (!ok) break;
  }
  return g;
}

function applyArenaCaps(c: EngineConfig, depthCap: number): EngineConfig {
  return {
    ...c,
    depth: Math.min(Math.max(5, c.depth), depthCap),
    timeControl: Math.min(Math.max(100, c.timeControl), 2000),
    threads: Math.min(Math.max(2, c.threads), 4),
  };
}

function profileIdentityKey(config: EngineConfig): string {
  const name = (config.name || "").trim().toLowerCase();
  return `${name}|${normalizeEnginePlatform(config)}`;
}

function buildRawOptions(
  savedLabel: string,
  recentLabel: string
): ProfileOption[] {
  const saved = getSavedConfigs();
  const recent = getRecentConfigs();
  const out: ProfileOption[] = [];
  /** Évite de masquer Lichess si un Bot_X Chess.com est déjà sauvé (même nom). */
  const seenIdentity = new Set<string>();
  for (const s of saved) {
    seenIdentity.add(profileIdentityKey(s.config));
    const labelBase = s.customName || s.config.name;
    out.push({
      key: `saved:${s.id}`,
      label: `${labelBase} (${savedLabel})`,
      config: s.config,
      savedAt: s.savedAt,
    });
  }
  for (const r of recent) {
    if (seenIdentity.has(profileIdentityKey(r.config))) continue;
    seenIdentity.add(profileIdentityKey(r.config));
    out.push({
      key: `recent:${r.id}`,
      label: `${r.config.name} (${recentLabel})`,
      config: r.config,
      savedAt: r.savedAt,
    });
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}

async function fetchCloudArenaProfileOptions(
  cloudLabel: string
): Promise<ProfileOption[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const rows = await getFilteredProfiles(
      "public",
      "date",
      80,
      undefined,
      { platform: "all", dedupeByUsernamePlatform: true }
    );
    return rows.map((p) => ({
      key: `cloud:${p.id}`,
      label: `${p.username} (${cloudLabel})`,
      config: {
        ...p.config,
        platform: p.platform,
      },
      savedAt: new Date(p.updated_at || p.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}

function mergeLocalAndCloud(
  local: ProfileOption[],
  cloud: ProfileOption[]
): ProfileOption[] {
  const seen = new Set(local.map((o) => profileIdentityKey(o.config)));
  const out = [...local];
  for (const c of cloud) {
    const ik = profileIdentityKey(c.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(c);
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}

function mergeFeaturedFirst(
  featured: ProfileOption[],
  rest: ProfileOption[]
): ProfileOption[] {
  const seen = new Set<string>();
  const out: ProfileOption[] = [];
  for (const f of featured) {
    const ik = profileIdentityKey(f.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(f);
  }
  for (const r of rest) {
    const ik = profileIdentityKey(r.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(r);
  }
  return out;
}

async function fetchFeaturedArenaOptions(
  featuredLabel: string
): Promise<ProfileOption[]> {
  try {
    const res = await fetch("/api/arena/featured", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      options?: {
        key: string;
        label: string;
        config: EngineConfig;
        savedAt: number;
        platform: "lichess" | "chesscom";
      }[];
    };
    return (data.options ?? []).map((o) => ({
      key: o.key,
      label: o.label || `${o.config.name} (${featuredLabel})`,
      config: o.config,
      savedAt: o.savedAt,
    }));
  } catch {
    return [];
  }
}

function filterByPlatform(
  options: ProfileOption[],
  platform: ProfilePlatformFilter
): ProfileOption[] {
  if (platform === "all") return options;
  return options.filter(
    (o) => normalizeEnginePlatform(o.config) === platform
  );
}

/** Une entrée par pseudo + plateforme (sauvegarde la plus récente). */
function dedupeByIdentity(options: ProfileOption[]): ProfileOption[] {
  const map = new Map<string, ProfileOption>();
  for (const o of options) {
    const plat = normalizeEnginePlatform(o.config);
    const key = `${(o.config.name || "").trim().toLowerCase()}|${plat}`;
    const prev = map.get(key);
    if (!prev || o.savedAt >= prev.savedAt) map.set(key, o);
  }
  return Array.from(map.values()).sort((a, b) => b.savedAt - a.savedAt);
}

function filterBySearch(options: ProfileOption[], q: string): ProfileOption[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return options;
  return options.filter((o) => {
    const name = (o.config.name || "").toLowerCase();
    return (
      o.label.toLowerCase().includes(needle) || name.includes(needle)
    );
  });
}

/** Stockfish `cp` est du point de vue du camp qui a le trait — conversion POV blancs. */
function stmEvalToWhitePov(fen: string, evalFromEngine: number): number {
  try {
    return new Chess(fen).turn() === "w" ? evalFromEngine : -evalFromEngine;
  } catch {
    return evalFromEngine;
  }
}

type ArenaOutcome = {
  result: "win" | "loss" | "draw";
  resultType: string;
  resultMessage: string;
  pgnResult: "1-0" | "0-1" | "1/2-1/2";
};

function classifyArenaOutcome(
  game: Chess,
  maxMovesReached: boolean,
  lang: "fr" | "en"
): ArenaOutcome {
  if (maxMovesReached && !game.isGameOver()) {
    return {
      result: "draw",
      resultType: "arena_move_limit",
      resultMessage:
        lang === "fr"
          ? "Partie arrêtée : limite de coups atteinte."
          : "Game stopped: move limit reached.",
      pgnResult: "1/2-1/2",
    };
  }
  if (game.isCheckmate()) {
    const loser = game.turn();
    if (loser === "w") {
      return {
        result: "loss",
        resultType: "arena_black_wins",
        resultMessage:
          lang === "fr"
            ? "Échec et mat — victoire des noirs."
            : "Checkmate — Black wins.",
        pgnResult: "0-1",
      };
    }
    return {
      result: "win",
      resultType: "arena_white_wins",
      resultMessage:
        lang === "fr"
          ? "Échec et mat — victoire des blancs."
          : "Checkmate — White wins.",
      pgnResult: "1-0",
    };
  }
  if (game.isStalemate()) {
    return {
      result: "draw",
      resultType: "arena_draw_stalemate",
      resultMessage: lang === "fr" ? "Pat." : "Stalemate.",
      pgnResult: "1/2-1/2",
    };
  }
  if (game.isDraw()) {
    let resultType = "arena_draw_generic";
    let msg = lang === "fr" ? "Partie nulle." : "Draw.";
    if (game.isInsufficientMaterial()) {
      resultType = "arena_draw_insufficient";
      msg =
        lang === "fr"
          ? "Nulle — matériel insuffisant."
          : "Draw — insufficient material.";
    } else if (game.isThreefoldRepetition()) {
      resultType = "arena_draw_threefold";
      msg =
        lang === "fr"
          ? "Nulle — triple répétition."
          : "Draw — threefold repetition.";
    } else if (game.isDrawByFiftyMoves()) {
      resultType = "arena_draw_fifty";
      msg =
        lang === "fr"
          ? "Nulle — règle des 50 coups."
          : "Draw — fifty-move rule.";
    }
    return {
      result: "draw",
      resultType,
      resultMessage: msg,
      pgnResult: "1/2-1/2",
    };
  }
  return {
    result: "draw",
    resultType: "arena_draw_generic",
    resultMessage: lang === "fr" ? "Partie terminée." : "Game over.",
    pgnResult: "1/2-1/2",
  };
}

function optionToCardModel(
  option: ProfileOption,
  labels: ReturnType<typeof getAvatarCardLabels>
) {
  const stats =
    option.stats && (option.stats.gameCount ?? 0) > 0
      ? option.stats
      : minimalPersonaStatsFromConfig(
          option.config,
          option.config.name || option.label
        );
  const playingStyle = derivePlayingStyle(option.config);
  const analysis = generateAIAnalysis(playingStyle, stats, stats.gameCount);
  return buildAvatarCardModel({
    stats,
    config: option.config,
    analysis,
    labels,
  });
}

function ArenaProfilePicker({
  sideLabel,
  selectedKey,
  pool,
  searchQuery,
  onSearchChange,
  onSelectKey,
  searchPlaceholder,
  noMatches,
  listHint,
  cardsHint,
}: {
  sideLabel: string;
  selectedKey: string;
  pool: ProfileOption[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectKey: (key: string) => void;
  searchPlaceholder: string;
  noMatches: string;
  listHint: string;
  cardsHint: string;
}) {
  const { t } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const visible = useMemo(() => {
    return filterBySearch(pool, searchQuery).slice(0, MAX_PICKER_ROWS);
  }, [pool, searchQuery]);

  return (
    <div className="space-y-2 min-w-0">
      <Label className="text-xs font-semibold text-cyan-300/90 uppercase tracking-wide">
        {sideLabel}
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 bg-slate-950 border-slate-700 text-slate-100 text-sm"
          autoComplete="off"
        />
      </div>
      <p className="text-[10px] text-slate-500">
        {listHint} {cardsHint}
      </p>
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-700/80 bg-slate-950/80 p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            {noMatches}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {visible.map((o) => {
              const model = optionToCardModel(o, labels);
              const selected = selectedKey === o.key;
              return (
                <div
                  key={o.key}
                  className={
                    selected
                      ? "ring-2 ring-cyan-400 rounded-xl"
                      : "rounded-xl opacity-90 hover:opacity-100"
                  }
                >
                  <AvatarTradingCard
                    model={model}
                    labels={labels}
                    size="md"
                    flippable={selected}
                    interactive
                    className="w-full max-w-none cursor-pointer"
                    onClick={() => onSelectKey(o.key)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ArenaMatchupBanner({
  whiteOption,
  blackOption,
  vsLabel,
}: {
  whiteOption: ProfileOption | undefined;
  blackOption: ProfileOption | undefined;
  vsLabel: string;
}) {
  const { t } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  if (!whiteOption && !blackOption) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 px-2 rounded-xl border border-amber-500/25 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950">
      {whiteOption ? (
        <AvatarTradingCard
          model={optionToCardModel(whiteOption, labels)}
          labels={labels}
          size="md"
          flippable
          className="w-full max-w-[220px]"
        />
      ) : (
        <div className="w-[220px] h-[320px] rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
          —
        </div>
      )}
      <span className="text-2xl font-black text-amber-400/90 font-serif shrink-0 px-2">
        {vsLabel}
      </span>
      {blackOption ? (
        <AvatarTradingCard
          model={optionToCardModel(blackOption, labels)}
          labels={labels}
          size="md"
          flippable
          className="w-full max-w-[220px]"
        />
      ) : (
        <div className="w-[220px] h-[320px] rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
          —
        </div>
      )}
    </div>
  );
}

export default function ArenaSpectator({
  embedded = false,
  forcedOpeningId = null,
  timePresetId,
}: {
  embedded?: boolean;
  forcedOpeningId?: string | null;
  timePresetId: string;
}) {
  const { t, lang } = useLanguage();
  const { userId } = usePremium();
  const {
    isReady,
    getBestMove,
    stopThinking,
    getPositionEvaluation,
  } = useStockfish();
  const [rawOptions, setRawOptions] = useState<ProfileOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [whiteKey, setWhiteKey] = useState("");
  const [blackKey, setBlackKey] = useState("");
  const [whiteSearch, setWhiteSearch] = useState("");
  const [blackSearch, setBlackSearch] = useState("");
  const [platformFilter, setPlatformFilter] =
    useState<ProfilePlatformFilter>("all");
  const [dedupeIdentity, setDedupeIdentity] = useState(true);
  const [arenaDepth, setArenaDepth] = useState(10);
  const [maxPlies, setMaxPlies] = useState(120);
  const timePreset = useMemo(
    () => resolveArenaTimePreset(timePresetId),
    [timePresetId]
  );
  const cadence = useMemo(() => cadenceFromPreset(timePreset), [timePreset]);
  const effectiveDepthCap = useMemo(
    () => getCadenceDepthCap(cadence, arenaDepth),
    [cadence, arenaDepth]
  );
  const [fen, setFen] = useState(() => new Chess().fen());
  const historyRef = useRef<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null
  );
  const [autoPlay, setAutoPlay] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const runningRef = useRef(false);
  const arenaClockStartRef = useRef<number | null>(null);
  const arenaSavedRef = useRef(false);
  const evalSeqRef = useRef(0);
  const lastMoveDelayRef = useRef(400);
  const [saveCloudGames, setSaveCloudGames] = useState(false);
  const [barEval, setBarEval] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const p = localStorage.getItem(ARENA_STORAGE_PLATFORM);
      if (p === "lichess" || p === "chesscom" || p === "all") {
        setPlatformFilter(p);
      }
      const d = localStorage.getItem(ARENA_STORAGE_DEDUPE);
      if (d === "1") setDedupeIdentity(true);
      else if (d === "0") setDedupeIdentity(false);
      const sc = localStorage.getItem(ARENA_STORAGE_SAVE_CLOUD);
      if (sc === "1") setSaveCloudGames(true);
      else if (sc === "0") setSaveCloudGames(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        ARENA_STORAGE_SAVE_CLOUD,
        saveCloudGames ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [saveCloudGames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ARENA_STORAGE_PLATFORM, platformFilter);
  }, [platformFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ARENA_STORAGE_DEDUPE, dedupeIdentity ? "1" : "0");
  }, [dedupeIdentity]);

  const loadOptions = useCallback(async () => {
    setListLoading(true);
    try {
      const { loadArenaProfilePool } = await import("@/lib/arena-profile-pool");
      setRawOptions(
        await loadArenaProfilePool({
          savedProfiles: t.arenaPage.savedProfiles,
          recentProfiles: t.arenaPage.recentProfiles,
          cloudLibrary: t.arenaPage.cloudLibrary,
          featuredChampions: t.arenaPage.featuredChampions,
        })
      );
    } finally {
      setListLoading(false);
    }
  }, [
    t.arenaPage.savedProfiles,
    t.arenaPage.recentProfiles,
    t.arenaPage.cloudLibrary,
    t.arenaPage.featuredChampions,
  ]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const poolOptions = useMemo(() => {
    let rows = filterByPlatform(rawOptions, platformFilter);
    if (dedupeIdentity) rows = dedupeByIdentity(rows);
    return rows;
  }, [rawOptions, platformFilter, dedupeIdentity]);

  useEffect(() => {
    if (poolOptions.length === 0) return;
    const nextW =
      whiteKey && poolOptions.some((o) => o.key === whiteKey)
        ? whiteKey
        : poolOptions[0].key;
    let nextB =
      blackKey && poolOptions.some((o) => o.key === blackKey)
        ? blackKey
        : poolOptions[1]?.key ?? poolOptions[0].key;
    if (nextB === nextW) {
      nextB =
        poolOptions.find((o) => o.key !== nextW)?.key ?? nextW;
    }
    if (nextW !== whiteKey) setWhiteKey(nextW);
    if (nextB !== blackKey) setBlackKey(nextB);
  }, [poolOptions, whiteKey, blackKey]);

  const whiteConfig = poolOptions.find((o) => o.key === whiteKey)?.config;
  const blackConfig = poolOptions.find((o) => o.key === blackKey)?.config;

  const resetBoard = useCallback(() => {
    runningRef.current = false;
    setAutoPlay(false);
    stopThinking();
    historyRef.current = [];
    arenaClockStartRef.current = null;
    arenaSavedRef.current = false;
    setMoveCount(0);
    setLastMove(null);
    setFen(new Chess().fen());
    setStatusNote(null);
  }, [stopThinking]);

  useEffect(() => {
    if (!isReady) return;
    const seq = ++evalSeqRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getPositionEvaluation(fen, 10);
        if (cancelled || seq !== evalSeqRef.current) return;
        setBarEval(stmEvalToWhitePov(fen, raw));
      } catch {
        if (!cancelled && seq === evalSeqRef.current) setBarEval(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, isReady, getPositionEvaluation]);

  const trySaveArenaCloud = useCallback(
    async (game: Chess, uciHist: string[], outcome: ArenaOutcome) => {
      if (!whiteConfig || !blackConfig || !userId) return;
      try {
        const started = arenaClockStartRef.current;
        const durationSeconds =
          started != null
            ? Math.max(0, Math.round((Date.now() - started) / 1000))
            : undefined;
        await saveArenaMatchToCloud({
          whiteConfig,
          blackConfig,
          uciHist,
          outcome: {
            ...outcome,
            winner:
              outcome.pgnResult === "1-0"
                ? "white"
                : outcome.pgnResult === "0-1"
                  ? "black"
                  : "draw",
          },
          durationSeconds,
        });
        toast.success(t.arenaPage.cloudSavedToast);
      } catch (e) {
        console.error(e);
        arenaSavedRef.current = false;
        toast.error(t.arenaPage.cloudSaveErrorToast);
      }
    },
    [
      whiteConfig,
      blackConfig,
      userId,
      t.arenaPage.cloudSavedToast,
      t.arenaPage.cloudSaveErrorToast,
    ]
  );

  const gameEndMessage = useCallback(
    (game: Chess) => {
      if (game.isCheckmate()) return t.arenaPage.resultCheckmate;
      if (game.isStalemate()) return t.arenaPage.resultStalemate;
      if (game.isDraw()) return t.arenaPage.resultDraw;
      return t.arenaPage.gameOver;
    },
    [t.arenaPage]
  );

  const playStep = useCallback(async (): Promise<boolean> => {
    if (!isReady || !whiteConfig || !blackConfig) return true;
    if (whiteKey === blackKey) {
      setStatusNote(t.arenaPage.pickBoth);
      return true;
    }

    const hist = historyRef.current;
    const game = replayUci(hist);
    if (game.isGameOver()) {
      setStatusNote(gameEndMessage(game));
      return true;
    }
    if (hist.length >= maxPlies) {
      setStatusNote(t.arenaPage.gameOver);
      const gLimit = replayUci(hist);
      if (
        saveCloudGames &&
        userId &&
        hist.length > 0 &&
        !arenaSavedRef.current
      ) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          gLimit,
          [...hist],
          classifyArenaOutcome(gLimit, true, lang)
        );
      }
      return true;
    }

    const stm = game.turn();
    const base = stm === "w" ? whiteConfig : blackConfig;
    const cfg = prepareArenaEngineConfig(base, {
      depthCap: effectiveDepthCap,
      ply: hist.length,
      game,
      forcedOpeningId,
      cadence,
      historyUci: hist,
    });
    const phase = getArenaPhase(hist.length, game);
    const singleUci = getSingleLegalMoveUci(game);
    let uci: string;

    if (singleUci) {
      uci = singleUci;
    } else {
      const thinkBudgetMs = getArenaThinkBudgetMs(
        isArenaTheoreticalOpening(cfg, hist.length, hist)
      );
      const thinkStartedAt = Date.now();
      const playerColor = stm === "w" ? "black" : "white";

      uci = await new Promise<string>((resolve) => {
        getBestMove(game.fen(), cfg, (m) => resolve(m || ""), {
          moveHistoryUci: hist,
          playerColor,
        });
      });

      await sleepArenaThinkRemainder(thinkStartedAt, thinkBudgetMs);
    }

    lastMoveDelayRef.current = getArenaMoveDisplayDelayMs(
      phase,
      cfg.timeControl,
      "spectator"
    );

    if (!uci || uci.length < 4) {
      setStatusNote(t.arenaPage.gameOver);
      return true;
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion =
      uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
    const next = replayUci(hist);
    const ok = next.move(
      promotion ? { from, to, promotion } : { from, to }
    );
    if (!ok) {
      setStatusNote(t.arenaPage.gameOver);
      return true;
    }

    const wasEmpty = hist.length === 0;
    historyRef.current = [...hist, uci];
    if (wasEmpty) arenaClockStartRef.current = Date.now();

    setFen(next.fen());
    setLastMove({ from, to });
    setMoveCount(historyRef.current.length);
    setStatusNote(null);

    const snapshot = [...historyRef.current];

    if (next.isGameOver()) {
      setStatusNote(gameEndMessage(next));
      if (
        saveCloudGames &&
        userId &&
        snapshot.length > 0 &&
        !arenaSavedRef.current
      ) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          next,
          snapshot,
          classifyArenaOutcome(next, false, lang)
        );
      }
      return true;
    }
    if (snapshot.length >= maxPlies) {
      setStatusNote(t.arenaPage.gameOver);
      if (saveCloudGames && userId && !arenaSavedRef.current) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          next,
          snapshot,
          classifyArenaOutcome(next, true, lang)
        );
      }
      return true;
    }
    return false;
  }, [
    isReady,
    whiteConfig,
    blackConfig,
    whiteKey,
    blackKey,
    arenaDepth,
    effectiveDepthCap,
    cadence,
    maxPlies,
    getBestMove,
    t.arenaPage,
    gameEndMessage,
    saveCloudGames,
    userId,
    trySaveArenaCloud,
    lang,
    forcedOpeningId,
  ]);

  const handleStartAuto = async () => {
    if (runningRef.current || !isReady) return;
    runningRef.current = true;
    setAutoPlay(true);
    try {
      while (runningRef.current) {
        const done = await playStep();
        if (done) break;
        await new Promise((r) =>
          setTimeout(r, lastMoveDelayRef.current)
        );
      }
    } finally {
      runningRef.current = false;
      setAutoPlay(false);
    }
  };

  const handlePause = () => {
    runningRef.current = false;
    setAutoPlay(false);
    stopThinking();
  };

  const handleOneMove = async () => {
    await playStep();
  };

  const needsProfiles = !listLoading && rawOptions.length < 2;

  return (
    <div
      className={
        embedded ? "space-y-6" : "max-w-6xl mx-auto space-y-6 p-4 md:p-6"
      }
    >
      {!embedded && (
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-cyan-400">{t.pages.arena.title}</h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            {t.pages.arena.subtitle}
          </p>
        </div>
      )}

      {listLoading && rawOptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <span className="text-sm">{t.arenaPage.loadingProfiles}</span>
          <span className="text-xs text-slate-500 max-w-sm text-center">
            {t.arenaPage.featuredLoading}
          </span>
        </div>
      ) : needsProfiles ? (
        <Card className="bg-slate-900/70 border-amber-500/30">
          <CardContent className="py-6 text-center text-slate-300 text-sm space-y-3">
            <p>
              {lang === "fr"
                ? "Il faut au moins deux profils (locaux ou publics dans la bibliothèque cloud) pour lancer l’arène."
                : "You need at least two profiles (local or public in the cloud library) to run the arena."}
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              {t.arenaPage.emptyHint}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-slate-900/60 border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-lg">
                {t.arenaPage.selectWhite} / {t.arenaPage.selectBlack}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4 pb-2 border-b border-slate-800">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {t.library.platformFilter}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant={platformFilter === "all" ? "default" : "outline"}
                      onClick={() => setPlatformFilter("all")}
                      className={
                        platformFilter === "all"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformAll}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        platformFilter === "lichess" ? "default" : "outline"
                      }
                      onClick={() => setPlatformFilter("lichess")}
                      className={
                        platformFilter === "lichess"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformLichess}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        platformFilter === "chesscom" ? "default" : "outline"
                      }
                      onClick={() => setPlatformFilter("chesscom")}
                      className={
                        platformFilter === "chesscom"
                          ? "bg-green-700 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformChesscom}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2 max-w-md">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="arena-dedupe"
                      className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer"
                    >
                      <CopyMinus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      {t.library.dedupeTitle}
                    </Label>
                    <Switch
                      id="arena-dedupe"
                      checked={dedupeIdentity}
                      onCheckedChange={setDedupeIdentity}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    {t.library.dedupeHint}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ArenaProfilePicker
                  sideLabel={t.arenaPage.whiteSide}
                  selectedKey={whiteKey}
                  pool={poolOptions}
                  searchQuery={whiteSearch}
                  onSearchChange={setWhiteSearch}
                  onSelectKey={setWhiteKey}
                  searchPlaceholder={t.arenaPage.pickSearchPlaceholder}
                  noMatches={t.arenaPage.pickNoMatches}
                  listHint={t.arenaPage.pickListHint}
                  cardsHint={t.arenaPage.pickCardsHint}
                />
                <ArenaProfilePicker
                  sideLabel={t.arenaPage.blackSide}
                  selectedKey={blackKey}
                  pool={poolOptions}
                  searchQuery={blackSearch}
                  onSearchChange={setBlackSearch}
                  onSelectKey={setBlackKey}
                  searchPlaceholder={t.arenaPage.pickSearchPlaceholder}
                  noMatches={t.arenaPage.pickNoMatches}
                  listHint={t.arenaPage.pickListHint}
                  cardsHint={t.arenaPage.pickCardsHint}
                />
              </div>

              <ArenaMatchupBanner
                whiteOption={poolOptions.find((o) => o.key === whiteKey)}
                blackOption={poolOptions.find((o) => o.key === blackKey)}
                vsLabel={t.arenaPage.matchupVs}
              />

              <div className="grid sm:grid-cols-2 gap-4 md:col-span-2 pt-2">
                <div>
                  <Label className="text-xs text-slate-400">
                    {t.arenaPage.depthLabel}
                  </Label>
                  <input
                    type="range"
                    min={6}
                    max={16}
                    value={arenaDepth}
                    onChange={(e) => setArenaDepth(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-[11px] text-slate-500 font-mono">
                    {arenaDepth}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">
                    {t.arenaPage.maxPliesLabel}
                  </Label>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    step={10}
                    value={maxPlies}
                    onChange={(e) => setMaxPlies(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-[11px] text-slate-500 font-mono">
                    {maxPlies}
                  </div>
                </div>
              </div>

              {isSupabaseConfigured && userId ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                  <div className="space-y-0.5 min-w-0">
                    <Label
                      htmlFor="arena-save-cloud"
                      className="text-sm text-slate-200"
                    >
                      {t.arenaPage.saveCloudLabel}
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {t.arenaPage.saveCloudHint}
                    </p>
                  </div>
                  <Switch
                    id="arena-save-cloud"
                    checked={saveCloudGames}
                    onCheckedChange={setSaveCloudGames}
                    className="shrink-0"
                  />
                </div>
              ) : isSupabaseConfigured && !userId ? (
                <p className="text-xs text-slate-500">
                  {t.arenaPage.saveCloudNeedLogin}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => void loadOptions()}
              disabled={listLoading}
              variant="outline"
              size="sm"
              className="border-slate-600"
            >
              {listLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t.arenaPage.refreshList
              )}
            </Button>
            <Button
              onClick={resetBoard}
              variant="outline"
              size="sm"
              className="border-slate-600"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t.arenaPage.reset}
            </Button>
            <Button
              onClick={() => void handleOneMove()}
              disabled={!isReady || autoPlay || whiteKey === blackKey}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600"
            >
              <StepForward className="h-4 w-4 mr-1" />
              {t.arenaPage.step}
            </Button>
            {!autoPlay ? (
              <Button
                onClick={() => void handleStartAuto()}
                disabled={!isReady || whiteKey === blackKey}
                size="sm"
                className="bg-green-600 hover:bg-green-500"
              >
                <Play className="h-4 w-4 mr-1" />
                {t.arenaPage.start}
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="sm"
                variant="destructive"
              >
                <Pause className="h-4 w-4 mr-1" />
                {t.arenaPage.pause}
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            {!isReady ? (
              <p>{t.arenaPage.needEngine}</p>
            ) : (
              <p>
                {autoPlay ? t.arenaPage.statusThinking : t.arenaPage.statusIdle}
                {" · "}
                {t.arenaPage.movesPlayed}: {moveCount}
              </p>
            )}
            {statusNote && (
              <p className="text-amber-200 font-medium">{statusNote}</p>
            )}
            {whiteKey === blackKey && (
              <p className="text-amber-300">{t.arenaPage.pickBoth}</p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md space-y-2">
              {isReady && <EvaluationBar evaluation={barEval} />}
              <div className="w-full aspect-square">
                <SimpleChessboard
                  position={fen}
                  orientation="white"
                  lastMove={lastMove}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
