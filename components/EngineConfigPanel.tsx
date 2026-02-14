"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Cpu, Zap, Clock, TrendingUp, Swords, Settings, RotateCcw, Sparkles, BookOpen, Target } from "lucide-react";
import type { EngineConfig } from "@/lib/analysis";
import OpeningRepertoireEditor from "./OpeningRepertoireEditor";
import ForcedLineEditor from "./ForcedLineEditor";
import { getPresetByName, getOpeningById } from "@/lib/openings-library";
import {
  deriveForcedLinesFromOpenings,
  getEditableForcedLines,
  type ForcedLineSource,
} from "@/lib/forced-line-utils";
import { useLanguage } from "@/lib/language-context";

function DerivedForcedLinePreview({ config }: { config: EngineConfig }) {
  const { t } = useLanguage();
  const rep = config.openingRepertoire;
  const whiteIds = rep?.whiteOpenings ?? [];
  const blackIds = rep?.blackOpenings ?? [];
  const { white, black } = deriveForcedLinesFromOpenings(whiteIds, blackIds);
  const firstWhite = getOpeningById(whiteIds[0]?.id ?? "");
  const firstBlack = getOpeningById(blackIds[0]?.id ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-slate-300">{t.games.white}</CardTitle>
          <CardDescription className="text-xs">
            {firstWhite ? firstWhite.name : t.engineConfig.noOpening}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-xs text-green-400 font-mono">
            {white.length ? white.join(", ") : "—"}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-slate-300">{t.games.black}</CardTitle>
          <CardDescription className="text-xs">
            {firstBlack ? firstBlack.name : t.engineConfig.noOpening}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-xs text-green-400 font-mono">
            {black.length ? black.join(", ") : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface EngineConfigPanelProps {
  initialConfig: EngineConfig;
  onConfigChange: (config: EngineConfig) => void;
  onSave: () => void;
}

export default function EngineConfigPanel({ 
  initialConfig, 
  onConfigChange,
  onSave 
}: EngineConfigPanelProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [config, setConfig] = useState<EngineConfig>(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Calculer automatiquement les paramètres selon le niveau
  const calculateAutoConfig = (difficulty: number): Partial<EngineConfig> => {
    const baseElo = 1200;
    const eloIncrement = 200;
    const validDifficulty = Math.min(5, Math.max(1, Math.round(difficulty))) as 1 | 2 | 3 | 4 | 5;
    
    return {
      difficulty: validDifficulty,
      elo: baseElo + (validDifficulty * eloIncrement),
      threads: validDifficulty >= 4 ? 4 : 2, // Minimum 2 threads
      depth: 8 + (validDifficulty - 1) * 3, // 8, 11, 14, 17, 20
      timeControl: 800 - (validDifficulty * 100), // 700, 600, 500, 400, 300
    };
  };

  // Gérer le changement de niveau (mode auto)
  const handleDifficultyChange = (value: number) => {
    const autoParams = calculateAutoConfig(value);
    const newConfig = { ...config, ...autoParams };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Gérer les changements manuels
  const handleManualChange = (key: keyof EngineConfig, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Gérer les changements d'ouvertures + sync des lignes forcées si source = ouvertures
  const handleOpeningChange = (white: { id: string; weight: number }[], black: { id: string; weight: number }[]) => {
    const rep = { whiteOpenings: white, blackOpenings: black };
    let newConfig: EngineConfig = { ...config, openingRepertoire: rep };
    if ((config.forcedLineSource ?? "custom") === "openings") {
      const { white: w, black: b } = deriveForcedLinesFromOpenings(white, black);
      newConfig = { ...newConfig, forcedLineWhite: w, forcedLineBlack: b };
    }
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Réinitialiser aux valeurs d'origine
  const handleReset = () => {
    setConfig(initialConfig);
    onConfigChange(initialConfig);
    setMode('auto');
  };

  const { t } = useLanguage();
  const difficultyLevels = [
    { value: 1, label: t.engineConfig.difficultyBeginner, color: "bg-green-500" },
    { value: 2, label: t.engineConfig.difficultyIntermediate, color: "bg-blue-500" },
    { value: 3, label: t.engineConfig.difficultyAdvanced, color: "bg-purple-500" },
    { value: 4, label: t.engineConfig.difficultyExpert, color: "bg-orange-500" },
    { value: 5, label: t.engineConfig.difficultyGrandmaster, color: "bg-red-500" },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-400" />
              {t.engineConfig.engineConfig}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {t.engineConfig.customizeParams}
            </CardDescription>
          </div>
          
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={handleReset}
            className="border-2 border-slate-600 bg-slate-900 text-slate-100 hover:text-white hover:bg-slate-800 font-semibold"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {t.engineConfig.reset}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-950 border border-slate-800">
            <TabsTrigger value="config" className="data-[state=active]:bg-slate-800">
              <Settings className="h-4 w-4 mr-2" />
              {t.engineConfig.configTab}
            </TabsTrigger>
            <TabsTrigger value="openings" className="data-[state=active]:bg-slate-800">
              <BookOpen className="h-4 w-4 mr-2" />
              {t.engineConfig.openings}
            </TabsTrigger>
            <TabsTrigger value="forced-line" className="data-[state=active]:bg-slate-800">
              <Target className="h-4 w-4 mr-2" />
              {t.engineConfig.forcedLineTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6 mt-6">
        
        <div>
          <label className="text-sm font-semibold text-slate-300 mb-2 block">
            {t.engineConfig.configMode}
          </label>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'auto' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
              <TabsTrigger 
                value="auto" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {t.engineConfig.auto}
              </TabsTrigger>
              <TabsTrigger 
                value="manual" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4 mr-1" />
                {t.engineConfig.manual}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-slate-500 mt-2">
            {mode === 'auto' ? t.engineConfig.configModeAuto : t.engineConfig.configModeManual}
          </p>
        </div>

        <Separator className="bg-slate-800" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300">
              {t.engineConfig.difficultyLevel}
            </label>
            <Badge variant="outline" className="text-amber-400 border-amber-400">
              ELO {config.elo}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={config.difficulty}
              onChange={(e) => {
                if (mode === 'auto') {
                  handleDifficultyChange(Number(e.target.value));
                } else {
                  handleManualChange('difficulty', Number(e.target.value));
                }
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs">
              {difficultyLevels.map((level) => (
                <div 
                  key={level.value}
                  className={`text-center ${
                    config.difficulty === level.value 
                      ? 'text-green-400 font-bold' 
                      : 'text-slate-600'
                  }`}
                >
                  {level.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Paramètres Détaillés */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Aggressiveness */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-400" />
                <span className="text-sm font-semibold text-slate-300">{t.engineConfig.aggressiveness}</span>
              </div>
              <span className="text-sm font-bold text-red-400">{config.aggressiveness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.aggressiveness}
              onChange={(e) => handleManualChange('aggressiveness', Number(e.target.value))}
              disabled={mode === 'auto'}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{t.engineConfig.defensive}</span>
              <span>{t.engineConfig.balanced}</span>
              <span>{t.engineConfig.aggressive}</span>
            </div>
          </div>

          {/* CPU Threads */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">{t.engineConfig.cpuThreads}</span>
              </div>
              <span className="text-sm font-bold text-cyan-400">{config.threads}</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={config.threads}
              onChange={(e) => handleManualChange('threads', Number(e.target.value))}
              disabled={mode === 'auto'}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t.engineConfig.threadsDesc}
            </p>
          </div>

          {/* Search Depth */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-300">{t.engineConfig.searchDepth}</span>
              </div>
              <span className="text-sm font-bold text-purple-400">{t.engineConfig.depthLevel} {config.depth}</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={config.depth}
              onChange={(e) => handleManualChange('depth', Number(e.target.value))}
              disabled={mode === 'auto'}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t.engineConfig.depthDesc}
            </p>
          </div>

          {/* Thinking Time */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-300">{t.engineConfig.thinkTime}</span>
              </div>
              <span className="text-sm font-bold text-blue-400">{config.timeControl}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={config.timeControl}
              onChange={(e) => handleManualChange('timeControl', Number(e.target.value))}
              disabled={mode === 'auto'}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{t.engineConfig.fastTime}</span>
              <span>{t.engineConfig.mediumTime}</span>
              <span>{t.engineConfig.slowTime}</span>
            </div>
          </div>

        </div>

        {/* Résumé */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-4 rounded-lg border border-slate-800">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">{t.engineConfig.configSummary}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">{t.engineConfig.levelSummary} :</span>
              <span className="text-slate-200 ml-2 font-semibold">{config.difficulty}/5</span>
            </div>
            <div>
              <span className="text-slate-500">{t.engineConfig.estimatedEloSummary} :</span>
              <span className="text-amber-400 ml-2 font-semibold">{config.elo}</span>
            </div>
            <div>
              <span className="text-slate-500">{t.engineConfig.styleSummary} :</span>
              <span className="text-slate-200 ml-2 font-semibold capitalize">{
                ({
                  'agressif': t.engineConfig.playStyleAggressive,
                  'solide': t.engineConfig.playStyleSolid,
                  'équilibré': t.engineConfig.playStyleBalanced,
                  'positionnel': t.engineConfig.playStylePositional,
                  'tactique': t.engineConfig.playStyleTactical,
                } as Record<string, string>)[config.playStyle] || config.playStyle
              }</span>
            </div>
            <div>
              <span className="text-slate-500">{t.engineConfig.aggressivenessSummary} :</span>
              <span className="text-red-400 ml-2 font-semibold">{config.aggressiveness}%</span>
            </div>
          </div>
        </div>

          </TabsContent>

          {/* Tab Ouvertures */}
          <TabsContent value="openings" className="mt-6">
            <OpeningRepertoireEditor
              whiteOpenings={config.openingRepertoire?.whiteOpenings || []}
              blackOpenings={config.openingRepertoire?.blackOpenings || []}
              onChange={handleOpeningChange}
            />
          </TabsContent>

          {/* Tab Ligne Forcée : ouvertures ou personnalisée */}
          <TabsContent value="forced-line" className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">{t.engineConfig.forcedLineSource}</p>
              <Tabs
                value={config.forcedLineSource ?? "custom"}
                onValueChange={(v) => {
                  const src = v as ForcedLineSource;
                  let next: EngineConfig = { ...config, forcedLineSource: src };
                  if (src === "openings" && config.openingRepertoire) {
                    const { white, black } = deriveForcedLinesFromOpenings(
                      config.openingRepertoire.whiteOpenings ?? [],
                      config.openingRepertoire.blackOpenings ?? []
                    );
                    next = { ...next, forcedLineWhite: white, forcedLineBlack: black };
                  }
                  setConfig(next);
                  onConfigChange(next);
                }}
              >
                <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
                  <TabsTrigger value="openings" className="data-[state=active]:bg-slate-800">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t.engineConfig.forcedLineFromOpenings}
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="data-[state=active]:bg-slate-800">
                    <Target className="h-4 w-4 mr-2" />
                    {t.engineConfig.forcedLineCustom}
                  </TabsTrigger>
                </TabsList>
                {(config.forcedLineSource ?? "custom") === "openings" ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-400">
                      {t.engineConfig.forcedLineSyncDesc}
                    </p>
                    <DerivedForcedLinePreview config={config} />
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {(["white", "black"] as const).map((color) => {
                      const lines = getEditableForcedLines(config);
                      const line = color === "white" ? lines.white : lines.black;
                      const title = color === "white" ? t.engineConfig.forcedLineWhite : t.engineConfig.forcedLineBlack;
                      const desc = color === "white"
                        ? t.engineConfig.forcedLineWhiteDesc
                        : t.engineConfig.forcedLineBlackDesc;
                      return (
                        <ForcedLineEditor
                          key={color}
                          forcedLine={line}
                          title={title}
                          description={desc}
                          variant="bot-only"
                          onLineChange={(updated) => {
                            const next = { ...config };
                            if (color === "white") next.forcedLineWhite = updated;
                            else next.forcedLineBlack = updated;
                            setConfig(next);
                            onConfigChange(next);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bouton Sauvegarder */}
        <Button 
          type="button"
          onClick={onSave}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg border border-green-700"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t.engineConfig.applyConfig}
        </Button>

      </CardContent>
    </Card>
  );
}
