"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import FetchErrorState from "@/components/FetchErrorState";
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
import {
  classifyFetchFailure,
  fetchErrorCopy,
  withTimeout,
} from "@/lib/fetch-errors";
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

  const puzzleFailCopy = useMemo(
    () => ({
      offline: p.offlineError,
      timeout: p.timeoutError,
      network: p.networkError,
      generic: p.dailyError,
    }),
    [p.dailyError, p.networkError, p.offlineError, p.timeoutError]
  );

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const res = await withTimeout(fetch("/api/puzzles/daily"), 15_000);
      if (!res.ok) {
        setDailyError(
          fetchErrorCopy(classifyFetchFailure(null, res.status).kind, {
            ...puzzleFailCopy,
            generic: p.dailyError,
          })
        );
        setDaily(null);
        return;
      }
      const data: unknown = await res.json();
      setDaily(data as NormalizedLichessPuzzle);
    } catch (err) {
      setDailyError(
        fetchErrorCopy(classifyFetchFailure(err).kind, {
          ...puzzleFailCopy,
          generic: p.dailyError,
        })
      );
      setDaily(null);
    } finally {
      setDailyLoading(false);
    }
  }, [p.dailyError, puzzleFailCopy]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    if (!dailyLoading) {
      const tmr = window.setTimeout(() => setBooting(false), 280);
      return () => window.clearTimeout(tmr);
    }
    // Escape hatch: never leave the branded loader forever
    const escape = window.setTimeout(() => setBooting(false), 16_000);
    return () => window.clearTimeout(escape);
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
      const res = await withTimeout(
        fetch("/api/puzzles/cloud-random", { headers, cache: "no-store" }),
        15_000
      );
      if (res.status === 401) {
        setCloudError(p.cloudPuzzleAuth);
        setCloudPuzzle(null);
        return;
      }
      if (!res.ok) {
        setCloudError(
          fetchErrorCopy(classifyFetchFailure(null, res.status).kind, {
            ...puzzleFailCopy,
            generic: p.cloudPuzzleError,
          })
        );
        setCloudPuzzle(null);
        return;
      }
      const data: unknown = await res.json();
      setCloudPuzzle(data as CloudPuzzlePayload);
    } catch (err) {
      setCloudError(
        fetchErrorCopy(classifyFetchFailure(err).kind, {
          ...puzzleFailCopy,
          generic: p.cloudPuzzleError,
        })
      );
      setCloudPuzzle(null);
    } finally {
      setCloudLoading(false);
    }
  }, [p.cloudPuzzleAuth, p.cloudPuzzleError, puzzleFailCopy]);

  const fetchRandom = useCallback(async () => {
    setRandomLoading(true);
    setRandomError(null);
    try {
      const res = await withTimeout(fetch("/api/puzzles/random"), 15_000);
      if (!res.ok) {
        setRandomError(
          fetchErrorCopy(classifyFetchFailure(null, res.status).kind, {
            ...puzzleFailCopy,
            generic: p.randomError,
          })
        );
        setRandom(null);
        return;
      }
      const data: unknown = await res.json();
      setRandom(data as NormalizedLichessPuzzle);
    } catch (err) {
      setRandomError(
        fetchErrorCopy(classifyFetchFailure(err).kind, {
          ...puzzleFailCopy,
          generic: p.randomError,
        })
      );
      setRandom(null);
    } finally {
      setRandomLoading(false);
    }
  }, [p.randomError, puzzleFailCopy]);

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
                  <FetchErrorState
                    title={p.dailyTitle}
                    message={dailyError}
                    offline={/offline|hors ligne/i.test(dailyError)}
                    retryLabel={p.retry}
                    onRetry={() => void loadDaily()}
                  />
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
                  <FetchErrorState
                    title={p.randomTitle}
                    message={randomError}
                    offline={/offline|hors ligne/i.test(randomError)}
                    retryLabel={p.retry}
                    onRetry={() => void fetchRandom()}
                  />
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
                  <FetchErrorState
                    title={p.cloudPuzzleTitle}
                    message={cloudError}
                    offline={/offline|hors ligne/i.test(cloudError)}
                    retryLabel={p.retry}
                    onRetry={
                      cloudError === p.cloudPuzzleAuth
                        ? undefined
                        : () => void fetchCloudPuzzle()
                    }
                  />
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
