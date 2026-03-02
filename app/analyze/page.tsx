"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Loader2, AlertCircle, Trophy, ArrowLeft } from "lucide-react";

// Imports UI
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; 
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Imports Logique
import PersonaCard from "@/components/PersonaCard";
import PerformanceCharts from "@/components/PerformanceCharts";
import { analyzePersona, type PersonaStats, type EngineConfig } from "@/lib/analysis";
import { useLanguage } from "@/lib/language-context";

// Import Dynamique de l'échiquier (pour éviter le bug SSR)
const GameViewer = dynamic(() => import("@/components/GameViewer"), {
  ssr: false,
  loading: () => <div className="w-full h-[50dvh] lg:h-[500px] bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-700">Loading...</div>
});

export default function AnalyzePage() {
  const { lang, t } = useLanguage();
  
  // --- ÉTATS ---
  const [platform, setPlatform] = useState<"lichess" | "chesscom">("lichess");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Données
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [engineConfig, setEngineConfig] = useState<EngineConfig | null>(null);

  // --- LOGIQUE D'ANALYSE ---
  const handleAnalyze = async () => {
    if (!username) return;
    
    setLoading(true);
    setError("");
    setGames([]);
    setPersonaStats(null);
    setSelectedGame(null);

    try {
      let gamesData = [];
      let avatarUrl = "";
      let detectedPlatform: 'lichess' | 'chesscom' = 'lichess';

      // 1. CHOIX DE L'API SELON LA PLATEFORME
      if (platform === "lichess") {
        // API Lichess
        const response = await fetch(`/api/lichess?username=${username}`);
        if (!response.ok) throw new Error(t.errors.lichessPlayerNotFound);
        const data = await response.json();
        gamesData = data.games;
        avatarUrl = data.avatarUrl;
        detectedPlatform = 'lichess';
      
      } else {
        // API Chess.com
        const response = await fetch(`/api/chesscom?username=${username}`);
        const data = await response.json();
        
        if (!response.ok || data.error) {
          const msg = data.errorKey && (t.errors as Record<string, string>)[data.errorKey] ? (t.errors as Record<string, string>)[data.errorKey] : data.error;
          throw new Error(msg);
        }
        
        gamesData = data.games;
        avatarUrl = data.avatarUrl;
        detectedPlatform = 'chesscom';
      }

      // Vérification des données
      if (!Array.isArray(gamesData) || gamesData.length === 0) {
        throw new Error(t.errors.noGamesFound);
      }

      setGames(gamesData);
      setSelectedGame(gamesData[0]);

      // 2. LANCEMENT DE L'INTELLIGENCE
      const analysis = analyzePersona(gamesData, username, avatarUrl, detectedPlatform);
      setPersonaStats(analysis.stats);
      setEngineConfig(analysis.config);

    } catch (err: any) {
      setError(err.message || t.errors.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-cyan-300 hover:text-cyan-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToHome}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-cyan-400">{t.analyzeProfile}</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* BARRE DE RECHERCHE + TABS */}
        <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm max-w-2xl mx-auto shadow-2xl shadow-cyan-900/10">
          <CardContent className="pt-6 space-y-4">
            
            {/* Choix Plateforme */}
            <Tabs defaultValue="lichess" onValueChange={(v) => setPlatform(v as "lichess" | "chesscom")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-950/50 border border-cyan-500/20">
                <TabsTrigger value="lichess" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">Lichess</TabsTrigger>
                <TabsTrigger value="chesscom" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">Chess.com</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Input 
                id="username"
                name="username"
                placeholder={t.usernamePlaceholder[platform]}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="bg-slate-950 border-cyan-500/30 text-slate-100 h-11 focus:border-cyan-500"
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-11 px-6 shadow-lg border border-cyan-700 glow-cyan"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.analyzing}</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> {t.analyzeButton}</>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-700/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.common.error}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* RESULTATS */}
        {personaStats && engineConfig && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. CARTE D'IDENTITÉ IA + GRAPHIQUES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PersonaCard stats={personaStats} config={engineConfig} />
              </div>
              
              <div className="lg:col-span-2">
                <PerformanceCharts stats={personaStats} />
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* 2. REPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[60dvh] lg:h-[600px]">
              
              {/* Liste des parties */}
              <Card className="lg:col-span-4 theme-bg-secondary theme-border flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-2 bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-200/50">
                  <CardTitle className="text-xs uppercase tracking-wider theme-text-secondary font-bold">
                    {t.historyTitle}
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 px-4 pb-4">
                  <div className="space-y-2 mt-2">
                    {games.map((game, idx) => {
                      const whiteName = game.players.white.user.name || game.players.white.username;
                      const blackName = game.players.black.user.name || game.players.black.username;
                      const isWhite = whiteName.toLowerCase() === username.toLowerCase();
                      
                      const resultClass = 
                        (game.winner === (isWhite ? 'white' : 'black')) ? "border-green-500/40 bg-green-500/5" :
                        (!game.winner || game.winner === 'draw') ? "border-slate-700 bg-slate-800/30" :
                        "border-red-500/40 bg-red-500/5";

                      return (
                        <div 
                          key={game.id || idx}
                          onClick={() => setSelectedGame(game)}
                          className={`
                            p-3 rounded border cursor-pointer transition-all hover:bg-slate-800
                            ${selectedGame?.id === game.id ? "ring-1 ring-green-500 bg-slate-800" : "border-slate-800"}
                            ${resultClass}
                          `}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-200">vs {isWhite ? blackName : whiteName}</span>
                            <span className="text-xs font-mono text-slate-500">
                                {game.createdAt ? new Date(game.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Trophy className="h-3 w-3" />
                            <span>
                                {(game.winner === (isWhite ? 'white' : 'black')) ? t.victory : 
                                 (!game.winner || game.winner === 'draw') ? t.draw : t.defeat}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>

              {/* Échiquier */}
              <div className="lg:col-span-8 h-full">
                {selectedGame ? (
                  <GameViewer pgn={selectedGame.pgn} />
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500">
                    {t.selectGame}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}
