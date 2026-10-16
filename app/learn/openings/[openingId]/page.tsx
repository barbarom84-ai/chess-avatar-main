"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import FetchErrorState from "@/components/FetchErrorState";
import LessonChessboard from "@/components/learn/LessonChessboard";
import LearnModeRail, { type LearnMode } from "@/components/learn/LearnModeRail";
import LearnMetaPanel from "@/components/learn/LearnMetaPanel";
import MoveChallengeCard from "@/components/learn/MoveChallengeCard";
import { useLanguage } from "@/lib/language-context";
import { pickLocalized } from "@/lib/opening-lessons";
import { lessonWithMergedOpening } from "@/lib/learn-merge";
import { useLearnCatalog } from "@/hooks/useLearnCatalog";
import { useSuperUser } from "@/hooks/useSuperUser";

export default function OpeningLessonPage() {
  const params = useParams();
  const openingId = params.openingId as string;
  const { lang, t } = useLanguage();
  const {
    catalog,
    loading: catalogLoading,
    error: catalogError,
    cloudDegraded,
    refetch,
  } = useLearnCatalog();
  const isRepertoireAuto = catalog.syntheticOpeningIds.has(openingId);
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const lesson = useMemo(
    () => catalog.lessons.find((l) => l.openingId === openingId),
    [catalog.lessons, openingId]
  );
  const errCopy = t.learn.errors;

  const { opening, title } = useMemo(() => {
    if (!lesson) return { opening: undefined, title: "" };
    return lessonWithMergedOpening(lesson, catalog.openingById, lang);
  }, [lesson, lang, catalog.openingById]);

  const labels = t.learn.difficultyLabels as [string, string, string, string, string];
  const d = t.learn.detail;
  const commentaryLabels = {
    moveLabel: t.learn.commentary.move,
    of: t.learn.commentary.of,
    noComment: t.learn.commentary.noComment,
  };

  const modelComments = lesson?.modelLine.map((m) => m.comment);
  const modelUci = lesson?.modelLine.map((m) => m.uci) ?? [];
  const hasModel = modelUci.length > 0;
  const variants = lesson?.variants ?? [];
  const games = lesson?.historicalGames ?? [];
  const flatChallenges = useMemo(
    () =>
      (lesson?.historicalGames ?? []).flatMap((g) =>
        (g.challenges ?? []).map((c) => ({ game: g, challenge: c }))
      ),
    [lesson]
  );

  const [mode, setMode] = useState<LearnMode>("study");
  const [modelMoveIndex, setModelMoveIndex] = useState(0);
  const [variantMoveIndex, setVariantMoveIndex] = useState(0);
  const [historyMoveIndex, setHistoryMoveIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedChallengeKey, setSelectedChallengeKey] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    setMode(lesson.modelLine.length > 0 ? "model" : "study");
    setModelMoveIndex(0);
    setSelectedVariantId(lesson.variants?.[0]?.id ?? null);
    setVariantMoveIndex(0);
    const firstChallenge = lesson.historicalGames.flatMap((g) =>
      (g.challenges ?? []).map((c) => ({ game: g, challenge: c }))
    )[0];
    setSelectedChallengeKey(
      firstChallenge
        ? `${firstChallenge.game.id}:${firstChallenge.challenge.id}`
        : null
    );
    setSelectedGameId(lesson.historicalGames[0]?.id ?? null);
    setHistoryMoveIndex(0);
  }, [lesson?.openingId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset selection when navigating lessons

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null,
    [variants, selectedVariantId]
  );

  const selectedChallenge = useMemo(() => {
    if (!selectedChallengeKey) return flatChallenges[0] ?? null;
    return (
      flatChallenges.find(
        ({ game, challenge }) => `${game.id}:${challenge.id}` === selectedChallengeKey
      ) ??
      flatChallenges[0] ??
      null
    );
  }, [flatChallenges, selectedChallengeKey]);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? games[0] ?? null,
    [games, selectedGameId]
  );

  const boardOrientation = opening?.color === "black" ? "black" : "white";

  const ch = t.learn.challenge;
  const challengeLabels = {
    hint: ch?.hint ?? "Hint",
    nextHint: ch?.nextHint ?? "Next hint",
    correct: ch?.correct ?? "Correct",
    wrong: ch?.wrong ?? "Try again.",
    reveal: ch?.reveal ?? "Show solution",
    tryAgain: ch?.tryAgain ?? "Reset",
    positionLabel: ch?.positionLabel ?? "Position before the move to find",
    playOnBoard: ch?.playOnBoard,
  };

  const moveChallengeLichessLike = {
    sideToMove: t.puzzlesPage.lichess.sideToMove,
    white: t.puzzlesPage.lichess.white,
    black: t.puzzlesPage.lichess.black,
    reset: t.puzzlesPage.lichess.reset,
    choicesAid: t.puzzlesPage.lichessChoicesAid,
  };

  if (catalogLoading && !lesson) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          <BrandLoadingScreen label={t.learn.brandLoadingLabel} />
        </div>
      </main>
    );
  }

  if (!lesson || !opening) {
    const loadFailed = cloudDegraded && !!catalogError;
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4">
        {loadFailed ? (
          <FetchErrorState
            offline={catalogError.kind === "offline"}
            title={errCopy.lessonLoadTitle}
            message={
              catalogError.kind === "offline"
                ? errCopy.lessonLoadOffline
                : errCopy.lessonLoadGeneric
            }
            retryLabel={errCopy.retry}
            onRetry={() => void refetch()}
            secondaryHref="/learn"
            secondaryLabel={d.backToHub}
          />
        ) : (
          <>
            <p className="text-slate-400">{d.notFound}</p>
            <Button asChild variant="outline">
              <Link href="/learn">{d.backToHub}</Link>
            </Button>
          </>
        )}
      </main>
    );
  }

  const hook = pickLocalized(lesson.hook, lang);

  const metaExtra = (() => {
    if (mode === "variants" && selectedVariant) {
      return selectedVariant.description
        ? pickLocalized(selectedVariant.description, lang)
        : pickLocalized(selectedVariant.title, lang);
    }
    if (mode === "challenges" && selectedChallenge) {
      return `${pickLocalized(selectedChallenge.game.event, lang)} · ${selectedChallenge.game.white} – ${selectedChallenge.game.black}`;
    }
    if (mode === "history" && selectedGame) {
      return d.historyMeta
        .replace("{white}", selectedGame.white)
        .replace("{black}", selectedGame.black)
        .replace("{event}", pickLocalized(selectedGame.event, lang))
        .replace("{date}", selectedGame.date)
        .replace("{result}", selectedGame.result);
    }
    return null;
  })();

  const centerTitle =
    mode === "study"
      ? d.modeStudy
      : mode === "model"
        ? d.modelLineTitle
        : mode === "variants"
          ? selectedVariant
            ? pickLocalized(selectedVariant.title, lang)
            : d.modeVariants
          : mode === "challenges"
            ? d.modeChallenges
            : d.modeHistory;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="sm" className="text-cyan-400 shrink-0">
              <Link href="/learn" className="flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                {d.backToHub}
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">
                {title}
              </h1>
              <p className="text-slate-500 text-xs line-clamp-1">{hook}</p>
            </div>
          </div>
          {isSuperUser && !superLoading && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-600/50 text-amber-200/90 gap-1.5"
            >
              <Link href={`/learn/admin/edit/${openingId}`}>
                <Shield className="h-3.5 w-3.5" />
                {t.learn.admin.editThisLesson}
              </Link>
            </Button>
          )}
        </header>

        {isRepertoireAuto && (
          <p className="text-xs text-amber-100/85 rounded-lg border border-amber-800/50 bg-amber-950/25 px-3 py-2 leading-relaxed">
            {d.repertoireAutoNotice}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_220px] xl:grid-cols-[300px_1fr_240px] 2xl:grid-cols-[320px_1fr_260px] gap-4">
          <div className="order-1">
            <LearnModeRail
              mode={mode}
              onModeChange={setMode}
              labels={{
                modeStudy: d.modeStudy,
                modeModel: d.modeModel,
                modeVariants: d.modeVariants,
                modeChallenges: d.modeChallenges,
                modeHistory: d.modeHistory,
                studyHint: d.studyHint,
                modelLineHint: d.modelLineHint,
                pickVariant: d.pickVariant,
                pickChallenge: d.pickChallenge,
                pickGame: d.pickGame,
                variantsEmpty: d.variantsEmpty,
                challengesEmpty: d.challengesEmpty,
                historyEmpty: d.historyEmpty,
              }}
              lang={lang}
              hasModel={hasModel}
              variants={variants}
              selectedVariantId={selectedVariant?.id ?? null}
              onSelectVariant={(id) => {
                setSelectedVariantId(id);
                setVariantMoveIndex(0);
                setMode("variants");
              }}
              challenges={flatChallenges}
              selectedChallengeKey={
                selectedChallenge
                  ? `${selectedChallenge.game.id}:${selectedChallenge.challenge.id}`
                  : null
              }
              onSelectChallenge={(key) => {
                setSelectedChallengeKey(key);
                setMode("challenges");
              }}
              games={games}
              selectedGameId={selectedGame?.id ?? null}
              onSelectGame={(id) => {
                setSelectedGameId(id);
                setHistoryMoveIndex(0);
                setMode("history");
              }}
            />
          </div>

          <div className="order-2">
            <Card className="theme-bg-secondary border-cyan-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-100">{centerTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === "study" && (
                  <div className="space-y-5 text-sm text-slate-300 leading-relaxed max-h-[min(70vh,720px)] overflow-y-auto pr-1">
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.recommendedFor}
                      </h3>
                      <p>{pickLocalized(lesson.recommendedFor, lang)}</p>
                    </section>
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.tabs.overview}
                      </h3>
                      <p>{pickLocalized(lesson.overview, lang)}</p>
                    </section>
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.mainIdeas}
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lesson.mainIdeas.map((x, i) => (
                          <li key={i}>{pickLocalized(x, lang)}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.typicalPlans}
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lesson.typicalPlans.map((x, i) => (
                          <li key={i}>{pickLocalized(x, lang)}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.traps}
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lesson.traps.map((x, i) => (
                          <li key={i}>{pickLocalized(x, lang)}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                        {d.remember}
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lesson.whatToRemember.map((x, i) => (
                          <li key={i}>{pickLocalized(x, lang)}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}

                {mode === "model" && hasModel && (
                  <LessonChessboard
                    uciMoves={modelUci}
                    comments={modelComments}
                    lang={lang}
                    commentaryLabels={commentaryLabels}
                    moveIndex={modelMoveIndex}
                    onMoveIndexChange={setModelMoveIndex}
                    orientation={boardOrientation}
                  />
                )}

                {mode === "variants" && selectedVariant && (
                  <LessonChessboard
                    key={selectedVariant.id}
                    uciMoves={selectedVariant.line.map((m) => m.uci)}
                    comments={selectedVariant.line.map((m) => m.comment)}
                    lang={lang}
                    commentaryLabels={commentaryLabels}
                    moveIndex={variantMoveIndex}
                    onMoveIndexChange={setVariantMoveIndex}
                    orientation={boardOrientation}
                  />
                )}

                {mode === "variants" && !selectedVariant && (
                  <p className="text-sm text-slate-500 text-center py-10">{d.variantsEmpty}</p>
                )}

                {mode === "challenges" && selectedChallenge && (
                  <MoveChallengeCard
                    key={`${selectedChallenge.game.id}-${selectedChallenge.challenge.id}`}
                    challenge={selectedChallenge.challenge}
                    uciMoves={selectedChallenge.game.uciMoves}
                    lang={lang}
                    labels={challengeLabels}
                    presentation="embedded"
                    lichessLike={moveChallengeLichessLike}
                  />
                )}

                {mode === "challenges" && !selectedChallenge && (
                  <p className="text-sm text-slate-500 text-center py-10">
                    {d.challengesEmpty}
                  </p>
                )}

                {mode === "history" && selectedGame && (
                  <div className="space-y-3">
                    {selectedGame.anecdote && (
                      <blockquote className="border-l-4 border-amber-600/60 pl-3 text-slate-300 text-sm leading-relaxed italic">
                        {pickLocalized(selectedGame.anecdote, lang)}
                      </blockquote>
                    )}
                    <LessonChessboard
                      key={selectedGame.id}
                      uciMoves={selectedGame.uciMoves}
                      historicalAnnotations={selectedGame.annotations}
                      lang={lang}
                      commentaryLabels={commentaryLabels}
                      moveIndex={historyMoveIndex}
                      onMoveIndexChange={setHistoryMoveIndex}
                    />
                  </div>
                )}

                {mode === "history" && !selectedGame && (
                  <p className="text-sm text-slate-500 text-center py-10">{d.historyEmpty}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-3">
            <LearnMetaPanel
              mode={mode}
              labels={{
                modeLabel: d.modeLabel,
                modeStudy: d.modeStudy,
                modeModel: d.modeModel,
                modeVariants: d.modeVariants,
                modeChallenges: d.modeChallenges,
                modeHistory: d.modeHistory,
                eco: t.learn.eco,
                useInRepertoire: d.useInRepertoire,
                useInRepertoireHint: d.useInRepertoireHint,
                backToHub: d.backToHub,
                editLesson: t.learn.admin.editThisLesson,
              }}
              title={title}
              hook={hook}
              opening={opening}
              difficultyLabels={labels}
              metaExtra={metaExtra}
              showAdminEdit={!!isSuperUser && !superLoading}
              openingId={openingId}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
