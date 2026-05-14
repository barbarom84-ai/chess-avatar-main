"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Filter, LayoutGrid, Library, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";
import { pickLocalized } from "@/lib/opening-lessons";
import { lessonWithMergedOpening } from "@/lib/learn-merge";
import { useLearnCatalog } from "@/hooks/useLearnCatalog";
import { useSuperUser } from "@/hooks/useSuperUser";
import OpeningLevelBadge from "@/components/learn/OpeningLevelBadge";
import { getAggregatedOpenings } from "@/lib/openings-registry";
import { getOpeningName, type Opening } from "@/lib/openings-library";

type ColorFilter = "all" | "white" | "black" | "both";
type LevelFilter = "all" | "1" | "2" | "3" | "4" | "5";

function dedupeOpeningsByFirstId(openings: Opening[]): Opening[] {
  const seen = new Set<string>();
  const out: Opening[] = [];
  for (const o of openings) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    out.push(o);
  }
  return out;
}

export default function LearnHubPage() {
  const { lang, t } = useLanguage();
  const { catalog, loading: catalogLoading } = useLearnCatalog();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [color, setColor] = useState<ColorFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [character, setCharacter] = useState<string>("all");

  const lessonIdsSet = useMemo(() => new Set(catalog.lessons.map((l) => l.openingId)), [catalog.lessons]);
  const { coreLessonIds, syntheticOpeningIds, cloudOpeningIds } = catalog;

  const catalogOpeningsSorted = useMemo(() => {
    const uniq = dedupeOpeningsByFirstId(getAggregatedOpenings());
    const byId = new Map(uniq.map((o) => [o.id, o] as const));
    for (const [id, o] of catalog.openingById) {
      if (!byId.has(id)) byId.set(id, o);
    }
    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
      const eco = a.eco.localeCompare(b.eco);
      if (eco !== 0) return eco;
      return getOpeningName(a, lang).localeCompare(getOpeningName(b, lang), lang === "fr" ? "fr" : "en");
    });
    return merged;
  }, [lang, catalog.openingById]);

  const filteredCatalogRows = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalogOpeningsSorted.filter((o) => {
      if (!q) return true;
      const name = getOpeningName(o, lang).toLowerCase();
      const hay = [
        name,
        o.eco.toLowerCase(),
        o.id.toLowerCase(),
        o.nameEn?.toLowerCase() ?? "",
        ...(o.tags ?? []).map((x) => x.toLowerCase()),
      ].join(" ");
      return hay.includes(q);
    });
  }, [catalogOpeningsSorted, catalogSearch, lang]);

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
  const tc = t.learn.catalog;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <BookOpen className="h-11 w-11 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold neon-cyan">{t.pages.learn.title}</h1>
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

        <Tabs defaultValue="lessons" className="gap-6">
          <TabsList className="w-full flex-wrap h-auto justify-start gap-1 p-1 bg-slate-900/80 border border-slate-700">
            <TabsTrigger value="lessons" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              {tc.lessonsTab}
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Library className="h-4 w-4" />
              {tc.openingsTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-8 mt-0">
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
                  const cloud = cloudOpeningIds.has(lesson.openingId);
                  const guided = coreLessonIds.has(lesson.openingId);
                  const repertoireAuto = syntheticOpeningIds.has(lesson.openingId);
                  return (
                    <Card key={lesson.openingId} className="theme-bg-secondary theme-border flex flex-col">
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-amber-400/90">
                            {t.learn.eco} {opening.eco}
                          </span>
                          <OpeningLevelBadge difficulty={opening.difficulty} labels={labels} />
                          {guided && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                              {tc.hasLessonBadge}
                            </span>
                          )}
                          {!guided && repertoireAuto && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-950/70 text-amber-200 border border-amber-800/50">
                              {tc.repertoireAutoBadge}
                            </span>
                          )}
                          {!guided && !repertoireAuto && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-sky-950/70 text-sky-200 border border-sky-800/50">
                              {tc.customLessonBadge}
                            </span>
                          )}
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
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4 mt-0">
            <p className="text-sm text-slate-400 max-w-3xl">{tc.intro}</p>
            <div className="space-y-2 max-w-md">
              <Label>{t.common.search}</Label>
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={tc.searchPlaceholder}
                className="bg-slate-950 border-slate-700"
              />
            </div>
            <p className="text-sm text-slate-500">
              {tc.countListed.replace("{count}", String(filteredCatalogRows.length))}
            </p>
            <div className="rounded-lg border border-slate-700 overflow-hidden theme-bg-secondary">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-950/90 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">{t.learn.eco}</th>
                      <th className="px-3 py-2 font-medium min-w-[12rem]">{lang === "fr" ? "Ouverture" : "Opening"}</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">{t.learn.filters.character}</th>
                      <th className="px-3 py-2 font-medium">{tc.lessonsTab}</th>
                      <th className="px-3 py-2 font-medium text-right">{lang === "fr" ? "Action" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalogRows.map((o) => {
                      const hasLesson = lessonIdsSet.has(o.id);
                      const guided = coreLessonIds.has(o.id);
                      const repertoireAuto = syntheticOpeningIds.has(o.id);
                      const title = getOpeningName(o, lang);
                      const cloud = cloudOpeningIds.has(o.id);
                      return (
                        <tr key={o.id} className="border-b border-slate-800/80 hover:bg-slate-900/40">
                          <td className="px-3 py-2 font-mono text-amber-400/90 whitespace-nowrap">{o.eco}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-100">{title}</span>
                            <span className="block text-[11px] text-slate-500 font-mono">{o.id}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 capitalize hidden sm:table-cell">{o.character}</td>
                          <td className="px-3 py-2">
                            {hasLesson ? (
                              <>
                                {guided ? (
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                                    {tc.hasLessonBadge}
                                  </span>
                                ) : repertoireAuto ? (
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-amber-950/70 text-amber-200 border border-amber-800/50">
                                    {tc.repertoireAutoBadge}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-sky-950/70 text-sky-200 border border-sky-800/50">
                                    {tc.customLessonBadge}
                                  </span>
                                )}
                                {cloud && (
                                  <span className="ml-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-700/50">
                                    {t.learn.admin.cloudBadge}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-slate-800 text-slate-400 border border-slate-700">
                                {tc.noLessonBadge}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {hasLesson ? (
                              <Button asChild size="sm" variant="outline" className="border-cyan-700/60 text-cyan-200">
                                <Link href={`/learn/openings/${o.id}`}>{t.learn.filters.openLesson}</Link>
                              </Button>
                            ) : isSuperUser && !superLoading ? (
                              <Button asChild size="sm" variant="ghost" className="text-amber-200/90">
                                <Link href={`/learn/admin/edit/${o.id}`}>{t.learn.admin.newLesson}</Link>
                              </Button>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
