"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getLesson } from "@/lib/opening-lessons";
import { getOpeningById } from "@/lib/openings-library";
import {
  minimalLesson,
  minimalOpening,
  validateLearnPair,
  validateOpeningJson,
  validateOpeningLessonJson,
} from "@/lib/learn-merge";
import { useSuperUser } from "@/hooks/useSuperUser";
import { toast } from "sonner";

export default function LearnAdminEditPage() {
  const params = useParams();
  const openingId = params.openingId as string;
  const router = useRouter();
  const { t } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [openingText, setOpeningText] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hasCloudRow, setHasCloudRow] = useState(false);

  const loadInitial = useCallback(async () => {
    if (!openingId || !isSupabaseConfigured || !supabase) {
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("learn_entries")
      .select("opening_json, lesson_json")
      .eq("opening_id", openingId)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLoaded(true);
      return;
    }

    if (data?.opening_json != null && data?.lesson_json != null) {
      setOpeningText(JSON.stringify(data.opening_json, null, 2));
      setLessonText(JSON.stringify(data.lesson_json, null, 2));
      setHasCloudRow(true);
    } else {
      const staticLesson = getLesson(openingId);
      const staticOp = getOpeningById(openingId);
      if (staticOp && staticLesson) {
        setOpeningText(JSON.stringify(staticOp, null, 2));
        setLessonText(JSON.stringify(staticLesson, null, 2));
      } else {
        setOpeningText(JSON.stringify(minimalOpening(openingId), null, 2));
        setLessonText(JSON.stringify(minimalLesson(openingId), null, 2));
      }
      setHasCloudRow(false);
    }
    setLoaded(true);
  }, [openingId]);

  useEffect(() => {
    if (isSuperUser && !superLoading) {
      loadInitial();
    }
  }, [isSuperUser, superLoading, loadInitial]);

  const reloadBuiltin = () => {
    const staticLesson = getLesson(openingId);
    const staticOp = getOpeningById(openingId);
    if (staticOp && staticLesson) {
      setOpeningText(JSON.stringify(staticOp, null, 2));
      setLessonText(JSON.stringify(staticLesson, null, 2));
      toast.success("OK");
    } else {
      toast.error(t.learn.admin.notFoundBuiltin);
    }
  };

  const handleSave = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Supabase non configuré.");
      return;
    }
    let op: unknown;
    let le: unknown;
    try {
      op = JSON.parse(openingText);
      le = JSON.parse(lessonText);
    } catch {
      toast.error(t.learn.admin.parseError);
      return;
    }
    if (!validateOpeningJson(op) || !validateOpeningLessonJson(le)) {
      toast.error(t.learn.admin.invalidJson);
      return;
    }
    const pairErr = validateLearnPair(openingId, op, le);
    if (pairErr) {
      toast.error(pairErr);
      return;
    }

    const { error } = await supabase.from("learn_entries").upsert(
      {
        opening_id: openingId,
        opening_json: op,
        lesson_json: le,
      },
      { onConflict: "opening_id" },
    );

    if (error) {
      toast.error(error.message);
      return;
    }
    setHasCloudRow(true);
    toast.success(t.learn.admin.saved);
  };

  const handleDelete = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!confirm(t.learn.admin.deleteConfirm)) return;
    const { error } = await supabase.from("learn_entries").delete().eq("opening_id", openingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OK");
    router.push("/learn/admin");
  };

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
        <Button asChild variant="outline">
          <Link href="/learn">{t.learn.admin.backToLearn}</Link>
        </Button>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex items-center justify-center">
        <p className="text-slate-400">{t.learn.loadingCatalog}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 pb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-cyan-400">
            <Link href="/learn/admin" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.learn.admin.title}
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold neon-cyan">
            {t.learn.admin.editorTitle}{" "}
            <span className="font-mono text-amber-300/90">{openingId}</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-3xl">{t.learn.admin.editorHint}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} className="bg-cyan-700 hover:bg-cyan-600">
            {t.learn.admin.save}
          </Button>
          <Button type="button" variant="outline" onClick={reloadBuiltin}>
            {t.learn.admin.copyFromBuiltin}
          </Button>
          {hasCloudRow && (
            <Button
              type="button"
              variant="destructive"
              className="gap-2 bg-red-950 border border-red-800 hover:bg-red-900"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t.learn.admin.deleteCloud}
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-1">
          <Card className="theme-bg-secondary theme-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cyan-200">{t.learn.admin.openingJson}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={openingText}
                onChange={(e) => setOpeningText(e.target.value)}
                spellCheck={false}
                className="w-full min-h-[280px] rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200"
              />
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cyan-200">{t.learn.admin.lessonJson}</CardTitle>
              <CardDescription className="text-xs theme-text-secondary">{t.learn.admin.lessonJsonHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
                spellCheck={false}
                className="w-full min-h-[420px] rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
