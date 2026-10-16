"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Bot, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import FetchErrorState from "@/components/FetchErrorState";
import PublicProfiles from "@/components/PublicProfiles";
import PersonalityOpponentPicker from "@/components/PersonalityOpponentPicker";
import PlayModeRail, {
  type PlayPickerMode,
} from "@/components/play/PlayModeRail";
import PlayMetaPanel from "@/components/play/PlayMetaPanel";
import type { EngineConfig } from "@/lib/analysis";
import { useLanguage } from "@/lib/language-context";
import { getPersonalityOpponent } from "@/lib/personality-opponents";
import {
  parsePersonalityQuery,
  personalityToEngineConfig,
} from "@/lib/personality-to-engine";

function PlayBoardLoading() {
  const { t } = useLanguage();
  return (
    <div className="w-full min-h-[50dvh] flex items-center justify-center">
      <BrandLoadingScreen label={t.ui.loadingEngine} />
    </div>
  );
}

const PlayableChessboard = dynamic(() => import("@/components/PlayableChessboard"), {
  ssr: false,
  loading: () => <PlayBoardLoading />,
});

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [configError, setConfigError] = useState(false);
  const [showBotSelection, setShowBotSelection] = useState(false);
  const [pickerMode, setPickerMode] = useState<PlayPickerMode>("personalities");

  const urlConfigResult = useMemo(() => {
    const personality = parsePersonalityQuery(searchParams);
    if (personality) {
      const opponent = getPersonalityOpponent(personality.id);
      if (!opponent) return { kind: "error" as const };
      return {
        kind: "ok" as const,
        config: personalityToEngineConfig(opponent, personality.overrides, lang),
      };
    }
    const configParam = searchParams.get("config");
    if (!configParam) return { kind: "none" as const };
    try {
      const decoded = JSON.parse(
        decodeURIComponent(configParam)
      ) as EngineConfig;
      return { kind: "ok" as const, config: decoded };
    } catch {
      return { kind: "error" as const };
    }
  }, [searchParams, lang]);

  useEffect(() => {
    if (urlConfigResult.kind === "error") {
      setConfigError(true);
      setShowBotSelection(false);
      setConfig(null);
      return;
    }
    if (urlConfigResult.kind === "ok") {
      setConfig(urlConfigResult.config);
      setShowBotSelection(false);
      setConfigError(false);
      return;
    }
    setShowBotSelection(true);
    setConfig(null);
    setConfigError(false);
  }, [urlConfigResult]);

  const handleColorChange = () => {
    setPlayerColor((prev) => (prev === "white" ? "black" : "white"));
  };

  const clearBrokenConfig = () => {
    router.replace("/play");
  };

  if (configError) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6 flex items-center justify-center">
        <FetchErrorState
          title={t.common.error}
          message={t.ui.invalidConfig}
          retryLabel={t.play.retryOpponent}
          onRetry={clearBrokenConfig}
          secondaryHref="/"
          secondaryLabel={t.backToHome}
        />
      </main>
    );
  }

  if (showBotSelection) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <header>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">
              {t.play.selectOpponent}
            </h1>
            <p className="text-slate-500 text-xs">{t.play.personalities.subtitle}</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_220px] xl:grid-cols-[300px_1fr_240px] gap-4">
            <div className="order-1 space-y-3">
              <PlayModeRail
                mode={pickerMode}
                onModeChange={setPickerMode}
                labels={{
                  personalities: t.play.personalities.personalitiesTab,
                  library: t.play.personalities.libraryTab,
                  online: t.play.modeOnline,
                  personalitiesHint: t.play.railPersonalitiesHint,
                  libraryHint: t.play.railLibraryHint,
                  onlineHint: t.play.railOnlineHint,
                  onlineCta: t.play.modeOnlineCta,
                }}
              />
            </div>

            <div className="order-2 min-w-0" data-testid="play-picker-center">
              {pickerMode === "personalities" && (
                <PersonalityOpponentPicker onPlay={(href) => router.push(href)} />
              )}
              {pickerMode === "library" && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">
                    {t.play.selectBotDescription}
                  </p>
                  <PublicProfiles />
                </div>
              )}
              {pickerMode === "online" && (
                <div
                  className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-6 text-center space-y-3"
                  data-testid="play-online-panel"
                >
                  <h2 className="text-base font-semibold text-slate-100">
                    {t.play.modeOnline}
                  </h2>
                  <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    {t.play.railOnlineHint}
                  </p>
                  <Button asChild className="bg-cyan-700 hover:bg-cyan-600">
                    <Link href="/online" data-testid="play-online-panel-cta">
                      {t.play.modeOnlineCta}
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="order-3 hidden lg:block">
              <PlayMetaPanel
                variant={pickerMode}
                labels={{
                  title: t.play.metaTitle,
                  tipPersonalities: t.play.metaTipPersonalities,
                  tipLibrary: t.play.metaTipLibrary,
                  tipOnline: t.play.metaTipOnline,
                  tipGame: t.play.metaTipGame,
                }}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center p-6">
        <BrandLoadingScreen label={t.play.loading} />
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary">
      <div className="max-w-[1600px] mx-auto">
        <div className="lg:sticky lg:top-0 z-50 bg-gradient-to-b from-slate-950 to-slate-950/95 backdrop-blur-sm border-b theme-border px-2 md:px-4 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-slate-400 hover:text-cyan-200 shrink-0"
                onClick={() => router.push("/play")}
                title={t.play.personalities.changeOpponent}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">
                  {t.play.personalities.changeOpponent}
                </span>
              </Button>
              {config.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover border border-cyan-500/40 shrink-0"
                />
              ) : (
                <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
              )}
              <span className="text-sm font-semibold text-cyan-100 truncate">
                {config.name}
              </span>
              {config.personalityId ? (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 border-amber-400/50 text-amber-200 hidden sm:inline-flex shrink-0"
                >
                  {t.play.personalities.badge}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 border-cyan-400/50 hidden sm:inline-flex shrink-0"
              >
                Niv {config.difficulty}
              </Badge>
            </div>

            <div
              className="flex items-center gap-1 shrink-0"
              role="group"
              aria-label={t.play.colorChoiceHint}
            >
              <button
                type="button"
                onClick={() => setPlayerColor("white")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all border ${
                  playerColor === "white"
                    ? "bg-cyan-500/20 text-cyan-100 border-cyan-500"
                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-cyan-500/50"
                }`}
                title={t.play.playAsWhite}
                aria-pressed={playerColor === "white"}
                aria-label={t.play.playAsWhite}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-slate-100 border border-slate-400"
                  aria-hidden
                />
                <span className="hidden sm:inline">{t.play.whiteSide}</span>
              </button>
              <button
                type="button"
                onClick={() => setPlayerColor("black")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all border ${
                  playerColor === "black"
                    ? "bg-cyan-500/20 text-cyan-100 border-cyan-500"
                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-cyan-500/50"
                }`}
                title={t.play.playAsBlack}
                aria-pressed={playerColor === "black"}
                aria-label={t.play.playAsBlack}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-500"
                  aria-hidden
                />
                <span className="hidden sm:inline">{t.play.blackSide}</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 px-0.5 leading-tight hidden sm:block">
            {t.play.playPageToolbarHint}
          </p>
        </div>

        <div className="p-2 md:p-4 grid grid-cols-1 lg:grid-cols-[1fr_220px] xl:grid-cols-[1fr_240px] gap-4">
          <PlayableChessboard
            config={config}
            playerColor={playerColor}
            onConfigChange={setConfig}
            onColorChange={handleColorChange}
          />
          <div className="hidden lg:block">
            <PlayMetaPanel
              variant="game"
              labels={{
                title: t.play.metaTitle,
                tipPersonalities: t.play.metaTipPersonalities,
                tipLibrary: t.play.metaTipLibrary,
                tipOnline: t.play.metaTipOnline,
                tipGame: t.play.metaTipGame,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PlayPage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center p-6">
          <BrandLoadingScreen label={t.play.loading} />
        </main>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
