"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, HelpCircle, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getLesson } from "@/lib/opening-lessons";
import { getOpeningById } from "@/lib/openings-registry";
import {
  minimalLesson,
  minimalOpening,
  validateLearnPair,
  validateOpeningJson,
  validateOpeningLessonJson,
} from "@/lib/learn-merge";
import { useSuperUser } from "@/hooks/useSuperUser";
import { toast } from "sonner";
import {
  parsePgnBlock,
  sanOfMoveAt,
  splitPgnGames,
  suggestWrongMoves,
  uciSequenceToSan,
  type ParsedPgn,
} from "@/lib/pgn-to-uci";

interface ParsedGameDraft {
  id: string;
  parsed: ParsedPgn;
  selected: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Build a draft `HistoricalGame` (with bilingual placeholders) from a parsed PGN block. */
function parsedToDraftHistoricalGame(parsed: ParsedPgn, openingId: string, index: number) {
  const headers = parsed.headers;
  const white = headers.White ?? "?";
  const black = headers.Black ?? "?";
  const date = headers.Date ?? "—";
  const eventText = headers.Event ?? `${openingId}-game-${index + 1}`;
  const baseId = slugify(`${white}-${black}-${date}`) || `${openingId}-game-${index + 1}`;
  return {
    id: baseId,
    white,
    black,
    result: headers.Result ?? parsed.result ?? "*",
    date,
    event: { fr: eventText, en: eventText },
    uciMoves: parsed.uciMoves,
    annotations: parsed.moveComments.map((c) => ({
      afterMoveIndex: c.afterMoveIndex,
      text: { fr: c.text, en: c.text },
    })),
  };
}

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
  const [pgnUrl, setPgnUrl] = useState("");
  const [pgnText, setPgnText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [parsedDrafts, setParsedDrafts] = useState<ParsedGameDraft[]>([]);
  const [pgnSourceLabel, setPgnSourceLabel] = useState<string | null>(null);

  const [quizGameId, setQuizGameId] = useState<string>("");
  const [quizPly, setQuizPly] = useState<number>(0);
  const [quizCorrectUci, setQuizCorrectUci] = useState<string>("");
  const [quizWrong, setQuizWrong] = useState<string[]>(["", "", ""]);
  const [quizPromptFr, setQuizPromptFr] = useState("");
  const [quizPromptEn, setQuizPromptEn] = useState("");
  const [quizHintFr, setQuizHintFr] = useState("");
  const [quizHintEn, setQuizHintEn] = useState("");
  const [quizInsightFr, setQuizInsightFr] = useState("");
  const [quizInsightEn, setQuizInsightEn] = useState("");
  const [quizId, setQuizId] = useState<string>("");

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

  const formatTemplate = useCallback((template: string, vars: Record<string, string | number>): string => {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
  }, []);

  const parsePgnBuffer = useCallback(
    (raw: string, sourceLabel: string | null) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        toast.error(t.learn.admin.addGameNoGames);
        setParsedDrafts([]);
        setPgnSourceLabel(null);
        return;
      }
      const blocks = splitPgnGames(trimmed);
      const drafts: ParsedGameDraft[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const parsed = parsePgnBlock(blocks[i]);
        if (!parsed) continue;
        drafts.push({ id: `${i}-${Date.now()}`, parsed, selected: drafts.length === 0 });
      }
      if (drafts.length === 0) {
        toast.error(t.learn.admin.addGameNoGames);
        setParsedDrafts([]);
        setPgnSourceLabel(null);
        return;
      }
      setParsedDrafts(drafts);
      setPgnSourceLabel(sourceLabel);
    },
    [t.learn.admin.addGameNoGames],
  );

  const handleParsePastedPgn = () => {
    parsePgnBuffer(pgnText, null);
  };

  const handleFetchUrl = async () => {
    const trimmed = pgnUrl.trim();
    if (!trimmed) {
      toast.error(t.learn.admin.addGameInvalidUrl);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Supabase non configuré.");
      return;
    }
    setFetching(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error(t.learn.admin.accessDenied);
        return;
      }
      const res = await fetch("/api/pgn-fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | { pgn?: string; sourceLabel?: string; gameCount?: number; error?: string }
        | null;
      if (!data) {
        toast.error(t.learn.admin.addGameFetchError);
        return;
      }
      if (!res.ok) {
        const code = data.error;
        const map: Record<string, string> = {
          INVALID_URL: t.learn.admin.addGameInvalidUrl,
          UNSUPPORTED_HOST: t.learn.admin.addGameUnsupportedHost,
          UNSUPPORTED_URL_FOR_HOST: t.learn.admin.addGameUnsupportedUrl,
          PGN_TOO_LARGE: t.learn.admin.addGamePgnTooLarge,
        };
        toast.error((code && map[code]) || t.learn.admin.addGameFetchError);
        return;
      }
      if (!data.pgn) {
        toast.error(t.learn.admin.addGameNoGames);
        return;
      }
      setPgnText(data.pgn);
      parsePgnBuffer(data.pgn, data.sourceLabel ?? null);
    } catch {
      toast.error(t.learn.admin.addGameFetchError);
    } finally {
      setFetching(false);
    }
  };

  const handleAppendSelected = () => {
    const selected = parsedDrafts.filter((d) => d.selected);
    if (selected.length === 0) {
      toast.error(t.learn.admin.addGameSelectAtLeastOne);
      return;
    }
    let lessonObj: Record<string, unknown>;
    try {
      lessonObj = JSON.parse(lessonText);
      if (!lessonObj || typeof lessonObj !== "object") throw new Error("not object");
    } catch {
      toast.error(t.learn.admin.addGameLessonNotParsed);
      return;
    }
    const existing = Array.isArray(lessonObj.historicalGames) ? lessonObj.historicalGames : [];
    const usedIds = new Set<string>(
      existing
        .filter((g): g is { id: string } => Boolean(g) && typeof (g as { id?: unknown }).id === "string")
        .map((g) => g.id),
    );
    const drafts = selected.map((d, i) => {
      const draft = parsedToDraftHistoricalGame(d.parsed, openingId, i);
      let id = draft.id;
      let counter = 2;
      while (usedIds.has(id)) {
        id = `${draft.id}-${counter}`;
        counter += 1;
      }
      usedIds.add(id);
      return { ...draft, id };
    });
    const next = { ...lessonObj, historicalGames: [...existing, ...drafts] };
    setLessonText(JSON.stringify(next, null, 2));
    setParsedDrafts([]);
    setPgnText("");
    setPgnUrl("");
    setPgnSourceLabel(null);
    toast.success(formatTemplate(t.learn.admin.addGameAppended, { count: drafts.length }));
  };

  const sourceLine = useMemo(() => {
    if (!pgnSourceLabel || parsedDrafts.length === 0) return null;
    return formatTemplate(t.learn.admin.addGameSourceLabel, {
      label: pgnSourceLabel,
      count: parsedDrafts.length,
    });
  }, [pgnSourceLabel, parsedDrafts.length, formatTemplate, t.learn.admin.addGameSourceLabel]);

  type LessonGameLite = {
    id: string;
    white?: string;
    black?: string;
    date?: string;
    uciMoves: string[];
  };

  const lessonGames = useMemo<LessonGameLite[]>(() => {
    try {
      const obj = JSON.parse(lessonText) as Record<string, unknown>;
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.historicalGames)) return [];
      const out: LessonGameLite[] = [];
      for (const raw of obj.historicalGames as unknown[]) {
        if (!raw || typeof raw !== "object") continue;
        const g = raw as Record<string, unknown>;
        if (typeof g.id !== "string" || !Array.isArray(g.uciMoves)) continue;
        const moves = g.uciMoves.filter((m): m is string => typeof m === "string");
        if (moves.length === 0) continue;
        out.push({
          id: g.id,
          white: typeof g.white === "string" ? g.white : undefined,
          black: typeof g.black === "string" ? g.black : undefined,
          date: typeof g.date === "string" ? g.date : undefined,
          uciMoves: moves,
        });
      }
      return out;
    } catch {
      return [];
    }
  }, [lessonText]);

  useEffect(() => {
    if (lessonGames.length === 0) {
      if (quizGameId !== "") setQuizGameId("");
      return;
    }
    if (!quizGameId || !lessonGames.some((g) => g.id === quizGameId)) {
      setQuizGameId(lessonGames[0].id);
    }
  }, [lessonGames, quizGameId]);

  const selectedQuizGame = useMemo(
    () => lessonGames.find((g) => g.id === quizGameId) ?? null,
    [lessonGames, quizGameId],
  );

  const quizSanList = useMemo(
    () => (selectedQuizGame ? uciSequenceToSan(selectedQuizGame.uciMoves) : []),
    [selectedQuizGame],
  );

  const safeQuizPly = useMemo(() => {
    if (!selectedQuizGame) return 0;
    const max = Math.max(0, selectedQuizGame.uciMoves.length - 1);
    return Math.min(Math.max(0, quizPly), max);
  }, [selectedQuizGame, quizPly]);

  const quizActualMove = useMemo(() => {
    if (!selectedQuizGame) return null;
    return sanOfMoveAt(selectedQuizGame.uciMoves, safeQuizPly);
  }, [selectedQuizGame, safeQuizPly]);

  const autoFillFromGame = useCallback(
    (game: LessonGameLite, ply: number) => {
      const actual = sanOfMoveAt(game.uciMoves, ply);
      const correct = actual?.uci ?? "";
      setQuizCorrectUci(correct);
      const decoys = suggestWrongMoves(game.uciMoves, ply, correct, 3);
      setQuizWrong([decoys[0] ?? "", decoys[1] ?? "", decoys[2] ?? ""]);
      setQuizId(`${game.id}-q${ply}`);
    },
    [],
  );

  useEffect(() => {
    if (!selectedQuizGame) return;
    autoFillFromGame(selectedQuizGame, safeQuizPly);
  }, [selectedQuizGame, safeQuizPly, autoFillFromGame]);

  const handleAppendQuiz = () => {
    if (!selectedQuizGame) {
      toast.error(t.learn.admin.addQuizGameNoGames);
      return;
    }
    const correct = quizCorrectUci.trim();
    const decoys = quizWrong.map((s) => s.trim()).filter((s) => s.length > 0);
    if (
      !correct ||
      decoys.length === 0 ||
      !quizPromptFr.trim() ||
      !quizPromptEn.trim()
    ) {
      toast.error(t.learn.admin.addQuizMissingFields);
      return;
    }

    let lessonObj: Record<string, unknown>;
    try {
      const parsed = JSON.parse(lessonText);
      if (!parsed || typeof parsed !== "object") throw new Error("not object");
      lessonObj = parsed as Record<string, unknown>;
    } catch {
      toast.error(t.learn.admin.addGameLessonNotParsed);
      return;
    }

    const gamesArr = Array.isArray(lessonObj.historicalGames)
      ? (lessonObj.historicalGames as Record<string, unknown>[])
      : [];
    const idx = gamesArr.findIndex((g) => g && (g as { id?: unknown }).id === selectedQuizGame.id);
    if (idx < 0) {
      toast.error(t.learn.admin.addQuizGameNotInLesson);
      return;
    }

    const game = gamesArr[idx] ?? {};
    const existing = Array.isArray((game as { challenges?: unknown }).challenges)
      ? ((game as { challenges?: unknown[] }).challenges ?? [])
      : [];
    const usedIds = new Set<string>(
      existing
        .filter(
          (c): c is { id: string } =>
            Boolean(c) && typeof (c as { id?: unknown }).id === "string",
        )
        .map((c) => c.id),
    );
    const baseId = (quizId.trim() || `${selectedQuizGame.id}-q${safeQuizPly}`) || "quiz";
    let finalId = baseId;
    let counter = 2;
    while (usedIds.has(finalId)) {
      finalId = `${baseId}-${counter}`;
      counter += 1;
    }

    const hintFr = quizHintFr.trim();
    const hintEn = quizHintEn.trim();
    const hints =
      hintFr || hintEn
        ? [{ fr: hintFr || hintEn, en: hintEn || hintFr }]
        : [];
    const insightFr = quizInsightFr.trim() || quizPromptFr.trim();
    const insightEn = quizInsightEn.trim() || quizPromptEn.trim();

    const challenge = {
      id: finalId,
      afterMoveCount: safeQuizPly,
      prompt: { fr: quizPromptFr.trim(), en: quizPromptEn.trim() },
      correctUci: correct,
      wrongChoices: decoys,
      hints,
      insight: { fr: insightFr, en: insightEn },
    };

    const updatedGame = { ...(game as Record<string, unknown>), challenges: [...existing, challenge] };
    const nextGames = gamesArr.map((g, i) => (i === idx ? updatedGame : g));
    const next = { ...lessonObj, historicalGames: nextGames };
    setLessonText(JSON.stringify(next, null, 2));

    setQuizPromptFr("");
    setQuizPromptEn("");
    setQuizHintFr("");
    setQuizHintEn("");
    setQuizInsightFr("");
    setQuizInsightEn("");
    setQuizId("");
    toast.success(formatTemplate(t.learn.admin.addQuizAppended, { id: finalId }));
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

        <Card className="theme-bg-secondary theme-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-cyan-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t.learn.admin.addGameTitle}
            </CardTitle>
            <CardDescription className="text-xs theme-text-secondary">{t.learn.admin.addGameHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">{t.learn.admin.addGameUrlLabel}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={pgnUrl}
                  onChange={(e) => setPgnUrl(e.target.value)}
                  placeholder={t.learn.admin.addGameUrlPlaceholder}
                  spellCheck={false}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 p-2 text-sm font-mono text-slate-200"
                />
                <Button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={fetching}
                  className="bg-amber-700 hover:bg-amber-600 gap-2"
                >
                  <Download className="h-4 w-4" />
                  {fetching ? t.learn.admin.addGameFetching : t.learn.admin.addGameFetch}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">{t.learn.admin.addGamePastePgnLabel}</label>
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                spellCheck={false}
                className="w-full min-h-[140px] rounded-md border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleParsePastedPgn}>
                  {t.learn.admin.addGameParse}
                </Button>
                {parsedDrafts.length > 0 && (
                  <Button type="button" onClick={handleAppendSelected} className="bg-cyan-700 hover:bg-cyan-600">
                    {t.learn.admin.addGameAppendSelected}
                  </Button>
                )}
              </div>
            </div>

            {sourceLine && <p className="text-xs text-slate-400">{sourceLine}</p>}

            {parsedDrafts.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400">
                      <th className="py-2 px-2 font-medium w-16">{t.learn.admin.addGameTableInclude}</th>
                      <th className="py-2 px-2 font-medium">{t.learn.admin.addGameTableMatchup}</th>
                      <th className="py-2 px-2 font-medium w-20">{t.learn.admin.addGameTableResult}</th>
                      <th className="py-2 px-2 font-medium w-32">{t.learn.admin.addGameTableDate}</th>
                      <th className="py-2 px-2 font-medium">{t.learn.admin.addGameTableEvent}</th>
                      <th className="py-2 px-2 font-medium w-20 text-right">{t.learn.admin.addGameTableMoves}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedDrafts.map((draft, idx) => {
                      const h = draft.parsed.headers;
                      return (
                        <tr key={draft.id} className="border-t border-slate-800/80">
                          <td className="py-2 px-2 align-top">
                            <input
                              type="checkbox"
                              checked={draft.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setParsedDrafts((prev) =>
                                  prev.map((d, i) => (i === idx ? { ...d, selected: checked } : d)),
                                );
                              }}
                            />
                          </td>
                          <td className="py-2 px-2 text-slate-200">
                            <div>{h.White ?? "?"}</div>
                            <div className="text-slate-500">vs {h.Black ?? "?"}</div>
                          </td>
                          <td className="py-2 px-2 text-amber-200/90 font-mono">{h.Result ?? draft.parsed.result}</td>
                          <td className="py-2 px-2 text-slate-400 font-mono">{h.Date ?? "—"}</td>
                          <td className="py-2 px-2 text-slate-300">
                            <div>{h.Event ?? "—"}</div>
                            {h.ECO && <div className="text-slate-500 font-mono">{h.ECO}</div>}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400 font-mono">{draft.parsed.uciMoves.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="theme-bg-secondary theme-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-cyan-200 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              {t.learn.admin.addQuizTitle}
            </CardTitle>
            <CardDescription className="text-xs theme-text-secondary">
              {t.learn.admin.addQuizHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lessonGames.length === 0 ? (
              <p className="text-xs text-amber-300/80">{t.learn.admin.addQuizGameNoGames}</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizGameLabel}</label>
                    <select
                      value={quizGameId}
                      onChange={(e) => setQuizGameId(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    >
                      {lessonGames.map((g) => {
                        const label = `${g.white ?? "?"} – ${g.black ?? "?"}${g.date ? ` (${g.date})` : ""}`;
                        return (
                          <option key={g.id} value={g.id}>
                            {label} · {g.id}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizIdLabel}</label>
                    <input
                      value={quizId}
                      onChange={(e) => setQuizId(e.target.value)}
                      spellCheck={false}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm font-mono text-slate-200"
                    />
                  </div>
                </div>

                {selectedQuizGame && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">
                      {formatTemplate(t.learn.admin.addQuizPositionLabel, {
                        plies: safeQuizPly,
                        moveNumber: Math.floor(safeQuizPly / 2) + 1,
                        side:
                          safeQuizPly % 2 === 0
                            ? t.learn.admin.addQuizSideWhite
                            : t.learn.admin.addQuizSideBlack,
                      })}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, selectedQuizGame.uciMoves.length - 1)}
                      step={1}
                      value={safeQuizPly}
                      onChange={(e) => setQuizPly(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    {quizActualMove && (
                      <p className="text-xs text-amber-200/90 font-mono">
                        {formatTemplate(t.learn.admin.addQuizActualMove, {
                          san: quizActualMove.san,
                          uci: quizActualMove.uci,
                        })}
                      </p>
                    )}
                  </div>
                )}

                {selectedQuizGame && quizSanList.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizMoveListLabel}</label>
                    <div className="max-h-40 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/60 p-2">
                      <div className="flex flex-wrap gap-1 text-xs font-mono text-slate-300">
                        {quizSanList.map((san, i) => {
                          const isWhiteMove = i % 2 === 0;
                          const moveNumberLabel = isWhiteMove ? `${i / 2 + 1}.` : null;
                          const isSelected = i === safeQuizPly;
                          return (
                            <span key={i} className="flex items-center gap-1">
                              {moveNumberLabel && (
                                <span className="text-slate-500">{moveNumberLabel}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setQuizPly(i)}
                                className={`rounded px-1.5 py-0.5 transition-colors ${
                                  isSelected
                                    ? "bg-cyan-700/70 text-white"
                                    : "hover:bg-slate-800 text-slate-300"
                                }`}
                              >
                                {san}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizCorrectLabel}</label>
                    <div className="flex gap-2">
                      <input
                        value={quizCorrectUci}
                        onChange={(e) => setQuizCorrectUci(e.target.value)}
                        spellCheck={false}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-950 p-2 text-sm font-mono text-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedQuizGame) autoFillFromGame(selectedQuizGame, safeQuizPly);
                        }}
                      >
                        {t.learn.admin.addQuizUseGameMove}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizWrongLabel}</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i}
                            value={quizWrong[i] ?? ""}
                            onChange={(e) => {
                              const next = [...quizWrong];
                              next[i] = e.target.value;
                              setQuizWrong(next);
                            }}
                            spellCheck={false}
                            className="flex-1 rounded-md border border-slate-700 bg-slate-950 p-2 text-sm font-mono text-slate-200"
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!selectedQuizGame) return;
                          const decoys = suggestWrongMoves(
                            selectedQuizGame.uciMoves,
                            safeQuizPly,
                            quizCorrectUci.trim(),
                            3,
                          );
                          setQuizWrong([decoys[0] ?? "", decoys[1] ?? "", decoys[2] ?? ""]);
                        }}
                      >
                        {t.learn.admin.addQuizSuggestWrong}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizPromptFr}</label>
                    <textarea
                      value={quizPromptFr}
                      onChange={(e) => setQuizPromptFr(e.target.value)}
                      className="w-full min-h-[60px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizPromptEn}</label>
                    <textarea
                      value={quizPromptEn}
                      onChange={(e) => setQuizPromptEn(e.target.value)}
                      className="w-full min-h-[60px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizHintFr}</label>
                    <textarea
                      value={quizHintFr}
                      onChange={(e) => setQuizHintFr(e.target.value)}
                      className="w-full min-h-[50px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizHintEn}</label>
                    <textarea
                      value={quizHintEn}
                      onChange={(e) => setQuizHintEn(e.target.value)}
                      className="w-full min-h-[50px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizInsightFr}</label>
                    <textarea
                      value={quizInsightFr}
                      onChange={(e) => setQuizInsightFr(e.target.value)}
                      className="w-full min-h-[60px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t.learn.admin.addQuizInsightEn}</label>
                    <textarea
                      value={quizInsightEn}
                      onChange={(e) => setQuizInsightEn(e.target.value)}
                      className="w-full min-h-[60px] rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="button"
                    onClick={handleAppendQuiz}
                    className="bg-cyan-700 hover:bg-cyan-600"
                  >
                    {t.learn.admin.addQuizAppend}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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
