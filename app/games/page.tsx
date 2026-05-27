"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Trophy, Target, Calendar, Clock, Download, Trash2,
  Search, TrendingUp, Eye, ChevronLeft, ChevronRight,
  CheckSquare, Square, X, Upload, Loader2, Crown
} from "lucide-react";
import {
  getUserGames,
  getGamesStats,
  deleteGame,
  saveGameToCloud,
  type DbGame,
  isArenaBotVsBotGame,
  isPvpOnlineGame,
} from "@/lib/supabase-storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MAX_PGN_FILE_BYTES,
  listPlayerNamesFromPgn,
  parsePgnFileForGames,
} from "@/lib/pgn-import";
import {
  isHumanVsBotOnly,
  matchupTitleFromStoredGame,
} from "@/lib/games-matchup";
import PgnImportCard from "@/components/PgnImportCard";
import UpgradeModal from "@/components/UpgradeModal";
import GameHistoryList from "@/components/GameHistoryList";

/** Same Game Review tiering as /review/page.tsx so behavior stays consistent. */
const FREE_MAX_PLIES = 60;

const GameReviewer = dynamic(() => import("@/components/GameReviewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60dvh] lg:h-[600px] bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-700">
      Loading…
    </div>
  ),
});

export default function GamesPage() {
  const { t, lang } = useLanguage();
  const { isPremium, userId, email } = usePremium();
  const [games, setGames] = useState<DbGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<DbGame[]>([]);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [gameKindFilter, setGameKindFilter] = useState<
    "all" | "human" | "arena" | "pvp"
  >("all");
  const [selectedGame, setSelectedGame] = useState<DbGame | null>(null);
  // Active PGN being reviewed inline (either a saved game or an ad-hoc import).
  const [reviewPgn, setReviewPgn] = useState<string | null>(null);
  const [reviewSourceLabel, setReviewSourceLabel] = useState<string>("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compactMobile, setCompactMobile] = useState(true);
  const gamesPerPage = 10;

  const reviewMaxPlies = isPremium ? Number.POSITIVE_INFINITY : FREE_MAX_PLIES;
  const reviewShowAllArrows = isPremium;
  const reviewCacheUserId = isPremium ? userId : null;

  const openReviewForGame = (game: DbGame) => {
    setSelectedGame(game);
    setReviewSourceLabel(matchupTitleFromStoredGame(game));
    setReviewPgn(game.pgn);
  };

  const openReviewForAdhoc = (pgn: string) => {
    setSelectedGame(null);
    setReviewSourceLabel(t.review.import.adhocLabel);
    setReviewPgn(pgn);
  };

  const closeReview = () => {
    setReviewPgn(null);
    setSelectedGame(null);
    setReviewSourceLabel("");
  };

  const pgnFileInputRef = useRef<HTMLInputElement>(null);
  const pgnScanGen = useRef(0);
  const [pgnImportOpen, setPgnImportOpen] = useState(false);
  const [pgnPlayerName, setPgnPlayerName] = useState("");
  const [pgnNameOptions, setPgnNameOptions] = useState<string[]>([]);
  const [pgnFileScanning, setPgnFileScanning] = useState(false);
  const [pgnSelectedFile, setPgnSelectedFile] = useState<File | null>(null);
  const [pgnImporting, setPgnImporting] = useState(false);

  useEffect(() => {
    loadGames();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, searchTerm, filterResult, gameKindFilter]);

  function matchesArenaAwareResult(
    game: DbGame,
    filter: "win" | "loss" | "draw"
  ): boolean {
    if (isArenaBotVsBotGame(game)) {
      if (filter === "win") return game.result_type === "arena_white_wins";
      if (filter === "loss") return game.result_type === "arena_black_wins";
      if (filter === "draw") {
        return (
          game.result_type === "arena_move_limit" ||
          game.result_type.startsWith("arena_draw")
        );
      }
      return true;
    }
    return game.result === filter;
  }

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

  const handlePgnFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setPgnSelectedFile(f ?? null);
    setPgnPlayerName("");
    setPgnNameOptions([]);
    if (!f) {
      setPgnFileScanning(false);
      return;
    }
    if (f.size > MAX_PGN_FILE_BYTES) {
      setPgnFileScanning(false);
      toast.error(t.games.importPgnFileTooLarge);
      if (pgnFileInputRef.current) pgnFileInputRef.current.value = "";
      setPgnSelectedFile(null);
      return;
    }
    const gen = ++pgnScanGen.current;
    setPgnFileScanning(true);
    void f.text().then(
      (text) => {
        if (gen !== pgnScanGen.current) return;
        const names = listPlayerNamesFromPgn(text);
        setPgnNameOptions(names);
        if (names.length === 1) setPgnPlayerName(names[0]);
        setPgnFileScanning(false);
      },
      () => {
        if (gen !== pgnScanGen.current) return;
        setPgnNameOptions([]);
        setPgnFileScanning(false);
        toast.error(t.games.importPgnGenericError);
      }
    );
  };

  const handlePgnImport = async () => {
    if (!pgnSelectedFile) {
      toast.error(t.games.importPgnNoFile);
      return;
    }
    if (pgnFileScanning) return;
    if (pgnNameOptions.length === 0) {
      toast.error(t.games.importPgnNoNamesInFile);
      return;
    }
    if (!pgnPlayerName.trim()) {
      toast.error(t.games.importPgnSelectPlayer);
      return;
    }
    if (pgnSelectedFile.size > MAX_PGN_FILE_BYTES) {
      toast.error(t.games.importPgnFileTooLarge);
      return;
    }
    setPgnImporting(true);
    try {
      const text = await pgnSelectedFile.text();
      const { games } = parsePgnFileForGames(text, pgnPlayerName);
      if (games.length === 0) {
        toast.error(t.games.importPgnNoValidGames);
        return;
      }
      let ok = 0;
      let fail = 0;
      for (const payload of games) {
        try {
          await saveGameToCloud(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      await loadGames();
      await loadStats();
      setPgnImportOpen(false);
      setPgnSelectedFile(null);
      setPgnPlayerName("");
      setPgnNameOptions([]);
      if (pgnFileInputRef.current) pgnFileInputRef.current.value = "";
      if (fail === 0) {
        toast.success(t.games.importPgnSuccess.replace("{count}", String(ok)));
      } else {
        toast.message(
          t.games.importPgnPartial.replace("{ok}", String(ok)).replace("{fail}", String(fail))
        );
      }
    } catch {
      toast.error(t.games.importPgnGenericError);
    } finally {
      setPgnImporting(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...games];

    if (gameKindFilter === "human") {
      filtered = filtered.filter(isHumanVsBotOnly);
    } else if (gameKindFilter === "arena") {
      filtered = filtered.filter(isArenaBotVsBotGame);
    } else if (gameKindFilter === "pvp") {
      filtered = filtered.filter(isPvpOnlineGame);
    }

    if (filterResult !== "all") {
      filtered = filtered.filter((g) =>
        matchesArenaAwareResult(g, filterResult)
      );
    }

    if (searchTerm) {
      filtered = filtered.filter((g) =>
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

  // Multi-select helpers
  const toggleSelectGame = (gameId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentGames.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentGames.map(g => g.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const msg = t.games.confirmDeleteMultiple.replace('{count}', String(selectedIds.size));
    if (!confirm(msg)) return;

    for (const id of selectedIds) {
      await deleteGame(id);
    }
    setSelectedIds(new Set());
    loadGames();
    loadStats();
  };

  const handleBulkDownload = () => {
    if (selectedIds.size === 0) return;
    const selectedGames = filteredGames.filter(g => selectedIds.has(g.id));
    
    // Combine all PGNs into a single file
    const combinedPGN = selectedGames
      .map(g => g.pgn)
      .join('\n\n');
    
    const blob = new Blob([combinedPGN], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-avatar_${selectedGames.length}-games_${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getGameResultBadge = (game: DbGame) => {
    if (isArenaBotVsBotGame(game)) {
      let outcomeBadge: ReactNode;
      switch (game.result_type) {
        case "arena_white_wins":
          outcomeBadge = (
            <Badge className="bg-slate-100 text-slate-900">
              {t.games.arenaOutcomeWhite}
            </Badge>
          );
          break;
        case "arena_black_wins":
          outcomeBadge = (
            <Badge className="bg-slate-800 text-slate-100">
              {t.games.arenaOutcomeBlack}
            </Badge>
          );
          break;
        default:
          outcomeBadge = (
            <Badge className="bg-amber-700 text-white">
              {t.games.arenaOutcomeDraw}
            </Badge>
          );
      }
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className="border-violet-500 text-violet-300"
          >
            {t.games.badgeArenaBot}
          </Badge>
          {outcomeBadge}
        </div>
      );
    }
    switch (game.result) {
      case "win":
        return (
          <Badge className="bg-green-600 text-white">
            {t.games.resultBadgeYouWon}
          </Badge>
        );
      case "loss":
        return (
          <Badge className="bg-red-600 text-white">
            {t.games.resultBadgeYouLost}
          </Badge>
        );
      case "draw":
        return (
          <Badge className="bg-amber-600 text-white">
            {t.games.resultBadgeYouDraw}
          </Badge>
        );
      default:
        return <Badge>{game.result}</Badge>;
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

  if (reviewPgn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-6 px-3 md:px-4">
        <div className="max-w-[1500px] mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              onClick={closeReview}
              className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t.games.backToHub}
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              {selectedGame?.opponent_avatar && (
                <Image
                  src={selectedGame.opponent_avatar}
                  alt={selectedGame.opponent_name}
                  width={36}
                  height={36}
                  className="rounded-full shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-cyan-300 truncate">
                  {t.games.reviewing} · {reviewSourceLabel}
                </h1>
                {selectedGame && (
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{formatDate(selectedGame.created_at)}</span>
                    <span>•</span>
                    {getGameResultBadge(selectedGame)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedGame && (
                <Button
                  onClick={() => downloadPGN(selectedGame)}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PGN
                </Button>
              )}
            </div>
          </div>

          {!isPremium && (
            <Card className="bg-amber-900/20 border-amber-500/30">
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-amber-200">
                  {t.review.freeLimits
                    .replace("{depth}", String(12))
                    .replace("{plies}", String(FREE_MAX_PLIES))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpgrade(true)}
                  className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {t.review.upgradeForFull}
                </Button>
              </CardContent>
            </Card>
          )}

          <GameReviewer
            key={reviewPgn}
            pgn={reviewPgn}
            isPremium={isPremium}
            maxPlies={reviewMaxPlies}
            showAllBestArrows={reviewShowAllArrows}
            cacheUserId={reviewCacheUserId}
            onRequestUpgrade={() => setShowUpgrade(true)}
            showSavedInGamesList={!!selectedGame}
            authUserId={userId}
            reviewCloudSavePlayerHint={null}
            cloudSaveContext={{
              playerColor: selectedGame?.player_color,
              emailLocalPart: email?.split("@")[0] ?? null,
            }}
            onSavedToGamesCloud={() => {
              void loadGames();
              void loadStats();
            }}
          />
        </div>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          userId={userId}
          email={email}
          reason="coach"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold neon-cyan mb-2">{t.pages.games.title}</h1>
          <p className="text-cyan-400/70">{t.pages.games.subtitle}</p>
        </div>

        {/* Quick Game Review entry — analyse jetable, ne sauvegarde rien */}
        <section aria-label={t.games.quickReviewSection} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-lg md:text-xl font-bold text-cyan-300">
              {t.games.quickReviewSection}
            </h2>
            <p className="text-xs text-slate-400">
              {t.games.quickReviewSectionHint}
            </p>
          </div>
          <PgnImportCard onPgnReady={openReviewForAdhoc} />
        </section>

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
        <p className="text-xs text-slate-500 text-center -mt-2">
          {t.games.statsExcludeArena}
        </p>

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
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant={gameKindFilter === "all" ? "default" : "outline"}
                onClick={() => setGameKindFilter("all")}
                size="sm"
                className={
                  gameKindFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "border-slate-600"
                }
              >
                {t.games.filterGameKindAll}
              </Button>
              <Button
                type="button"
                variant={gameKindFilter === "human" ? "default" : "outline"}
                onClick={() => setGameKindFilter("human")}
                size="sm"
                className={
                  gameKindFilter === "human"
                    ? "bg-cyan-600 text-white"
                    : "border-slate-600"
                }
              >
                {t.games.filterGameKindHuman}
              </Button>
              <Button
                type="button"
                variant={gameKindFilter === "arena" ? "default" : "outline"}
                onClick={() => setGameKindFilter("arena")}
                size="sm"
                className={
                  gameKindFilter === "arena"
                    ? "bg-violet-600 text-white"
                    : "border-slate-600"
                }
              >
                {t.games.filterGameKindArena}
              </Button>
              <Button
                type="button"
                variant={gameKindFilter === "pvp" ? "default" : "outline"}
                onClick={() => setGameKindFilter("pvp")}
                size="sm"
                className={
                  gameKindFilter === "pvp"
                    ? "bg-emerald-600 text-white"
                    : "border-slate-600"
                }
              >
                {t.games.filterGameKindPvp}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-4 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPgnImportOpen(true)}
                className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 gap-2 w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                {t.games.importPgn}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des parties */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-cyan-100">
                {t.games.history} ({filteredGames.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={compactMobile ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompactMobile((v) => !v)}
                  className={`md:hidden text-xs ${compactMobile ? "bg-cyan-600" : "border-slate-600"}`}
                >
                  {lang === "fr" ? "Compact" : "Compact"}
                </Button>
                {currentGames.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-2"
                  >
                    {selectedIds.size === currentGames.length && currentGames.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-cyan-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span className="text-xs">
                      {selectedIds.size === currentGames.length && currentGames.length > 0
                        ? t.games.deselectAll
                        : t.games.selectAll}
                    </span>
                  </Button>
                )}
              </div>
            </div>
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
                <GameHistoryList
                  games={currentGames}
                  compact={compactMobile}
                  showBulkActions
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectGame}
                  onToggleSelectAll={toggleSelectAll}
                  onViewGame={openReviewForGame}
                  onDownload={downloadPGN}
                  onDelete={handleDelete}
                />

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

        <Dialog
          open={pgnImportOpen}
          onOpenChange={(open) => {
            setPgnImportOpen(open);
            if (!open) {
              pgnScanGen.current += 1;
              setPgnSelectedFile(null);
              setPgnPlayerName("");
              setPgnNameOptions([]);
              setPgnFileScanning(false);
              if (pgnFileInputRef.current) pgnFileInputRef.current.value = "";
            }
          }}
        >
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.games.importPgnTitle}</DialogTitle>
              <DialogDescription>{t.games.importPgnHint}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-300">{t.games.choosePgnFile}</Label>
                <input
                  ref={pgnFileInputRef}
                  type="file"
                  accept=".pgn,text/plain"
                  className="hidden"
                  onChange={handlePgnFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pgnFileInputRef.current?.click()}
                  className="w-full border-slate-600 text-slate-200"
                >
                  {pgnSelectedFile ? pgnSelectedFile.name : t.games.choosePgnFile}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pgn-player-select" className="text-slate-300">
                  {t.games.importPgnPickPlayer}
                </Label>
                {pgnFileScanning ? (
                  <p className="text-sm text-slate-500 flex items-center gap-2 min-h-10">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    {t.games.importPgnReadingFile}
                  </p>
                ) : (
                  <select
                    id="pgn-player-select"
                    value={pgnPlayerName}
                    onChange={(e) => setPgnPlayerName(e.target.value)}
                    disabled={!pgnSelectedFile || pgnNameOptions.length === 0}
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t.games.importPgnPickPlaceholder}</option>
                    {pgnNameOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPgnImportOpen(false)}
                disabled={pgnImporting}
                className="text-slate-400"
              >
                {t.games.cancelSelection}
              </Button>
              <Button
                type="button"
                onClick={() => void handlePgnImport()}
                disabled={
                  pgnImporting ||
                  pgnFileScanning ||
                  !pgnSelectedFile ||
                  !pgnPlayerName.trim()
                }
                className="bg-cyan-600 hover:bg-cyan-500"
              >
                {pgnImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.games.importPgnInProgress}
                  </>
                ) : (
                  t.games.importPgnButton
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Floating bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-900/30 backdrop-blur-sm">
              <span className="text-sm text-cyan-300 font-semibold whitespace-nowrap">
                {selectedIds.size} {t.games.selected}
              </span>
              
              <div className="w-px h-6 bg-slate-700" />

              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownload}
                className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 gap-1.5"
              >
                <Download className="h-4 w-4" />
                {t.games.downloadSelected}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                className="border-red-500/50 text-red-300 hover:bg-red-500/10 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                {t.games.deleteSelected}
              </Button>

              <div className="w-px h-6 bg-slate-700" />

              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-slate-400 hover:text-slate-200 p-1.5"
                title={t.games.cancelSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
