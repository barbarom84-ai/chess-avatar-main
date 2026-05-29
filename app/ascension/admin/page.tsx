"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import type { CampaignTrack, DbCampaignPuzzle } from "@/lib/ascension/types";
import type { SquareEffect, SquareEffectType } from "@/lib/ascension/fantasy-chess/types";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import {
  boardOrientationFromFen,
  getSideToMoveFromFen,
  normalizeFen,
  sanitizeFen,
  setSideToMoveInFen,
  type SideToMove,
} from "@/lib/ascension/fen-utils";
import { canonicalPuzzleAtLevel } from "@/lib/ascension/campaign-puzzle-utils";
import { nextFreeStandardLevel } from "@/lib/ascension/lichess-import";
import SimpleChessboard from "@/components/SimpleChessboard";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";

type PuzzleForm = {
  id: string | null;
  slug: string;
  kind: "standard" | "fantasy";
  min_elo: number;
  max_elo: number;
  xp_reward: number;
  elo_reward: number;
  fen: string;
  solution_ucis: string;
  prompt_fr: string;
  prompt_en: string;
  sort_order: number;
  track: CampaignTrack;
  is_published: boolean;
  fantasy_abilities: string;
  special_squares: SquareEffect[];
  side_to_move: SideToMove;
};

function puzzleToForm(p: DbCampaignPuzzle): PuzzleForm {
  return {
    id: p.id,
    slug: p.slug,
    kind: p.kind,
    min_elo: p.min_elo,
    max_elo: p.max_elo,
    xp_reward: p.xp_reward,
    elo_reward: p.elo_reward,
    fen: p.fen,
    solution_ucis: Array.isArray(p.solution_ucis)
      ? p.solution_ucis.join(" ")
      : String(p.solution_ucis ?? ""),
    prompt_fr: p.prompt.fr,
    prompt_en: p.prompt.en,
    sort_order: p.sort_order,
    track: p.track ?? "main",
    is_published: p.is_published,
    fantasy_abilities: (p.fantasy_rules.enabledAbilities ?? []).join(", "),
    special_squares: Array.isArray(p.fantasy_rules.specialSquares)
      ? p.fantasy_rules.specialSquares
      : [],
    side_to_move: getSideToMoveFromFen(p.fen),
  };
}

function emptyForm(level: number, track: CampaignTrack = "main"): PuzzleForm {
  return {
    id: null,
    slug: `${track}-level-${level}-custom`,
    kind: track === "fantasy" ? "fantasy" : "standard",
    min_elo: 0,
    max_elo: 3000,
    xp_reward: 20,
    elo_reward: 20,
    fen: "",
    solution_ucis: "",
    prompt_fr: "",
    prompt_en: "",
    sort_order: level,
    track,
    is_published: false,
    fantasy_abilities: "",
    special_squares: [],
    side_to_move: "w",
  };
}

export default function AscensionAdminPage() {
  const { t } = useLanguage();
  const { isSuperUser, loading } = useSuperUser();
  const [puzzles, setPuzzles] = useState<DbCampaignPuzzle[]>([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [form, setForm] = useState<PuzzleForm | null>(null);
  const [adminTrack, setAdminTrack] = useState<CampaignTrack>("main");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingPuzzles, setLoadingPuzzles] = useState(true);
  const [importCount, setImportCount] = useState(10);
  const [importDifficulty, setImportDifficulty] = useState("");
  const [importStartLevel, setImportStartLevel] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingPuzzles(true);
    try {
      const res = await fetch("/api/ascension/admin/puzzles", {
        headers: await accountApiHeaders(false),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Load failed"));
      const data = (await res.json()) as { puzzles: DbCampaignPuzzle[] };
      const sorted = [...data.puzzles].sort((a, b) => a.sort_order - b.sort_order);
      setPuzzles(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingPuzzles(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperUser) void load();
  }, [isSuperUser, load]);

  useEffect(() => {
    if (puzzles.length > 0 && importStartLevel === 0) {
      setImportStartLevel(nextFreeStandardLevel(puzzles));
    }
  }, [puzzles, importStartLevel]);

  const selectPuzzle = (p: DbCampaignPuzzle, level: number) => {
    setSelectedPuzzleId(p.id);
    setSelectedLevel(level);
    setForm(puzzleToForm(p));
    setError(null);
  };

  const selectNewLevel = (level: number) => {
    setSelectedPuzzleId(null);
    setSelectedLevel(level);
    setForm(emptyForm(level, adminTrack));
    setError(null);
  };

  const savePuzzle = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const solution_ucis = form.solution_ucis
        .split(/[\s,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (form.kind === "standard") {
        const normalizedFen = normalizeFen(form.fen.trim(), form.side_to_move);
        const validation = validateStandardPuzzleLine(normalizedFen, solution_ucis);
        if (!validation.ok) {
          setError(validation.error);
          setSaving(false);
          return;
        }
      }

      const abilities = form.fantasy_abilities
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const specialSquares = form.special_squares
        .map((eff) => {
          const square = eff.square.trim().toLowerCase();
          const linkTo = eff.linkTo?.trim().toLowerCase();
          const cleaned: SquareEffect = { square, type: eff.type };
          if (eff.type === "tunnel" && linkTo) cleaned.linkTo = linkTo;
          return cleaned;
        })
        .filter((eff) => /^[a-h][1-8]$/.test(eff.square))
        .filter((eff) => eff.type !== "tunnel" || /^[a-h][1-8]$/.test(eff.linkTo ?? ""));

      const body = {
        id: form.id,
        slug: form.slug.trim(),
        kind: form.kind,
        min_elo: form.min_elo,
        max_elo: form.max_elo,
        xp_reward: form.xp_reward,
        elo_reward: form.elo_reward,
        fen: normalizeFen(form.fen.trim(), form.side_to_move),
        solution_ucis,
        sort_order: form.sort_order,
        track: form.track,
        is_published: form.is_published,
        prompt: { fr: form.prompt_fr, en: form.prompt_en },
        hints: [],
        insight: { fr: "", en: "" },
        fantasy_rules:
          form.kind === "fantasy"
            ? {
                enabledAbilities: abilities,
                objective: "reach_square",
                objectiveSquare: solution_ucis[solution_ucis.length - 1]?.slice(2, 4),
                ...(specialSquares.length > 0 ? { specialSquares } : {}),
              }
            : {},
      };

      const res = await fetch("/api/ascension/admin/puzzles", {
        method: "POST",
        headers: await accountApiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Save failed"));
      const saved = (await res.json()) as { puzzle: DbCampaignPuzzle };
      toast.success(t.ascension.adminSaved);
      await load();
      if (saved.puzzle) {
        setSelectedPuzzleId(saved.puzzle.id);
        setSelectedLevel(saved.puzzle.sort_order);
        setForm(puzzleToForm(saved.puzzle));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const importFromLichess = async () => {
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/ascension/admin/import-lichess", {
        method: "POST",
        headers: await accountApiHeaders(),
        body: JSON.stringify({
          count: importCount,
          difficulty: importDifficulty || undefined,
          startLevel: importStartLevel || undefined,
        }),
      });
      if (res.status === 429) {
        const rateMsg = t.ascension.adminImportRateLimited.replace("{imported}", "0");
        setImportMsg(rateMsg);
        toast.error(rateMsg);
        return;
      }
      if (!res.ok) throw new Error(await readAccountApiError(res, t.ascension.adminImportError));
      const data = (await res.json()) as {
        imported: number;
        skippedDuplicates: number;
        invalid: number;
        rateLimited?: boolean;
      };
      const msg = t.ascension.adminImportDone
        .replace("{imported}", String(data.imported))
        .replace("{skipped}", String(data.skippedDuplicates))
        .replace("{invalid}", String(data.invalid));
      if (data.rateLimited) {
        const rateMsg = t.ascension.adminImportRateLimited.replace(
          "{imported}",
          String(data.imported)
        );
        setImportMsg(rateMsg);
        toast.warning(rateMsg);
        if (data.imported > 0) setImportStartLevel(0);
      } else {
        setImportMsg(data.imported > 0 ? msg : t.ascension.adminImportNone);
        if (data.imported > 0) {
          toast.success(msg);
          setImportStartLevel(0);
        }
      }
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : t.ascension.adminImportError;
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const resetProgress = async () => {
    if (!window.confirm(t.ascension.adminResetConfirm)) return;
    setResetting(true);
    try {
      const res = await fetch("/api/ascension/admin/reset-progress", {
        method: "POST",
        headers: await accountApiHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Reset failed"));
      toast.success(t.ascension.adminResetDone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">…</div>;
  }

  if (!isSuperUser) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-rose-400">{t.ascension.adminForbidden}</p>
      </main>
    );
  }

  const trackPuzzles = puzzles.filter((p) => (p.track ?? "main") === adminTrack);

  const maxLevel = Math.max(
    9,
    ...trackPuzzles.map((p) => p.sort_order),
    selectedLevel ?? 0
  );

  const duplicateLevels = trackPuzzles.reduce<Record<number, number>>((acc, p) => {
    acc[p.sort_order] = (acc[p.sort_order] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen theme-gradient p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/ascension">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.ascension.backToAscension}
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void resetProgress()}
            disabled={resetting}
            className="gap-1"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {t.ascension.adminResetProgress}
          </Button>
        </div>

        <Card className="theme-bg-secondary border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-400" />
              {t.ascension.adminImportTitle}
            </CardTitle>
            <p className="text-sm text-slate-400">{t.ascension.adminImportSubtitle}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t.ascension.adminImportCount}</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={importCount}
                  onChange={(e) =>
                    setImportCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t.ascension.adminImportDifficulty}</Label>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  value={importDifficulty}
                  onChange={(e) => setImportDifficulty(e.target.value)}
                >
                  <option value="">{t.ascension.adminImportDiffAny}</option>
                  <option value="easiest">{t.ascension.adminImportDiffEasiest}</option>
                  <option value="easier">{t.ascension.adminImportDiffEasier}</option>
                  <option value="normal">{t.ascension.adminImportDiffNormal}</option>
                  <option value="harder">{t.ascension.adminImportDiffHarder}</option>
                  <option value="hardest">{t.ascension.adminImportDiffHardest}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t.ascension.adminImportStartLevel}</Label>
                <Input
                  type="number"
                  min={1}
                  value={importStartLevel}
                  onChange={(e) =>
                    setImportStartLevel(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {importMsg ? (
                <p className="text-sm text-emerald-300">{importMsg}</p>
              ) : (
                <span />
              )}
              <Button
                onClick={() => void importFromLichess()}
                disabled={importing}
                className="gap-2 bg-emerald-700 hover:bg-emerald-600"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t.ascension.adminImportButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="theme-bg-secondary border-cyan-500/20">
          <CardHeader>
            <CardTitle>{t.ascension.adminTitle}</CardTitle>
            <p className="text-sm text-slate-400">{t.ascension.adminSubtitle}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            {loadingPuzzles ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500">
                    {t.ascension.adminTrackLabel}
                  </span>
                  <div className="inline-flex rounded-md border border-slate-700 overflow-hidden">
                    {(["main", "fantasy"] as const).map((tr) => (
                      <button
                        key={tr}
                        type="button"
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          adminTrack === tr
                            ? "bg-cyan-700 text-white"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                        onClick={() => {
                          setAdminTrack(tr);
                          setForm(null);
                          setSelectedPuzzleId(null);
                          setSelectedLevel(null);
                        }}
                      >
                        {tr === "main"
                          ? t.ascension.adminTrackMain
                          : t.ascension.adminTrackFantasy}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
                    const p = canonicalPuzzleAtLevel(trackPuzzles, level);
                    const isSelected = selectedLevel === level;
                    const hasDuplicates = (duplicateLevels[level] ?? 0) > 1;
                    return (
                      <Button
                        key={level}
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`${isSelected ? "bg-cyan-700" : ""} ${hasDuplicates ? "border-amber-500/60" : ""}`}
                        onClick={() => (p ? selectPuzzle(p, level) : selectNewLevel(level))}
                        title={hasDuplicates ? t.ascension.adminDuplicateLevel : undefined}
                      >
                        #{level}
                        {p && (
                          <span className="ml-1 text-[10px] opacity-70">
                            {p.kind === "fantasy" ? "F" : "S"}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                  {/* Create a brand-new level beyond the current maximum */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-dashed border-cyan-600/50 text-cyan-400 hover:border-cyan-400 hover:text-cyan-200"
                    onClick={() => selectNewLevel(maxLevel + 1)}
                    title={t.ascension.adminNewLevel}
                  >
                    + #{maxLevel + 1}
                  </Button>
                </div>

                {form && (
                  <div className="grid gap-4 border border-slate-800 rounded-lg p-4 bg-slate-950/40">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{t.ascension.adminSlug}</Label>
                        <Input
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t.ascension.adminKind}</Label>
                        <select
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                          value={form.kind}
                          onChange={(e) =>
                            setForm({ ...form, kind: e.target.value as "standard" | "fantasy" })
                          }
                        >
                          <option value="standard">{t.ascension.standardPuzzle}</option>
                          <option value="fantasy">{t.ascension.fantasyPuzzle}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label>{t.ascension.adminMinElo}</Label>
                        <Input
                          type="number"
                          value={form.min_elo}
                          onChange={(e) => setForm({ ...form, min_elo: Number(e.target.value) })}
                        />
                        <p className="text-[11px] text-slate-500">{t.ascension.adminMinEloHint}</p>
                      </div>
                      <div className="space-y-1">
                        <Label>{t.ascension.adminMaxElo}</Label>
                        <Input
                          type="number"
                          value={form.max_elo}
                          onChange={(e) => setForm({ ...form, max_elo: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>XP</Label>
                        <Input
                          type="number"
                          value={form.xp_reward}
                          onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>ELO</Label>
                        <Input
                          type="number"
                          value={form.elo_reward}
                          onChange={(e) => setForm({ ...form, elo_reward: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{t.ascension.adminSideToMove}</Label>
                        <select
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                          value={form.side_to_move}
                          onChange={(e) => {
                            const side = e.target.value as SideToMove;
                            setForm({
                              ...form,
                              side_to_move: side,
                              fen: setSideToMoveInFen(form.fen, side),
                            });
                          }}
                        >
                          <option value="w">{t.ascension.sideWhite}</option>
                          <option value="b">{t.ascension.sideBlack}</option>
                        </select>
                        <p className="text-[11px] text-slate-500">{t.ascension.adminSideToMoveHint}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-xs text-slate-400">
                          {t.ascension.sideToMove}:{" "}
                          <span className="font-medium text-cyan-300">
                            {form.side_to_move === "b" ? t.ascension.sideBlack : t.ascension.sideWhite}
                          </span>
                        </p>
                        {form.fen.trim() && (
                          <div className="w-full max-w-[280px]">
                            <SimpleChessboard
                              position={normalizeFen(form.fen, form.side_to_move)}
                              orientation={boardOrientationFromFen(
                                normalizeFen(form.fen, form.side_to_move)
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>FEN</Label>
                      <Input
                        value={form.fen}
                        onChange={(e) => {
                          // Sanitize on input: replace typographic dashes (–, —, …)
                          // that chess apps sometimes produce when copy-pasting FENs.
                          const fen = sanitizeFen(e.target.value);
                          setForm({
                            ...form,
                            fen,
                            side_to_move: getSideToMoveFromFen(fen),
                          });
                        }}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t.ascension.adminSolution}</Label>
                      <Input
                        value={form.solution_ucis}
                        onChange={(e) => setForm({ ...form, solution_ucis: e.target.value })}
                        placeholder="e2e4 e7e5"
                        className="font-mono text-xs"
                      />
                    </div>

                    {form.kind === "fantasy" && (
                      <div className="space-y-2">
                        <Label>{t.ascension.adminFantasyAbilities}</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(
                            [
                              "bishop_orthogonal",
                              "rook_tunnel",
                              "knight_phantom",
                              "queen_split",
                              "pawn_charge",
                              "pawn_greedy",
                              "king_anchor",
                            ] as const
                          ).map((ability) => {
                            const selected = form.fantasy_abilities
                              .split(/[,;\s]+/)
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .includes(ability);
                            return (
                              <label
                                key={ability}
                                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                                  selected
                                    ? "border-purple-500/60 bg-purple-950/50 text-purple-100"
                                    : "border-slate-700/60 bg-slate-900/40 text-slate-400 hover:border-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-purple-500 shrink-0"
                                  checked={selected}
                                  onChange={(e) => {
                                    const current = form.fantasy_abilities
                                      .split(/[,;\s]+/)
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    const next = e.target.checked
                                      ? [...new Set([...current, ability])]
                                      : current.filter((a) => a !== ability);
                                    setForm({ ...form, fantasy_abilities: next.join(", ") });
                                  }}
                                />
                                <span className="font-mono leading-tight">{ability}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {form.kind === "fantasy" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{t.ascension.adminSpecialSquares}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-cyan-600/50 text-cyan-300"
                            onClick={() =>
                              setForm({
                                ...form,
                                special_squares: [
                                  ...form.special_squares,
                                  { square: "", type: "explosive" },
                                ],
                              })
                            }
                          >
                            {t.ascension.adminSpecialSquareAdd}
                          </Button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {t.ascension.adminSpecialSquaresHint}
                        </p>
                        {form.special_squares.length === 0 && (
                          <p className="text-xs text-slate-600 italic">
                            {t.ascension.adminSpecialSquaresEmpty}
                          </p>
                        )}
                        {form.special_squares.map((eff, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-end gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-2"
                          >
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">
                                {t.ascension.adminSpecialSquareCell}
                              </Label>
                              <Input
                                value={eff.square}
                                placeholder="e4"
                                className="w-20 font-mono text-xs"
                                onChange={(e) => {
                                  const next = [...form.special_squares];
                                  next[idx] = { ...eff, square: e.target.value };
                                  setForm({ ...form, special_squares: next });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">
                                {t.ascension.adminSpecialSquareType}
                              </Label>
                              <select
                                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200"
                                value={eff.type}
                                onChange={(e) => {
                                  const type = e.target.value as SquareEffectType;
                                  const next = [...form.special_squares];
                                  next[idx] = {
                                    ...eff,
                                    type,
                                    linkTo: type === "tunnel" ? eff.linkTo ?? "" : undefined,
                                  };
                                  setForm({ ...form, special_squares: next });
                                }}
                              >
                                <option value="explosive">
                                  💣 {t.ascension.adminSpecialSquareExplosive}
                                </option>
                                <option value="trap">
                                  ⚠️ {t.ascension.adminSpecialSquareTrap}
                                </option>
                                <option value="tunnel">
                                  🕳️ {t.ascension.adminSpecialSquareTunnel}
                                </option>
                              </select>
                            </div>
                            {eff.type === "tunnel" && (
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-500">
                                  {t.ascension.adminSpecialSquareLinkTo}
                                </Label>
                                <Input
                                  value={eff.linkTo ?? ""}
                                  placeholder="e6"
                                  className="w-20 font-mono text-xs"
                                  onChange={(e) => {
                                    const next = [...form.special_squares];
                                    next[idx] = { ...eff, linkTo: e.target.value };
                                    setForm({ ...form, special_squares: next });
                                  }}
                                />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-400 hover:text-rose-300"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  special_squares: form.special_squares.filter(
                                    (_, i) => i !== idx
                                  ),
                                })
                              }
                            >
                              {t.ascension.adminSpecialSquareRemove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{t.ascension.adminPromptFr}</Label>
                        <Input
                          value={form.prompt_fr}
                          onChange={(e) => setForm({ ...form, prompt_fr: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t.ascension.adminPromptEn}</Label>
                        <Input
                          value={form.prompt_en}
                          onChange={(e) => setForm({ ...form, prompt_en: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <Switch
                          checked={form.is_published}
                          onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                        />
                        {t.ascension.adminPublished}
                      </label>
                      <Button onClick={() => void savePuzzle()} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t.ascension.adminSave}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


