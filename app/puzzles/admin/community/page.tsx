"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PromotionDialog from "@/components/PromotionDialog";
import SimpleChessboard from "@/components/SimpleChessboard";
import { useLanguage } from "@/lib/language-context";
import { applyUciMove, resolveFreeLegalDrop } from "@/lib/learn-chess-utils";
import { parsePgnBlock, chessAtPly } from "@/lib/pgn-to-uci";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function isTypingFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function bearerAuthHeaders(): Promise<HeadersInit> {
  if (!isSupabaseConfigured || !supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

type GameRow = {
  id: string;
  opponent_name: string | null;
  moves_count: number;
  created_at: string | null;
};

type PreviewGame = {
  id: string;
  pgn: string;
  opponent_name: string | null;
  moves_count: number;
};

type GateState = "loading" | "ready" | "forbidden" | "need_auth" | "error";

export default function CommunityPuzzleManualAdminPage() {
  const { lang, t } = useLanguage();
  const p = t.puzzlesPage.communityManual;

  const [gate, setGate] = useState<GateState>("loading");
  const [games, setGames] = useState<GameRow[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [manualGameId, setManualGameId] = useState("");
  const [afterMoveCount, setAfterMoveCount] = useState("18");
  const [correctUci, setCorrectUci] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [promptFr, setPromptFr] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [previewGame, setPreviewGame] = useState<PreviewGame | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [viewOrientation, setViewOrientation] = useState<"white" | "black">("white");
  const [composerUcis, setComposerUcis] = useState<string[]>([]);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionOptions, setPromotionOptions] = useState<string[]>([]);

  const effectiveGameId = manualGameId.trim() || selectedListId;
  const plyInt = Math.max(0, Number.parseInt(afterMoveCount, 10) || 0);

  const loadPreview = useCallback(
    async (id: string) => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const auth = await bearerAuthHeaders();
        const res = await fetch(
          `/api/puzzles/community-manual?gameId=${encodeURIComponent(id)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: auth,
          }
        );
        if (res.status === 404) {
          setPreviewGame(null);
          setPreviewError(p.previewNotFound);
          return;
        }
        if (!res.ok) {
          setPreviewGame(null);
          setPreviewError(p.previewPickGame);
          return;
        }
        const data: unknown = await res.json();
        const g = (data as { game?: PreviewGame }).game;
        if (!g?.pgn) {
          setPreviewGame(null);
          setPreviewError(p.previewNotFound);
          return;
        }
        setPreviewGame(g);
        setPreviewError(null);
      } catch {
        setPreviewGame(null);
        setPreviewError(p.loadGamesError);
      } finally {
        setPreviewLoading(false);
      }
    },
    [p.previewNotFound, p.previewPickGame, p.loadGamesError]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = await bearerAuthHeaders();
        const res = await fetch("/api/puzzles/community-manual", {
          credentials: "include",
          cache: "no-store",
          headers: auth,
        });
        if (cancelled) return;
        if (res.status === 401) {
          setGate("need_auth");
          return;
        }
        if (res.status === 403) {
          setGate("forbidden");
          return;
        }
        if (!res.ok) {
          setGate("error");
          return;
        }
        const data: unknown = await res.json();
        const list = (data as { games?: GameRow[] }).games;
        setGames(Array.isArray(list) ? list : []);
        setGate("ready");
      } catch {
        if (!cancelled) setGate("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    if (!UUID_RE.test(effectiveGameId)) {
      setPreviewGame(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    const t = window.setTimeout(() => {
      void loadPreview(effectiveGameId);
    }, 320);
    return () => window.clearTimeout(t);
  }, [effectiveGameId, gate, loadPreview]);

  const boardState = useMemo(() => {
    if (!previewGame?.pgn) return null;
    const parsed = parsePgnBlock(previewGame.pgn);
    if (!parsed?.uciMoves?.length) return { kind: "invalid" as const };
    const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());
    const clampedPly = Math.min(plyInt, uciMoves.length);

    const chess = chessAtPly(uciMoves, clampedPly);
    if (!chess) return { kind: "ply" as const, totalPlies: uciMoves.length };

    let lastMove: { from: string; to: string } | undefined;
    if (clampedPly > 0) {
      const prev = uciMoves[clampedPly - 1]?.trim().toLowerCase();
      const m = prev?.match(/^([a-h][1-8])([a-h][1-8])/);
      if (m) lastMove = { from: m[1], to: m[2] };
    }

    return {
      kind: "ok" as const,
      fen: chess.fen(),
      lastMove,
      sideToMove: chess.turn(),
      totalPlies: uciMoves.length,
      plyClamped: plyInt > uciMoves.length,
    };
  }, [previewGame?.pgn, plyInt]);

  useEffect(() => {
    setComposerUcis([]);
    setCorrectUci("");
    setSolutionText("");
    setPromotionOpen(false);
    setPromotionOptions([]);
  }, [effectiveGameId, plyInt]);

  const composerPlayFen = useMemo(() => {
    if (boardState?.kind !== "ok") return null;
    const g = new Chess(boardState.fen);
    for (const u of composerUcis) {
      if (!applyUciMove(g, u)) return null;
    }
    return g.fen();
  }, [boardState, composerUcis]);

  const composerLastMove = useMemo(() => {
    const last = composerUcis[composerUcis.length - 1]?.trim().toLowerCase();
    if (!last || last.length < 4) return undefined;
    const m = last.match(/^([a-h][1-8])([a-h][1-8])/);
    return m ? { from: m[1], to: m[2] } : undefined;
  }, [composerUcis]);

  const composerSideToMove = useMemo(() => {
    if (!composerPlayFen) return "w" as const;
    const stm = composerPlayFen.split(" ")[1];
    return stm === "b" ? ("b" as const) : ("w" as const);
  }, [composerPlayFen]);

  const appendComposerUci = useCallback((uci: string) => {
    const norm = uci.trim().toLowerCase();
    setComposerUcis((prev) => {
      const next = [...prev, norm];
      setCorrectUci(next[0] ?? "");
      setSolutionText(next.slice(1).join(" "));
      return next;
    });
  }, []);

  const clearComposer = useCallback(() => {
    setComposerUcis([]);
    setCorrectUci("");
    setSolutionText("");
    setPromotionOpen(false);
    setPromotionOptions([]);
  }, []);

  const handleComposerDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!composerPlayFen) return false;
      const res = resolveFreeLegalDrop(composerPlayFen, sourceSquare, targetSquare);
      if (res.type === "none") return false;
      if (res.type === "uci") {
        appendComposerUci(res.uci);
        return true;
      }
      setPromotionOptions(res.options);
      setPromotionOpen(true);
      return true;
    },
    [appendComposerUci, composerPlayFen]
  );

  const handleComposerPromotionSelect = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      const raw = promotionOptions[0]?.trim().toLowerCase() ?? "";
      const from = raw.slice(0, 2);
      const to = raw.slice(2, 4);
      if (!from || !to) {
        setPromotionOpen(false);
        setPromotionOptions([]);
        return;
      }
      const played = `${from}${to}${piece}`.toLowerCase();
      const found = promotionOptions.find((o) => o.trim().toLowerCase() === played);
      setPromotionOpen(false);
      setPromotionOptions([]);
      if (found) appendComposerUci(found);
    },
    [appendComposerUci, promotionOptions]
  );

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMessage(null);
    const ply = Number.parseInt(afterMoveCount, 10);
    if (!effectiveGameId.trim()) {
      setMessage({ kind: "err", text: p.errors.invalid_game_id });
      return;
    }

    setBusy(true);
    try {
      const auth = await bearerAuthHeaders();
      const solutionLineUci = solutionText.trim().split(/\s+/).filter(Boolean);
      const res = await fetch("/api/puzzles/community-manual", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...auth,
        },
        body: JSON.stringify({
          gameId: effectiveGameId.trim(),
          afterMoveCount: ply,
          correctUci: correctUci.trim(),
          solutionLineUci,
          promptFr: promptFr.trim() || undefined,
          promptEn: promptEn.trim() || undefined,
        }),
      });

      const data: unknown = await res.json().catch(() => ({}));
      const errKey =
        typeof data === "object" && data !== null && "errorKey" in data
          ? String((data as { errorKey?: string }).errorKey ?? "")
          : "";

      if (!res.ok) {
        const mapped =
          errKey && errKey in p.errors
            ? p.errors[errKey as keyof typeof p.errors]
            : typeof data === "object" &&
                data !== null &&
                "error" in data &&
                typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Error";
        setMessage({ kind: "err", text: mapped });
        return;
      }

      setMessage({ kind: "ok", text: p.success });
    } finally {
      setBusy(false);
    }
  }

  const maxPlyNav = boardState?.kind === "ok" ? boardState.totalPlies : 0;

  useEffect(() => {
    if (gate !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      if (promotionOpen) return;
      if (isTypingFocusTarget(e.target)) return;
      if (boardState?.kind !== "ok") return;
      const max = boardState.totalPlies;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setAfterMoveCount(String(Math.max(0, plyInt - 1)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setAfterMoveCount(String(Math.min(max, plyInt + 1)));
      } else if (e.key === "Home") {
        e.preventDefault();
        setAfterMoveCount("0");
      } else if (e.key === "End") {
        e.preventDefault();
        setAfterMoveCount(String(max));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gate, boardState, plyInt, promotionOpen]);

  if (gate === "loading") {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex items-center justify-center">
        <p className="text-slate-400">…</p>
      </main>
    );
  }

  if (gate === "need_auth") {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">
          {lang === "fr" ? "Connectez-vous pour continuer." : "Sign in to continue."}
        </p>
        <Button asChild variant="outline">
          <Link href="/puzzles">{p.back}</Link>
        </Button>
      </main>
    );
  }

  if (gate === "forbidden") {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">{p.forbidden}</p>
        <p className="text-xs text-slate-500">
          {lang === "fr"
            ? "Les UUID autorisés sont configurés côté serveur (COMMUNITY_PUZZLE_ADMIN_USER_IDS)."
            : "Allowlisted user IDs are configured server-side (COMMUNITY_PUZZLE_ADMIN_USER_IDS)."}
        </p>
        <Button asChild variant="outline">
          <Link href="/puzzles">{p.back}</Link>
        </Button>
      </main>
    );
  }

  if (gate === "error") {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">{p.loadGamesError}</p>
        <Button asChild variant="outline">
          <Link href="/puzzles">{p.back}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-cyan-400">
          <Link href="/puzzles" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {p.back}
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold neon-cyan">{p.title}</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">{p.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <Card className="theme-bg-secondary theme-border border-slate-700/80 lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-200">{p.previewTitle}</CardTitle>
              <CardDescription className="text-xs theme-text-secondary">{p.previewHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!UUID_RE.test(effectiveGameId) && (
                <p className="text-sm text-slate-500">{p.previewPickGame}</p>
              )}
              {previewLoading && <p className="text-sm text-slate-400">{p.previewLoading}</p>}
              {previewError && !previewLoading && (
                <p className="text-sm text-amber-300/95">{previewError}</p>
              )}
              {boardState?.kind === "invalid" && (
                <p className="text-sm text-rose-300/95">{p.previewInvalidPly}</p>
              )}
              {boardState?.kind === "ply" && (
                <p className="text-sm text-rose-300/95">{p.previewInvalidPly}</p>
              )}
              {boardState?.kind === "ok" && (
                <>
                  <PromotionDialog
                    open={promotionOpen}
                    pieceColor={composerSideToMove}
                    onSelect={handleComposerPromotionSelect}
                  />
                  {boardState.plyClamped && (
                    <p className="text-xs text-amber-300/90">
                      {lang === "fr"
                        ? `Indice trop grand : affichage de la position après ${boardState.totalPlies} demi-coups (fin de la partie).`
                        : `Index past game length: showing position after ${boardState.totalPlies} half-moves (game end).`}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      {p.previewSideToMove.replace(
                        "{side}",
                        boardState.sideToMove === "w" ? p.previewSideWhite : p.previewSideBlack
                      )}
                      {" · "}
                      {lang === "fr"
                        ? `${boardState.totalPlies} demi-coups dans le PGN`
                        : `${boardState.totalPlies} half-moves in PGN`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() =>
                        setViewOrientation((o) => (o === "white" ? "black" : "white"))
                      }
                      title={p.flipBoard}
                    >
                      <RotateCw className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">{p.flipBoard}</span>
                    </Button>
                  </div>
                  <div className="flex justify-center max-w-[min(100%,380px)] mx-auto aspect-square w-full">
                    <SimpleChessboard
                      position={boardState.fen}
                      orientation={viewOrientation}
                      lastMove={boardState.lastMove}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={plyInt <= 0}
                      title={p.navStart}
                      onClick={() => setAfterMoveCount("0")}
                    >
                      <ChevronFirst className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={plyInt <= 0}
                      title={p.navPrev}
                      onClick={() => setAfterMoveCount(String(Math.max(0, plyInt - 1)))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={plyInt >= maxPlyNav}
                      title={p.navNext}
                      onClick={() =>
                        setAfterMoveCount(String(Math.min(maxPlyNav, plyInt + 1)))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={plyInt >= maxPlyNav}
                      title={p.navEnd}
                      onClick={() => setAfterMoveCount(String(maxPlyNav))}
                    >
                      <ChevronLast className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">{p.keyboardNavHint}</p>

                  <div className="border-t border-slate-700/80 pt-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-cyan-200/95">{p.composeTitle}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.composeHint}</p>
                    </div>
                    <div className="flex justify-center max-w-[min(100%,380px)] mx-auto aspect-square w-full">
                      {composerPlayFen ? (
                        <SimpleChessboard
                          position={composerPlayFen}
                          orientation={viewOrientation}
                          lastMove={composerLastMove}
                          onDrop={handleComposerDrop}
                        />
                      ) : (
                        <p className="text-xs text-slate-500 self-center">
                          {lang === "fr"
                            ? "Position invalide pour composer."
                            : "Invalid position to compose."}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={composerUcis.length === 0}
                        onClick={clearComposer}
                      >
                        {p.clearPlayedMoves}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border border-slate-700/80">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-200">{p.publish}</CardTitle>
              <CardDescription className="text-xs theme-text-secondary">{p.plyHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="game">{p.gameLabel}</Label>
                  <select
                    id="game"
                    className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
                    value={selectedListId}
                    onChange={(e) => {
                      setSelectedListId(e.target.value);
                      setManualGameId("");
                    }}
                  >
                    <option value="">{p.gamePlaceholder}</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.opponent_name ?? "?"} — {g.moves_count}{" "}
                        {lang === "fr" ? "coups" : "moves"} — {g.id.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uuid">
                    {lang === "fr" ? "Ou UUID de partie" : "Or paste game UUID"}
                  </Label>
                  <Input
                    id="uuid"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={manualGameId}
                    onChange={(e) => {
                      setManualGameId(e.target.value);
                      setSelectedListId("");
                    }}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ply">{p.plyLabel}</Label>
                  <Input
                    id="ply"
                    type="number"
                    min={0}
                    value={afterMoveCount}
                    onChange={(e) => setAfterMoveCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correct">{p.correctLabel}</Label>
                  <Input
                    id="correct"
                    placeholder={p.correctPlaceholder}
                    value={correctUci}
                    onChange={(e) => setCorrectUci(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sol">{p.solutionLabel}</Label>
                  <textarea
                    id="sol"
                    rows={4}
                    placeholder={p.solutionPlaceholder}
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pf">{p.promptFrLabel}</Label>
                    <Input id="pf" value={promptFr} onChange={(e) => setPromptFr(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pe">{p.promptEnLabel}</Label>
                    <Input id="pe" value={promptEn} onChange={(e) => setPromptEn(e.target.value)} />
                  </div>
                </div>

                {message && (
                  <p
                    className={`text-sm ${message.kind === "ok" ? "text-emerald-300/95" : "text-rose-300/95"}`}
                  >
                    {message.text}
                  </p>
                )}

                <Button type="submit" disabled={busy} className="bg-cyan-700 hover:bg-cyan-600">
                  {busy ? p.publishing : p.publish}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
