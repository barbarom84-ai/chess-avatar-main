"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import {
  buildAvatarCardModel,
  minimalPersonaStatsFromConfig,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Bot, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { EngineConfig } from "@/lib/analysis";
import PublicProfiles from "@/components/PublicProfiles";
import { useLanguage } from "@/lib/language-context";

function PlayBoardLoading() {
  const { t } = useLanguage();
  return (
    <div className="w-full h-[60dvh] lg:h-[600px] bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-700">
      {t.ui.loadingEngine}
    </div>
  );
}

const PlayableChessboard = dynamic(() => import("@/components/PlayableChessboard"), {
  ssr: false,
  loading: () => <PlayBoardLoading />
});

function PlayContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const cardLabels = useMemo(() => getAvatarCardLabels(t), [t]);
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [error, setError] = useState("");
  const [showBotSelection, setShowBotSelection] = useState(false);

  const urlConfigResult = useMemo(() => {
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
  }, [searchParams]);

  useEffect(() => {
    if (urlConfigResult.kind === "error") {
      setError(t.ui.invalidConfig);
      setShowBotSelection(false);
      setConfig(null);
      return;
    }
    if (urlConfigResult.kind === "ok") {
      setConfig(urlConfigResult.config);
      setShowBotSelection(false);
      setError("");
      return;
    }
    setShowBotSelection(true);
    setConfig(null);
    setError("");
  }, [urlConfigResult, t.ui.invalidConfig]);

  const handleColorChange = () => {
    setPlayerColor(prev => prev === 'white' ? 'black' : 'white');
  };

  const playCardModel = useMemo(() => {
    if (!config) return null;
    const stats = minimalPersonaStatsFromConfig(config);
    return buildAvatarCardModel({ stats, config, labels: cardLabels });
  }, [config, cardLabels]);

  if (error) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-cyan-500/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-700/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t.common.error}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (showBotSelection) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cyan-400 mb-2 flex items-center justify-center gap-3">
              <span
                aria-hidden
                className="inline-block h-9 w-9 bg-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]"
                style={{
                  WebkitMaskImage: "url('/pieces/alpha/bP.svg')",
                  maskImage: "url('/pieces/alpha/bP.svg')",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
              {t.pages.play.title}
            </h1>
            <p className="theme-text-secondary">{t.pages.play.subtitle}</p>
            <p className="text-sm text-slate-500">{t.play.selectBotDescription}</p>
            <div className="flex justify-center pt-2">
              <Button asChild variant="outline" className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10">
                <Link href="/online">{t.play.onlinePvpCta}</Link>
              </Button>
            </div>
          </div>
          <PublicProfiles />
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400/70">Chargement de la configuration...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Barre de contrôle compacte en haut - Position fixe */}
        <div className="lg:sticky lg:top-0 z-50 bg-gradient-to-b from-slate-950 to-slate-950/95 backdrop-blur-sm border-b theme-border px-2 md:px-4 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            {/* Gauche: carte compacte adversaire */}
            <div className="flex items-center gap-2 min-w-0">
              {playCardModel ? (
                <AvatarTradingCard
                  model={playCardModel}
                  labels={cardLabels}
                  size="sm"
                  interactive={false}
                  className="shrink-0"
                />
              ) : (
                <>
                  <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="text-sm font-semibold text-cyan-100 truncate">
                    {config.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 border-cyan-400/50 hidden sm:inline-flex shrink-0"
                  >
                    Niv {config.difficulty}
                  </Badge>
                </>
              )}
            </div>

            {/* Centre: Sélection couleur */}
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
                <span aria-hidden>⚪</span>
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
                <span aria-hidden>⚫</span>
                <span className="hidden sm:inline">{t.play.blackSide}</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 px-0.5 leading-tight hidden sm:block">
            <span className="text-cyan-500/70 mr-1" aria-hidden>
              ℹ️
            </span>
            {t.play.playPageToolbarHint}
          </p>
        </div>

        {/* Zone de jeu - Échiquier commence immédiatement après la barre */}
        <div className="p-2 md:p-4">
          <PlayableChessboard 
            config={config} 
            playerColor={playerColor}
            onConfigChange={setConfig}
            onColorChange={handleColorChange}
          />
        </div>

      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400/70">Chargement...</p>
        </div>
      </main>
    }>
      <PlayContent />
    </Suspense>
  );
}
