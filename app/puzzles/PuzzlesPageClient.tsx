"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LichessPuzzlePlayer from "@/components/LichessPuzzlePlayer";
import MoveChallengeCard from "@/components/learn/MoveChallengeCard";
import { useLanguage } from "@/lib/language-context";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import type { HistoricalGame } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import { getUserGames, type DbGame } from "@/lib/supabase-storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

  const [daily, setDaily] = useState<NormalizedLichessPuzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [random, setRandom] = useState<NormalizedLichessPuzzle | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState<string | null>(null);

  const [selectedGameId, setSelectedGameId] = useState<string>(
    historicalGames[0]?.id ?? ""
  );

  const [avatarGames, setAvatarGames] = useState<DbGame[]>([]);
  const [avatarGamesLoading, setAvatarGamesLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const selectedGame = useMemo(
    () => historicalGames.find((g) => g.id === selectedGameId) ?? null,
    [historicalGames, selectedGameId]
  );

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
    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      setAvatarGames([]);
      return;
    }

    const sb = supabase;

    const refreshAvatarGames = async () => {
      setAvatarGamesLoading(true);
      try {
        const {
          data: { session },
        } = await sb.auth.getSession();
        const signedIn = !!session;
        setHasSession(signedIn);
        if (!signedIn) {
          setAvatarGames([]);
          return;
        }
        const rows = await getUserGames(10);
        setAvatarGames(rows);
      } finally {
        setAvatarGamesLoading(false);
      }
    };

    refreshAvatarGames();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      refreshAvatarGames();
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const formatCloudDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [lang]
  );

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

  return (
    <main className="min-h-screen theme-gradient theme-text-primary px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-100 tracking-tight">
            {p.title}
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
            {isSupabaseConfigured && (
              <p className="text-xs text-slate-500 leading-relaxed">{p.avatarGamesIntro}</p>
            )}
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
                  <h2 className="text-sm font-semibold text-cyan-100/90">{p.avatarGamesTitle}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.avatarGamesDesc}</p>
                </div>

                {avatarGamesLoading && (
                  <p className="text-sm text-slate-500">{p.avatarGamesLoading}</p>
                )}

                {!avatarGamesLoading && hasSession === false && (
                  <div className="rounded-lg border border-dashed border-slate-600/80 bg-slate-900/30 px-4 py-3 space-y-3">
                    <p className="text-sm text-slate-400">{p.avatarGamesGuest}</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/profile">{t.profile.signIn}</Link>
                    </Button>
                  </div>
                )}

                {!avatarGamesLoading && hasSession === true && avatarGames.length === 0 && (
                  <p className="text-sm text-slate-500">{p.avatarGamesEmpty}</p>
                )}

                {!avatarGamesLoading && hasSession === true && avatarGames.length > 0 && (
                  <ul className="space-y-2">
                    {avatarGames.map((g) => (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-200 font-medium truncate max-w-[min(100%,14rem)]">
                          {g.opponent_name}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={
                              g.result === "win"
                                ? "border-emerald-700/60 text-emerald-300"
                                : g.result === "loss"
                                  ? "border-rose-700/60 text-rose-300"
                                  : "border-slate-600 text-slate-400"
                            }
                          >
                            {g.result === "win"
                              ? t.victory
                              : g.result === "loss"
                                ? t.defeat
                                : t.draw}
                          </Badge>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {formatCloudDate(g.created_at)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/games">{p.avatarGamesCta}</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="text-slate-400">
                    <Link href="/play">{p.playVsAvatar}</Link>
                  </Button>
                </div>
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
