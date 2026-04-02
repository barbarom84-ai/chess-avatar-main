"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";
import { getLesson, lessonWithOpening, pickLocalized } from "@/lib/opening-lessons";
import OpeningLevelBadge from "@/components/learn/OpeningLevelBadge";
import LessonChessboard from "@/components/learn/LessonChessboard";
import HistoricGameSection from "@/components/learn/HistoricGameSection";

export default function OpeningLessonPage() {
  const params = useParams();
  const openingId = params.openingId as string;
  const { lang, t } = useLanguage();
  const lesson = getLesson(openingId);
  const [modelMoveIndex, setModelMoveIndex] = useState(0);

  const { opening, title } = useMemo(() => {
    if (!lesson) return { opening: undefined, title: "" };
    return lessonWithOpening(lesson, lang);
  }, [lesson, lang]);

  const labels = t.learn.difficultyLabels as [string, string, string, string, string];
  const commentaryLabels = {
    moveLabel: t.learn.commentary.move,
    of: t.learn.commentary.of,
    noComment: t.learn.commentary.noComment,
  };

  const modelComments = lesson?.modelLine.map((m) => m.comment);
  const modelUci = lesson?.modelLine.map((m) => m.uci) ?? [];

  if (!lesson || !opening) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">{t.learn.detail.notFound}</p>
        <Button asChild variant="outline">
          <Link href="/learn">{t.learn.detail.backToHub}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-cyan-400">
            <Link href="/learn" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.learn.detail.backToHub}
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <BookOpen className="h-10 w-10 text-cyan-400 shrink-0 mt-1" />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-mono text-amber-400/90">
                {t.learn.eco} {opening.eco}
              </span>
              <OpeningLevelBadge difficulty={opening.difficulty} labels={labels} />
            </div>
            <h1 className="text-3xl font-bold neon-cyan">{title}</h1>
            <p className="text-slate-400 mt-2 max-w-2xl">{pickLocalized(lesson.hook, lang)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-cyan-600/50">
            <Link href="/">{t.learn.detail.useInRepertoire}</Link>
          </Button>
          <p className="text-xs text-slate-500 self-center max-w-md">{t.learn.detail.useInRepertoireHint}</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-950 border border-slate-800 p-1">
            <TabsTrigger value="overview">{t.learn.detail.tabs.overview}</TabsTrigger>
            <TabsTrigger value="ideas">{t.learn.detail.tabs.ideas}</TabsTrigger>
            <TabsTrigger value="traps">{t.learn.detail.tabs.traps}</TabsTrigger>
            <TabsTrigger value="model">{t.learn.detail.tabs.modelLine}</TabsTrigger>
            <TabsTrigger value="history">{t.learn.detail.tabs.history}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.recommendedFor}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 leading-relaxed">
                {pickLocalized(lesson.recommendedFor, lang)}
              </CardContent>
            </Card>
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.tabs.overview}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 leading-relaxed">
                {pickLocalized(lesson.overview, lang)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideas" className="mt-4 space-y-4">
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.mainIdeas}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {lesson.mainIdeas.map((x, i) => (
                    <li key={i}>{pickLocalized(x, lang)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.typicalPlans}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {lesson.typicalPlans.map((x, i) => (
                    <li key={i}>{pickLocalized(x, lang)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traps" className="mt-4 space-y-4">
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.traps}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {lesson.traps.map((x, i) => (
                    <li key={i}>{pickLocalized(x, lang)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.remember}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {lesson.whatToRemember.map((x, i) => (
                    <li key={i}>{pickLocalized(x, lang)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model" className="mt-4 space-y-4">
            <Card className="theme-bg-secondary theme-border">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-200">{t.learn.detail.modelLineTitle}</CardTitle>
                <p className="text-sm text-slate-500">{t.learn.detail.modelLineHint}</p>
              </CardHeader>
              <CardContent>
                <LessonChessboard
                  uciMoves={modelUci}
                  comments={modelComments}
                  lang={lang}
                  commentaryLabels={commentaryLabels}
                  moveIndex={modelMoveIndex}
                  onMoveIndexChange={setModelMoveIndex}
                  orientation={opening.color === "black" ? "black" : "white"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-6">
            {lesson.historicalGames.length === 0 ? (
              <p className="text-slate-500">{t.learn.detail.historyEmpty}</p>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-cyan-200">{t.learn.detail.historyTitle}</h2>
                {lesson.historicalGames.map((g) => (
                  <HistoricGameSection
                    key={g.id}
                    game={g}
                    lang={lang}
                    commentaryLabels={commentaryLabels}
                    metaTemplate={t.learn.detail.historyMeta}
                  />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
