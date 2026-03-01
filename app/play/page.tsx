"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Bot, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { EngineConfig } from "@/lib/analysis";
import EngineConfigPanel from "@/components/EngineConfigPanel";
import PublicProfiles from "@/components/PublicProfiles";
import { useLanguage } from "@/lib/language-context";

function PlayBoardLoading() {
  const { t } = useLanguage();
  return (
    <div className="w-full h-[600px] bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-700">
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
  const { t } = useLanguage();
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<EngineConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [error, setError] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showBotSelection, setShowBotSelection] = useState(false);

  useEffect(() => {
    const configParam = searchParams.get('config');
    
    if (configParam) {
      try {
        const decodedConfig = JSON.parse(decodeURIComponent(configParam));
        setConfig(decodedConfig);
        setOriginalConfig(decodedConfig);
        setShowBotSelection(false);
      } catch (err) {
        setError(t.ui.invalidConfig);
        console.error("Config parse error:", err);
      }
    } else {
      setShowBotSelection(true);
    }
  }, [searchParams, t.ui.invalidConfig]);

  const handleConfigSave = () => {
    setShowConfigDialog(false);
  };

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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cyan-400 dark:text-cyan-400 light:text-[oklch(0.45_0.12_190)] mb-2">
              ♟️ {t.play.selectOpponent}
            </h1>
            <p className="theme-text-secondary">
              {t.play.selectBotDescription}
            </p>
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
          <p className="text-cyan-400/70 dark:text-cyan-400/70 light:text-[oklch(0.45_0.12_190)]/70">Chargement de la configuration...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Barre de contrôle compacte en haut - Position fixe */}
        <div className="sticky top-0 z-50 bg-gradient-to-b from-slate-950 dark:from-slate-950 light:from-[oklch(0.88_0.010_75)] to-slate-950/95 dark:to-slate-950/95 light:to-[oklch(0.88_0.010_75)]/95 backdrop-blur-sm border-b theme-border px-2 md:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Gauche: Info Bot */}
            <div className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-100">{config.name}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-400/50 hidden sm:inline-flex">
                Niv {config.difficulty}
              </Badge>
            </div>

            {/* Centre: Sélection couleur inline */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPlayerColor('white')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  playerColor === 'white' 
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                ⚪
              </button>
              <button
                onClick={() => setPlayerColor('black')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  playerColor === 'black' 
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                ⚫
              </button>
            </div>

            {/* Droite: Config */}
            <Button 
              size="sm"
              variant="ghost" 
              onClick={() => setShowConfigDialog(true)}
              className="text-cyan-300 hover:bg-cyan-500/10 h-7 px-2"
              title={t.board.configuration}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
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

        {/* Dialog de Configuration */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto theme-bg-secondary theme-border">
            <DialogHeader>
              <DialogTitle className="theme-text-primary">{t.engineConfig.engineConfigAdvanced}</DialogTitle>
              <DialogDescription className="theme-text-secondary">
                {t.engineConfig.advancedConfigDescription}
              </DialogDescription>
            </DialogHeader>
            {originalConfig && (
              <EngineConfigPanel 
                initialConfig={originalConfig}
                onConfigChange={setConfig}
                onSave={handleConfigSave}
              />
            )}
          </DialogContent>
        </Dialog>

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
          <p className="text-cyan-400/70 dark:text-cyan-400/70 light:text-[oklch(0.45_0.12_190)]/70">Chargement...</p>
        </div>
      </main>
    }>
      <PlayContent />
    </Suspense>
  );
}
