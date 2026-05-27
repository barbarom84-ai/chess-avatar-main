"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LichessPuzzlePlayer from "@/components/LichessPuzzlePlayer";
import MoveChallengeCard from "@/components/learn/MoveChallengeCard";
import { useLanguage } from "@/lib/language-context";
import {
  parseLichessPuzzleResponse,
  type NormalizedLichessPuzzle,
} from "@/lib/lichess-puzzle";
import type { HistoricalGame } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import type { CloudPuzzlePayload } from "@/lib/cloud-puzzle";
import { fenAfterUciMoves, verboseMovesFromUciLine } from "@/lib/learn-chess-utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useSuperUser } from "@/hooks/useSuperUser";

function GameSummary({
  game,
  lang,
  metaTemplate,
}: {
  game: HistoricalGame;
  lang: "fr" | "en";
  metaTemplate: string;
}) {
  const event = pickLocalized(game.event, lang);
  const meta = metaTemplate
    .replace("{white}", game.white)
    .replace("{black}", game.black)
    .replace("{event}", event)
    .replace("{date}", game.date)
    .replace("{result}", game.result);
  return (
    <p className="text-sm text-slate-300 border border-slate-700/80 rounded-md px-3 py-2 bg-slate-900/40">
      {meta}
    </p>
  );
}

export default function PuzzlesPageClient({
  historicalGames,
}: {
  historicalGames: HistoricalGame[];
}) {
  const { lang, t } = useLanguage();
  const p = t.puzzlesPage;
  const puzzlesTitle = t.pages.puzzles.title;
  const { isSuperUser, loading: superLoading } = useSuperUser();

  const [daily, setDaily] = useState<NormalizedLichessPuzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [random, setRandom] = useState<NormalizedLichessPuzzle | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState<string | null>(null);

  const [selectedGameId, setSelectedGameId] = useState<string>(
    historicalGames[0]?.id ?? ""
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
      const puzzle = parseLichessPuzzleResponse(data);
      if (!puzzle) {
        setDailyError(p.dailyError);
        setDaily(null);
        return;
      }
      setDaily(puzzle);
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
        let msg: string = p.cloudPuzzleError;
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
      const puzzle = parseLichessPuzzleResponse(data);
      if (!puzzle) {
        setRandomError(p.randomError);
        setRandom(null);
        return;
      }
      setRandom(puzzle);
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

  return (
    <main className="min-h-screen theme-gradient theme-text-primary px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-100 tracking-tight">
            {puzzlesTitle}
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {p.subtitle}
          </p>
        </header>

        {/* ChessAvatar — contenu principal */}
        <Card className="theme-bg-secondary theme-border border-cyan-600/35 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15">
          <CardHeader className="space-y-3">
            <Badge
              variant="outline"
              className="w-fit border-cyan-500/50 bg-cyan-950/40 text-cyan-200/95 text-[11px] uppercase tracking-wider"
            >
              {p.chessAvatarBadge}
            </Badge>
            <CardTitle className="text-xl md:text-2xl text-cyan-50">
              {p.featuredSectionTitle}
            </CardTitle>
            <CardDescription className="text-slate-400 text-base leading-relaxed">
              {p.featuredSectionDesc}
            </CardDescription>
            <div className="pt-1">
              <Button asChild variant="secondary" size="sm" className="gap-1.5">
                <Link href="/learn">{p.openLearn}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {historicalGames.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-700 rounded-lg px-4">
                {p.emptyFeatured}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">
                    {p.pickGame}
                  </label>
                  <select
                    className="w-full max-w-lg rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/40"
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                  >
                    {historicalGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.white} — {g.black} ({g.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-cyan-100/90">{p.historicalTitle}</h2>
                  <p className="text-xs text-slate-500">{p.historicalDesc}</p>
                </div>

                {selectedGame && (
                  <>
                    <GameSummary
                      game={selectedGame}
                      lang={lang}
                      metaTemplate={t.learn.detail.historyMeta}
                    />
                    <h3 className="text-sm font-semibold text-amber-200/90">
                      {t.learn.detail.challengesInGame}
                    </h3>
                    <div className="space-y-6">
                      {selectedGame.challenges?.map((c) => (
                        <MoveChallengeCard
                          key={c.id}
                          challenge={c}
                          uciMoves={selectedGame.uciMoves}
                          lang={lang}
                          labels={challengeLabels}
                          presentation="lichess"
                          lichessLike={moveChallengeLichessLike}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {isSupabaseConfigured && (
              <div className="pt-8 mt-2 border-t border-slate-700/80 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-cyan-100/90">{p.cloudPuzzleTitle}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.cloudPuzzleDesc}</p>
                  {isSuperUser && !superLoading && (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-amber-400/95">
                      <Link href="/puzzles/admin/community">{p.communityManual.link}</Link>
                    </Button>
                  )}
                </div>

                {!sessionLoading && hasSession === false && (
                  <p className="text-sm text-slate-500">{p.cloudPuzzleAuth}</p>
                )}

                {!sessionLoading && hasSession === true && (
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cloudLoading}
                      onClick={() => fetchCloudPuzzle()}
                      className="border-cyan-700/50 text-cyan-200 hover:bg-cyan-950/40"
                    >
                      {cloudLoading ? p.cloudPuzzleLoading : p.cloudPuzzleNew}
                    </Button>
                    {cloudError && (
                      <p className="text-sm text-rose-300/95">{cloudError}</p>
                    )}
                    {cloudPuzzle && (
                      <MoveChallengeCard
                        key={cloudPuzzle.challenge.id}
                        challenge={cloudPuzzle.challenge}
                        uciMoves={cloudPuzzle.uciMoves}
                        lang={lang}
                        labels={challengeLabels}
                        presentation="lichess"
                        lichessLike={moveChallengeLichessLike}
                        curatorLineVerboseMoves={cloudCuratorLineMoves}
                        curatorLinePrefix={p.curatorInsightPrefix}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lichess — complément */}
        <Card className="theme-bg-secondary theme-border border-slate-700/70">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="text-lg text-slate-200">{p.lichessSectionTitle}</CardTitle>
            <CardDescription className="leading-relaxed">{p.lichessSectionDesc}</CardDescription>
            <p className="text-xs text-slate-500 pt-1">{p.sourceLichess}</p>
          </CardHeader>
          <CardContent className="space-y-10 pt-2">
            <section className="space-y-4 border-b border-slate-800/90 pb-10">
              <div>
                <h3 className="text-base font-medium text-cyan-100/90">{p.dailyTitle}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.dailyDesc}</p>
              </div>
              {dailyLoading && (
                <p className="text-sm text-slate-400 text-center py-6">{p.dailyLoading}</p>
              )}
              {dailyError && !dailyLoading && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-rose-300">{dailyError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={loadDaily}>
                    {p.retry}
                  </Button>
                </div>
              )}
              {daily && !dailyLoading && (
                <LichessPuzzlePlayer puzzle={daily} labels={lichessLabels} />
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-slate-100">{p.randomTitle}</h3>
                  <p className="text-sm text-slate-500 mt-1">{p.randomDesc}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={randomLoading}
                  onClick={() => fetchRandom()}
                  className="shrink-0"
                >
                  {randomLoading ? p.randomLoading : p.newRandom}
                </Button>
              </div>
              {randomError && (
                <p className="text-sm text-rose-300 text-center">{randomError}</p>
              )}
              {random && (
                <LichessPuzzlePlayer key={random.puzzleId} puzzle={random} labels={lichessLabels} />
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
