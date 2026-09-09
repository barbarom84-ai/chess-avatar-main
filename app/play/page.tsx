"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Bot, AlertCircle, Crown, Library, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EngineConfig } from "@/lib/analysis";
import PublicProfiles from "@/components/PublicProfiles";
import PersonalityOpponentPicker from "@/components/PersonalityOpponentPicker";
import { useLanguage } from "@/lib/language-context";
import { getPersonalityOpponent } from "@/lib/personality-opponents";
import {
  parsePersonalityQuery,
  personalityToEngineConfig,
} from "@/lib/personality-to-engine";

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
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [error, setError] = useState("");
  const [showBotSelection, setShowBotSelection] = useState(false);

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
          <div className="text-center mb-4">
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
              {t.play.selectOpponent}
            </h1>
            <p className="theme-text-secondary">
              {t.play.personalities.subtitle}
            </p>
          </div>
          <Tabs defaultValue="personalities" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-700 w-full sm:w-auto">
              <TabsTrigger value="personalities" className="flex-1 sm:flex-none">
                <Crown className="h-4 w-4" />
                {t.play.personalities.personalitiesTab}
              </TabsTrigger>
              <TabsTrigger value="library" className="flex-1 sm:flex-none">
                <Library className="h-4 w-4" />
                {t.play.personalities.libraryTab}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="personalities" className="mt-4">
              <PersonalityOpponentPicker onPlay={(href) => router.push(href)} />
            </TabsContent>
            <TabsContent value="library" className="mt-4">
              <p className="text-sm text-slate-400 mb-4">
                {t.play.selectBotDescription}
              </p>
              <PublicProfiles />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400/70">{t.play.loading}</p>
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
            {/* Gauche: Info Bot */}
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
              <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-cyan-100 truncate">{config.name}</span>
              {config.personalityId ? (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-400/50 text-amber-200 hidden sm:inline-flex shrink-0">
                  {t.play.personalities.badge}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-400/50 hidden sm:inline-flex shrink-0">
                Niv {config.difficulty}
              </Badge>
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
