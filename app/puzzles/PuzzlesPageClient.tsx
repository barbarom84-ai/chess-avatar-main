"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import LichessPuzzlePlayer from "@/components/LichessPuzzlePlayer";
import MoveChallengeCard from "@/components/learn/MoveChallengeCard";
import PuzzleBoardSkeleton from "@/components/puzzles/PuzzleBoardSkeleton";
import PuzzlesModeRail, { type PuzzleMode } from "@/components/puzzles/PuzzlesModeRail";
import PuzzlesMetaPanel from "@/components/puzzles/PuzzlesMetaPanel";
import { useLanguage } from "@/lib/language-context";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import type { HistoricalGame } from "@/lib/opening-lessons";
import type { CloudPuzzlePayload } from "@/lib/cloud-puzzle";
import { fenAfterUciMoves, verboseMovesFromUciLine } from "@/lib/learn-chess-utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useSuperUser } from "@/hooks/useSuperUser";

export default function PuzzlesPageClient({
  historicalGames,
}: {
  historicalGames: HistoricalGame[];
}) {
  const { lang, t } = useLanguage();
  const p = t.puzzlesPage;
  const { isSuperUser, loading: superLoading } = useSuperUser();

  const [mode, setMode] = useState<PuzzleMode>("daily");
  const [booting, setBooting] = useState(true);

  const [daily, setDaily] = useState<NormalizedLichessPuzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [random, setRandom] = useState<NormalizedLichessPuzzle | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState<string | null>(null);

  const [selectedGameId, setSelectedGameId] = useState<string>(
    historicalGames[0]?.id ?? ""
  );
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    historicalGames[0]?.challenges?.[0]?.id ?? null
  );

  const [sessionLoading, setSessionLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const [cloudPuzzle, setCloudPuzzle] = useState<CloudPuzzlePayload | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const selectedGame = useMemo(
    () => historicalGames.find((g) => g.id === selectedGameId) ?? null,
    [historicalGames, selectedGameId]
  );

  const selectedChallenge = useMemo(() => {
    if (!selectedGame?.challenges?.length) return null;
    return (
      selectedGame.challenges.find((c) => c.id === selectedChallengeId) ??
      selectedGame.challenges[0] ??
      null
    );
  }, [selectedGame, selectedChallengeId]);

  const cloudCuratorLineMoves = useMemo(() => {
    if (!cloudPuzzle) return undefined;
    const hasStoredContinuation =
      Array.isArray(cloudPuzzle.solutionLineUci) &&
      cloudPuzzle.solutionLineUci.length > 0;
    if (cloudPuzzle.source !== "manual" && !hasStoredContinuation) return undefined;
    const uciLine = [
      cloudPuzzle.challenge.correctUci,
      ...(cloudPuzzle.solutionLineUci ?? []),
    ];
    const fen = fenAfterUciMoves(
      cloudPuzzle.uciMoves,
      cloudPuzzle.challenge.afterMoveCount
    );
    const moves = verboseMovesFromUciLine(fen, uciLine);
    return moves.length > 0 ? moves : undefined;
  }, [cloudPuzzle]);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const res = await fetch("/api/puzzles/daily");
      if (!res.ok) {
        setDailyError(p.dailyError);
        setDaily(null);
        return;
      }
      const data: unknown = await res.json();
      setDaily(data as NormalizedLichessPuzzle);
    } catch {
      setDailyError(p.dailyError);
      setDaily(null);
    } finally {
      setDailyLoading(false);
    }
  }, [p.dailyError]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    if (!dailyLoading) {
      const tmr = window.setTimeout(() => setBooting(false), 280);
      return () => window.clearTimeout(tmr);
    }
  }, [dailyLoading]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      return;
    }

    const sb = supabase;

    const refreshSession = async () => {
      setSessionLoading(true);
      try {
        const {
          data: { session },
        } = await sb.auth.getSession();
        setHasSession(!!session);
      } finally {
        setSessionLoading(false);
      }
    };

    void refreshSession();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const first = historicalGames.find((g) => g.id === selectedGameId);
    const firstId = first?.challenges?.[0]?.id ?? null;
    setSelectedChallengeId(firstId);
  }, [selectedGameId, historicalGames]);

  const fetchCloudPuzzle = useCallback(async () => {
    if (!supabase) return;
    setCloudLoading(true);
    setCloudError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/puzzles/cloud-random", { headers, cache: "no-store" });
      if (res.status === 401) {
        setCloudError(p.cloudPuzzleAuth);
        setCloudPuzzle(null);
        return;
      }
      if (!res.ok) {
        let msg = p.cloudPuzzleError;
        try {
          const j = (await res.json()) as { error?: string };
          if (typeof j.error === "string") msg = j.error;
        } catch {
          /* keep default */
        }
        setCloudError(msg);
        setCloudPuzzle(null);
        return;
      }
      const data: unknown = await res.json();
      setCloudPuzzle(data as CloudPuzzlePayload);
    } catch {
      setCloudError(p.cloudPuzzleError);
      setCloudPuzzle(null);
    } finally {
      setCloudLoading(false);
    }
  }, [p.cloudPuzzleAuth, p.cloudPuzzleError]);

  const fetchRandom = useCallback(async () => {
    setRandomLoading(true);
    setRandomError(null);
    try {
      const res = await fetch("/api/puzzles/random");
      if (!res.ok) {
        setRandomError(p.randomError);
        setRandom(null);
        return;
      }
      const data: unknown = await res.json();
      setRandom(data as NormalizedLichessPuzzle);
    } catch {
      setRandomError(p.randomError);
      setRandom(null);
    } finally {
      setRandomLoading(false);
    }
  }, [p.randomError]);

  const challengeLabels = {
    hint: t.learn.challenge.hint,
    nextHint: t.learn.challenge.nextHint,
    correct: t.learn.challenge.correct,
    wrong: t.learn.challenge.wrong,
    reveal: t.learn.challenge.reveal,
    tryAgain: t.learn.challenge.tryAgain,
    positionLabel: t.learn.challenge.positionLabel,
    playOnBoard: t.learn.challenge.playOnBoard,
  };

  const lichessLabels = {
    reset: p.lichess.reset,
    solved: p.lichess.solved,
    wrong: p.lichess.wrong,
    themes: p.lichess.themes,
    rating: p.lichess.rating,
    plays: p.lichess.plays,
    openOnLichess: p.lichess.openOnLichess,
    sideToMove: p.lichess.sideToMove,
    white: p.lichess.white,
    black: p.lichess.black,
  };

  const moveChallengeLichessLike = {
    sideToMove: p.lichess.sideToMove,
    white: p.lichess.white,
    black: p.lichess.black,
    reset: p.lichess.reset,
    choicesAid: p.lichessChoicesAid,
  };

  const activeLichess =
    mode === "daily" ? daily : mode === "random" ? random : null;

  const centerBusy =
    (mode === "daily" && dailyLoading) ||
    (mode === "random" && randomLoading) ||
    (mode === "community" && cloudLoading);

  const loadingMessage =
    mode === "daily"
      ? p.dailyLoading
      : mode === "random"
        ? p.randomLoading
        : mode === "community"
          ? p.cloudPuzzleLoading
          : undefined;

  if (booting && dailyLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          <BrandLoadingScreen label={p.brandLoadingLabel} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">{p.title}</h1>
            <p className="text-slate-500 text-xs">{p.subtitle}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_220px] xl:grid-cols-[300px_1fr_240px] 2xl:grid-cols-[320px_1fr_260px] gap-4">
          <div className="order-1 space-y-3">
            <PuzzlesModeRail
              mode={mode}
              onModeChange={setMode}
              showCommunity={isSupabaseConfigured}
              labels={{
                modeDaily: p.modeDaily,
                modeRandom: p.modeRandom,
                modeCatalog: p.modeCatalog,
                modeCommunity: p.modeCommunity,
                dailyDesc: p.dailyDesc,
                randomDesc: p.randomDesc,
                historicalDesc: p.historicalDesc,
                pickGame: p.pickGame,
                newRandom: p.newRandom,
                randomLoading: p.randomLoading,
                cloudPuzzleNew: p.cloudPuzzleNew,
                cloudPuzzleLoading: p.cloudPuzzleLoading,
                cloudPuzzleAuth: p.cloudPuzzleAuth,
                cloudPuzzleDesc: p.cloudPuzzleDesc,
                emptyFeatured: p.emptyFeatured,
                challengesHeading: p.challengesHeading,
              }}
              lang={lang}
              historicalGames={historicalGames}
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
              selectedChallengeId={selectedChallenge?.id ?? null}
              onSelectChallenge={setSelectedChallengeId}
              randomLoading={randomLoading}
              onFetchRandom={fetchRandom}
              cloudLoading={cloudLoading}
              onFetchCloud={fetchCloudPuzzle}
              hasSession={hasSession}
              sessionLoading={sessionLoading}
            />
          </div>

          <div className="order-2 lg:order-2">
            <Card className="theme-bg-secondary border-cyan-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-100">
                  {mode === "daily"
                    ? p.dailyTitle
                    : mode === "random"
                      ? p.randomTitle
                      : mode === "catalog"
                        ? p.modeCatalog
                        : p.cloudPuzzleTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {centerBusy && <PuzzleBoardSkeleton message={loadingMessage} />}

                {!centerBusy && mode === "daily" && dailyError && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-sm text-rose-300">{dailyError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={loadDaily}>
                      {p.retry}
                    </Button>
                  </div>
                )}

                {!centerBusy && mode === "daily" && daily && (
                  <LichessPuzzlePlayer
                    puzzle={daily}
                    labels={lichessLabels}
                    chrome="minimal"
                    hideLichessLink
                  />
                )}

                {!centerBusy && mode === "random" && randomError && (
                  <p className="text-sm text-rose-300 text-center py-4">{randomError}</p>
                )}

                {!centerBusy && mode === "random" && !random && !randomError && (
                  <p className="text-sm text-slate-500 text-center py-10">{p.startRandom}</p>
                )}

                {!centerBusy && mode === "random" && random && (
                  <LichessPuzzlePlayer
                    key={random.puzzleId}
                    puzzle={random}
                    labels={lichessLabels}
                    chrome="minimal"
                    hideLichessLink
                  />
                )}

                {!centerBusy && mode === "catalog" && !selectedChallenge && (
                  <p className="text-sm text-slate-500 text-center py-10">
                    {historicalGames.length === 0 ? p.emptyFeatured : p.pickAChallenge}
                  </p>
                )}

                {!centerBusy && mode === "catalog" && selectedGame && selectedChallenge && (
                  <MoveChallengeCard
                    key={selectedChallenge.id}
                    challenge={selectedChallenge}
                    uciMoves={selectedGame.uciMoves}
                    lang={lang}
                    labels={challengeLabels}
                    presentation="embedded"
                    lichessLike={moveChallengeLichessLike}
                  />
                )}

                {!centerBusy && mode === "community" && cloudError && (
                  <p className="text-sm text-rose-300/95 text-center py-4">{cloudError}</p>
                )}

                {!centerBusy &&
                  mode === "community" &&
                  !cloudPuzzle &&
                  !cloudError &&
                  hasSession !== false && (
                    <p className="text-sm text-slate-500 text-center py-10">{p.startCommunity}</p>
                  )}

                {!centerBusy && mode === "community" && hasSession === false && (
                  <p className="text-sm text-slate-500 text-center py-10">{p.cloudPuzzleAuth}</p>
                )}

                {!centerBusy && mode === "community" && cloudPuzzle && (
                  <MoveChallengeCard
                    key={cloudPuzzle.challenge.id}
                    challenge={cloudPuzzle.challenge}
                    uciMoves={cloudPuzzle.uciMoves}
                    lang={lang}
                    labels={challengeLabels}
                    presentation="embedded"
                    lichessLike={moveChallengeLichessLike}
                    curatorLineVerboseMoves={cloudCuratorLineMoves}
                    curatorLinePrefix={p.curatorInsightPrefix}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-3">
            <PuzzlesMetaPanel
              mode={mode}
              labels={{
                openLearn: p.openLearn,
                openOnLichess: p.lichess.openOnLichess,
                communityManualLink: p.communityManual.link,
                rating: p.lichess.rating,
                plays: p.lichess.plays,
                themes: p.lichess.themes,
                modeDaily: p.modeDaily,
                modeRandom: p.modeRandom,
                modeCatalog: p.modeCatalog,
                modeCommunity: p.modeCommunity,
                modeLabel: p.modeLabel,
              }}
              lang={lang}
              historyMetaTemplate={t.learn.detail.historyMeta}
              lichessPuzzle={activeLichess}
              selectedGame={selectedGame}
              showAdminLink={!!isSuperUser && !superLoading && mode === "community"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
