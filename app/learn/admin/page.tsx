"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { OPENING_LESSONS } from "@/lib/opening-lessons";
import { lessonWithMergedOpening } from "@/lib/learn-merge";
import { useLearnCatalog } from "@/hooks/useLearnCatalog";
import { useSuperUser } from "@/hooks/useSuperUser";

const BUILTIN_IDS = new Set(OPENING_LESSONS.map((l) => l.openingId));

export default function LearnAdminHubPage() {
  const { lang, t } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const { catalog, loading: catalogLoading } = useLearnCatalog();

  const rows = useMemo(() => {
    return [...catalog.lessons].sort((a, b) => a.openingId.localeCompare(b.openingId));
  }, [catalog.lessons]);

  if (superLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex items-center justify-center">
        <p className="text-slate-400">…</p>
      </main>
    );
  }

  if (!isSuperUser) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">{t.learn.admin.accessDenied}</p>
        <p className="text-sm text-slate-500">{t.learn.admin.signInHint}</p>
        <Button asChild variant="outline">
          <Link href="/learn">{t.learn.admin.backToLearn}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-cyan-400">
            <Link href="/learn" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.learn.admin.backToLearn}
            </Link>
          </Button>
          <Button asChild className="bg-amber-700 hover:bg-amber-600 gap-2">
            <Link href="/learn/admin/new">
              <Plus className="h-4 w-4" />
              {t.learn.admin.newLesson}
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold neon-cyan">{t.learn.admin.title}</h1>
          <p className="text-slate-400 mt-2 max-w-3xl">{t.learn.admin.subtitle}</p>
          {catalogLoading && <p className="text-xs text-slate-500 mt-2">{t.learn.loadingCatalog}</p>}
        </div>

        <Card className="theme-bg-secondary theme-border">
          <CardHeader>
            <CardTitle className="text-lg text-cyan-200">{t.learn.title}</CardTitle>
            <CardDescription className="theme-text-secondary">
              {rows.length} {t.learn.filters.lessonsCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-4 font-medium">{t.learn.admin.tableOpeningId}</th>
                  <th className="py-2 pr-4 font-medium">{t.learn.admin.tableTitle}</th>
                  <th className="py-2 pr-4 font-medium">{t.learn.admin.tableSource}</th>
                  <th className="py-2 font-medium w-28">{t.learn.admin.edit}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lesson) => {
                  const { title } = lessonWithMergedOpening(lesson, catalog.openingById, lang);
                  const cloud = catalog.cloudOpeningIds.has(lesson.openingId);
                  const builtin = BUILTIN_IDS.has(lesson.openingId);
                  const repertoireAuto = catalog.syntheticOpeningIds.has(lesson.openingId);
                  let source = t.learn.admin.sourceBuiltin;
                  if (cloud && builtin) source = t.learn.admin.sourceCloudOverride;
                  else if (cloud && !builtin) source = t.learn.admin.sourceCloudOnly;
                  else if (repertoireAuto) source = t.learn.admin.sourceRepertoireAuto;

                  return (
                    <tr key={lesson.openingId} className="border-b border-slate-800/80">
                      <td className="py-2 pr-4 font-mono text-amber-200/90">{lesson.openingId}</td>
                      <td className="py-2 pr-4 text-slate-200">{title}</td>
                      <td className="py-2 pr-4 text-slate-400">{source}</td>
                      <td className="py-2">
                        <Button asChild size="sm" variant="outline" className="gap-1">
                          <Link href={`/learn/admin/edit/${lesson.openingId}`}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t.learn.admin.edit}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
