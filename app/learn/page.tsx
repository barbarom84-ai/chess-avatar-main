"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Library, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import OpeningLevelBadge from "@/components/learn/OpeningLevelBadge";
import { useLanguage } from "@/lib/language-context";
import { pickLocalized } from "@/lib/opening-lessons";
import { lessonWithMergedOpening } from "@/lib/learn-merge";
import { useLearnCatalog } from "@/hooks/useLearnCatalog";
import { useSuperUser } from "@/hooks/useSuperUser";
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

  const lessonIdsSet = useMemo(
    () => new Set(catalog.lessons.map((l) => l.openingId)),
    [catalog.lessons]
  );
  const { coreLessonIds, syntheticOpeningIds, cloudOpeningIds } = catalog;

  const catalogOpeningsSorted = useMemo(() => {
    const uniq = dedupeOpeningsByFirstId(getAggregatedOpenings());
    const byId = new Map(uniq.map((o) => [o.id, o] as const));
    for (const [id, o] of catalog.openingById) {
      if (!byId.has(id)) byId.set(id, o);
    }
    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
      const eco = (a.eco ?? "").localeCompare(b.eco ?? "");
      if (eco !== 0) return eco;
      return getOpeningName(a, lang).localeCompare(
        getOpeningName(b, lang),
        lang === "fr" ? "fr" : "en"
      );
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
      const { opening, title } = lessonWithMergedOpening(
        lesson,
        catalog.openingById,
        lang
      );
      if (!opening) return false;
      if (color !== "all" && opening.color !== color) return false;
      if (level !== "all" && String(opening.difficulty) !== level) return false;
      if (character !== "all" && opening.character !== character) return false;
      if (q) {
        const hay = [
          title.toLowerCase(),
          opening.eco?.toLowerCase() ?? "",
          opening.nameEn?.toLowerCase() ?? "",
          ...(opening.tags ?? []).map((x) => x.toLowerCase()),
        ].join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, color, level, character, lang, catalog]);

  const labels = t.learn.difficultyLabels as [string, string, string, string, string];
  const tc = t.learn.catalog;

  if (catalogLoading && catalog.lessons.length === 0) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          <BrandLoadingScreen label={t.learn.brandLoadingLabel} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">{t.learn.title}</h1>
            <p className="text-slate-500 text-xs max-w-xl">{t.learn.subtitle}</p>
          </div>
          {isSuperUser && !superLoading && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-600/50 text-amber-200/90 gap-1.5"
            >
              <Link href="/learn/admin">
                <Shield className="h-3.5 w-3.5" />
                {t.learn.admin.hubLink}
              </Link>
            </Button>
          )}
        </header>

        <Tabs defaultValue="lessons" className="gap-4">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto justify-start gap-1 p-1 bg-slate-950/80 border border-slate-800">
            <TabsTrigger value="lessons" className="gap-1.5 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" />
              {tc.lessonsTab}
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 text-xs">
              <Library className="h-3.5 w-3.5" />
              {tc.openingsTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="mt-0 space-y-3">
            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/40 p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.learn.filters.searchPlaceholder}
                className="bg-slate-950 border-slate-700 lg:col-span-2 h-9 text-sm"
              />
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as ColorFilter)}
                className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                aria-label={t.learn.filters.allColors}
              >
                <option value="all">{t.learn.filters.allColors}</option>
                <option value="white">{t.learn.filters.white}</option>
                <option value="black">{t.learn.filters.black}</option>
                <option value="both">{t.learn.filters.both}</option>
              </select>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelFilter)}
                className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                aria-label={t.learn.filters.allLevels}
              >
                <option value="all">{t.learn.filters.allLevels}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {labels[n - 1]} ({n}/5)
                  </option>
                ))}
              </select>
              <select
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                aria-label={t.learn.filters.character}
              >
                <option value="all">{t.learn.filters.allCharacters}</option>
                {characters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500">
              {filtered.length} {t.learn.filters.lessonsCount}
              {catalogLoading ? ` · ${t.learn.loadingCatalog}` : ""}
            </p>

            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm">
                {t.learn.filters.noResults}
              </p>
            ) : (
              <ul className="rounded-xl border border-slate-800/80 divide-y divide-slate-800/80 overflow-hidden bg-slate-950/30">
                {filtered.map((lesson) => {
                  const { opening, title } = lessonWithMergedOpening(
                    lesson,
                    catalog.openingById,
                    lang
                  );
                  if (!opening) return null;
                  const cloud = cloudOpeningIds.has(lesson.openingId);
                  const guided = coreLessonIds.has(lesson.openingId);
                  const repertoireAuto = syntheticOpeningIds.has(lesson.openingId);
                  return (
                    <li key={lesson.openingId}>
                      <Link
                        href={`/learn/openings/${lesson.openingId}`}
                        className="flex flex-wrap items-center gap-3 px-3 py-3 hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-mono text-amber-400/90">
                              {t.learn.eco} {opening.eco}
                            </span>
                            <OpeningLevelBadge
                              difficulty={opening.difficulty}
                              labels={labels}
                            />
                            {guided && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                                {tc.hasLessonBadge}
                              </span>
                            )}
                            {!guided && repertoireAuto && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-200 border border-amber-800/50">
                                {tc.repertoireAutoBadge}
                              </span>
                            )}
                            {!guided && !repertoireAuto && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-200 border border-sky-800/50">
                                {tc.customLessonBadge}
                              </span>
                            )}
                            {cloud && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-700/50">
                                {t.learn.admin.cloudBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-100">{title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {pickLocalized(lesson.hook, lang)}
                          </p>
                        </div>
                        <span className="text-xs text-cyan-400 shrink-0">
                          {t.learn.filters.openLesson} →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="catalog" className="mt-0 space-y-3">
            <p className="text-xs text-slate-400 max-w-3xl">{tc.intro}</p>
            <Input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder={tc.searchPlaceholder}
              className="bg-slate-950 border-slate-700 max-w-md h-9 text-sm"
            />
            <p className="text-xs text-slate-500">
              {tc.countListed.replace("{count}", String(filteredCatalogRows.length))}
            </p>
            <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/30">
              <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-slate-950/95 text-slate-300 border-b border-slate-800 z-10">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap text-xs">
                        {t.learn.eco}
                      </th>
                      <th className="px-3 py-2 font-medium min-w-[12rem] text-xs">
                        {tc.openingCol}
                      </th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell text-xs">
                        {t.learn.filters.character}
                      </th>
                      <th className="px-3 py-2 font-medium text-xs">{tc.lessonsTab}</th>
                      <th className="px-3 py-2 font-medium text-right text-xs">
                        {tc.actionCol}
                      </th>
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
                        <tr
                          key={o.id}
                          className="border-b border-slate-800/60 hover:bg-slate-900/40"
                        >
                          <td className="px-3 py-2 font-mono text-amber-400/90 whitespace-nowrap text-xs">
                            {o.eco}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-100 text-sm">{title}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">
                              {o.id}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 capitalize hidden sm:table-cell text-xs">
                            {o.character}
                          </td>
                          <td className="px-3 py-2">
                            {hasLesson ? (
                              <>
                                {guided ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                                    {tc.hasLessonBadge}
                                  </span>
                                ) : repertoireAuto ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-amber-950/70 text-amber-200 border border-amber-800/50">
                                    {tc.repertoireAutoBadge}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-sky-950/70 text-sky-200 border border-sky-800/50">
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
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                {tc.noLessonBadge}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {hasLesson ? (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border-cyan-700/60 text-cyan-200 h-8 text-xs"
                              >
                                <Link href={`/learn/openings/${o.id}`}>
                                  {t.learn.filters.openLesson}
                                </Link>
                              </Button>
                            ) : isSuperUser && !superLoading ? (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="text-amber-200/90 h-8 text-xs"
                              >
                                <Link href={`/learn/admin/edit/${o.id}`}>
                                  {t.learn.admin.newLesson}
                                </Link>
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
