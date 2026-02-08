"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Trophy, Target, Calendar, Clock, Download, Trash2, 
  Search, Filter, TrendingUp, Play, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { getUserGames, getGamesStats, deleteGame, type DbGame } from "@/lib/supabase-storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";
import Image from "next/image";
import AdvancedGameViewer from "@/components/AdvancedGameViewer";

export default function GamesPage() {
  const { t, lang } = useLanguage();
  const [games, setGames] = useState<DbGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<DbGame[]>([]);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [selectedGame, setSelectedGame] = useState<DbGame | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 10;

  useEffect(() => {
    loadGames();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, searchTerm, filterResult]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const data = await getUserGames();
      setGames(data);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const data = await getGamesStats();
    setStats(data);
  };

  const applyFilters = () => {
    let filtered = [...games];

    // Filtre par résultat
    if (filterResult !== 'all') {
      filtered = filtered.filter(g => g.result === filterResult);
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.opponent_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredGames(filtered);
    setCurrentPage(1);
  };

  const handleDelete = async (gameId: string) => {
    if (!confirm(t.games.confirmDelete)) return;
    
    const success = await deleteGame(gameId);
    if (success) {
      loadGames();
      loadStats();
    }
  };

  const downloadPGN = (game: DbGame) => {
    const blob = new Blob([game.pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.opponent_name}_${new Date(game.created_at).toLocaleDateString()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'win':
        return <Badge className="bg-green-600 text-white">{t.games.wins}</Badge>;
      case 'loss':
        return <Badge className="bg-red-600 text-white">{t.games.losses}</Badge>;
      case 'draw':
        return <Badge className="bg-amber-600 text-white">{t.games.draws}</Badge>;
      default:
        return <Badge>{result}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = filteredGames.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-slate-900 border-amber-500/20">
            <CardContent className="pt-6">
              <p className="text-amber-300">⚠️ {t.games.supabaseNotConfigured}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => setSelectedGame(null)}
            className="mb-4 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t.games.backToList}
          </Button>

          <Card className="bg-slate-900 border-cyan-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedGame.opponent_avatar && (
                    <Image 
                      src={selectedGame.opponent_avatar} 
                      alt={selectedGame.opponent_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <CardTitle className="text-cyan-100">
                      {t.games.gameAgainst} {selectedGame.opponent_name}
                    </CardTitle>
                    <div className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                      <span>{formatDate(selectedGame.created_at)}</span>
                      <span>•</span>
                      {getResultBadge(selectedGame.result)}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => downloadPGN(selectedGame)}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PGN
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AdvancedGameViewer 
                pgn={selectedGame.pgn} 
                playerColor={selectedGame.player_color as 'white' | 'black'}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold neon-cyan mb-2">{t.games.title}</h1>
          <p className="text-cyan-400/70">{t.games.subtitle}</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{t.games.totalGames}</p>
                  <p className="text-3xl font-bold text-cyan-300">{stats.total}</p>
                </div>
                <Trophy className="h-8 w-8 text-cyan-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{t.games.victories}</p>
                  <p className="text-3xl font-bold text-green-400">{stats.wins}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{t.games.defeats}</p>
                  <p className="text-3xl font-bold text-red-400">{stats.losses}</p>
                </div>
                <Target className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{t.games.winRate}</p>
                  <p className="text-3xl font-bold text-amber-400">{stats.winRate.toFixed(0)}%</p>
                </div>
                <Trophy className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et Recherche */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t.games.searchOpponent}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-950 border-slate-700 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterResult === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterResult('all')}
                  className={filterResult === 'all' ? 'bg-cyan-600' : 'border-slate-600'}
                >
                  {t.games.all}
                </Button>
                <Button
                  variant={filterResult === 'win' ? 'default' : 'outline'}
                  onClick={() => setFilterResult('win')}
                  className={filterResult === 'win' ? 'bg-green-600' : 'border-slate-600'}
                >
                  {t.games.victories}
                </Button>
                <Button
                  variant={filterResult === 'loss' ? 'default' : 'outline'}
                  onClick={() => setFilterResult('loss')}
                  className={filterResult === 'loss' ? 'bg-red-600' : 'border-slate-600'}
                >
                  {t.games.defeats}
                </Button>
                <Button
                  variant={filterResult === 'draw' ? 'default' : 'outline'}
                  onClick={() => setFilterResult('draw')}
                  className={filterResult === 'draw' ? 'bg-amber-600' : 'border-slate-600'}
                >
                  {t.games.draws}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des parties */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-cyan-100">
              {t.games.history} ({filteredGames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                <p className="text-slate-400 mt-4">{t.games.loading}</p>
              </div>
            ) : currentGames.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">{t.games.noGamesFound}</p>
                <p className="text-sm text-slate-500">
                  {searchTerm || filterResult !== 'all' 
                    ? t.games.tryModifyFilters
                    : t.games.startPlaying}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentGames.map((game) => (
                    <div
                      key={game.id}
                      className="p-4 bg-slate-950 rounded-lg border border-slate-800 hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {game.opponent_avatar && (
                            <Image 
                              src={game.opponent_avatar} 
                              alt={game.opponent_name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-200">{game.opponent_name}</h3>
                              {getResultBadge(game.result)}
                              {game.opponent_platform && (
                                <Badge variant="outline" className="text-xs">
                                  {game.opponent_platform}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(game.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(game.duration_seconds)}
                              </span>
                              <span>{t.games.moves}: {game.moves_count}</span>
                              <span className="capitalize">
                                {t.games.color}: {game.player_color === 'white' ? t.games.white : t.games.black}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedGame(game)}
                            className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                            title={t.games.viewGame}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadPGN(game)}
                            className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                            title={t.games.downloadPGN}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(game.id)}
                            className="border-red-500/50 text-red-300 hover:bg-red-500/10"
                            title={t.games.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400">
                      {t.games.page} {currentPage} {t.games.of} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
