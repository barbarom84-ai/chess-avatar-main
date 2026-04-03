"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Filter, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { pickLocalized } from "@/lib/opening-lessons";
import { lessonWithMergedOpening } from "@/lib/learn-merge";
import { useLearnCatalog } from "@/hooks/useLearnCatalog";
import { useSuperUser } from "@/hooks/useSuperUser";
import OpeningLevelBadge from "@/components/learn/OpeningLevelBadge";

type ColorFilter = "all" | "white" | "black" | "both";
type LevelFilter = "all" | "1" | "2" | "3" | "4" | "5";

export default function LearnHubPage() {
  const { lang, t } = useLanguage();
  const { catalog, loading: catalogLoading } = useLearnCatalog();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [search, setSearch] = useState("");
  const [color, setColor] = useState<ColorFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [character, setCharacter] = useState<string>("all");

  const characters = useMemo(() => {
    const s = new Set<string>();
    for (const lesson of catalog.lessons) {
      const o = catalog.openingById.get(lesson.openingId);
      if (o) s.add(o.character);
    }
    return Array.from(s).sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.lessons.filter((lesson) => {
      const { opening, title } = lessonWithMergedOpening(lesson, catalog.openingById, lang);
      if (!opening) return false;
      if (color !== "all" && opening.color !== color) return false;
      if (level !== "all" && String(opening.difficulty) !== level) return false;
      if (character !== "all" && opening.character !== character) return false;
      if (q) {
        const hay = [
          title.toLowerCase(),
          opening.eco.toLowerCase(),
          opening.nameEn?.toLowerCase() ?? "",
          ...opening.tags.map((x) => x.toLowerCase()),
        ].join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, color, level, character, lang, catalog]);

  const labels = t.learn.difficultyLabels as [string, string, string, string, string];

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <BookOpen className="h-11 w-11 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold neon-cyan">{t.learn.title}</h1>
            {isSuperUser && !superLoading && (
              <Button asChild variant="outline" size="sm" className="border-amber-600/50 text-amber-200/90 gap-2">
                <Link href="/learn/admin">
                  <Shield className="h-4 w-4" />
                  {t.learn.admin.hubLink}
                </Link>
              </Button>
            )}
          </div>
          <p className="text-cyan-200/70 max-w-2xl mx-auto">{t.learn.subtitle}</p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">{t.learn.hubIntro}</p>
          {catalogLoading && (
            <p className="text-xs text-slate-500">{t.learn.loadingCatalog}</p>
          )}
        </div>

        <Card className="theme-bg-secondary theme-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-400" />
              {t.common.filter}
            </CardTitle>
            <CardDescription className="theme-text-secondary">{t.learn.filters.searchPlaceholder}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t.common.search}</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.learn.filters.searchPlaceholder}
                className="bg-slate-950 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.learn.filters.allColors}</Label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as ColorFilter)}
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200"
              >
                <option value="all">{t.learn.filters.allColors}</option>
                <option value="white">{t.learn.filters.white}</option>
                <option value="black">{t.learn.filters.black}</option>
                <option value="both">{t.learn.filters.both}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.learn.filters.allLevels}</Label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelFilter)}
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200"
              >
                <option value="all">{t.learn.filters.allLevels}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {labels[n - 1]} ({n}/5)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.learn.filters.character}</Label>
              <select
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200"
              >
                <option value="all">{t.learn.filters.allCharacters}</option>
                {characters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <Button type="button" variant="outline" onClick={() => {
                setSearch("");
                setColor("all");
                setLevel("all");
                setCharacter("all");
              }}>
                {t.learn.filters.clearFilters}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-500">
          {filtered.length} {t.learn.filters.lessonsCount}
        </p>

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-12">{t.learn.filters.noResults}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lesson) => {
              const { opening, title } = lessonWithMergedOpening(lesson, catalog.openingById, lang);
              if (!opening) return null;
              const cloud = catalog.cloudOpeningIds.has(lesson.openingId);
              return (
                <Card key={lesson.openingId} className="theme-bg-secondary theme-border flex flex-col">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-amber-400/90">
                        {t.learn.eco} {opening.eco}
                      </span>
                      <OpeningLevelBadge difficulty={opening.difficulty} labels={labels} />
                      {cloud && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-700/50">
                          {t.learn.admin.cloudBadge}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                    <CardDescription className="theme-text-secondary line-clamp-3">
                      {pickLocalized(lesson.hook, lang)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500">
                      <Link href={`/learn/openings/${lesson.openingId}`}>
                        {t.learn.filters.openLesson}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
