"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Users, Copy, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSuperUser } from "@/hooks/useSuperUser";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { useOpenPvpLobbies } from "@/hooks/useOpenPvpLobbies";
import OnlineChessboard from "@/components/OnlineChessboard";
import OnlinePvpClockBar from "@/components/OnlinePvpClockBar";
import OnlinePvpResultModal from "@/components/OnlinePvpResultModal";
import AuthModal from "@/components/AuthModal";
import { buildPgnFromUcis } from "@/lib/pvp-chess";
import { saveGameToCloud } from "@/lib/supabase-storage";
import { PVP_TIME_PRESETS } from "@/lib/pvp-time-controls";
import { pvpGameStatsFromUcis, formatDurationSec } from "@/lib/pvp-result-stats";

function pvpResultForPlayer(
  result: string | null,
  role: "white" | "black" | null
): "win" | "loss" | "draw" {
  if (!result || !role) return "draw";
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return role === "white" ? "win" : "loss";
  if (result === "0-1") return role === "black" ? "win" : "loss";
  return "draw";
}

export default function OnlinePvpPage() {
  const { t, lang } = useLanguage();
  const o = t.playOnline;
  const presetLabels = o.presets as Record<string, string>;
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("game");
  const { userId, loading: authLoading } = useSuperUser();
  const online = useOnlineGame(gameId, userId);
  const openLobbies = useOpenPvpLobbies(gameId ? null : userId);
  const [authOpen, setAuthOpen] = useState(false);
  const [timePreset, setTimePreset] = useState("blitz_10_0");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [endedDurationSec, setEndedDurationSec] = useState<number | null>(null);
  const startMsRef = useRef<number | null>(null);
  const resultModalShownForGameId = useRef<string | null>(null);

  useEffect(() => {
    setSavedToCloud(false);
    setShowResultModal(false);
    setEndedDurationSec(null);
    resultModalShownForGameId.current = null;
  }, [gameId]);

  useEffect(() => {
    if (
      online.game?.status === "playing" &&
      online.game.black_user_id &&
      startMsRef.current === null
    ) {
      startMsRef.current = Date.now();
    }
  }, [online.game?.status, online.game?.black_user_id]);

  const inviteUrl =
    typeof window !== "undefined" && gameId
      ? `${window.location.origin}/online?game=${gameId}`
      : "";

  const handleCreate = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setCreating(true);
    try {
      const id = await online.createLobby(timePreset);
      if (id) router.push(`/online?game=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.createFailed);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setJoining(true);
    try {
      await online.joinLobby();
      toast.success(o.joinedAsBlack);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.joinFailed);
    } finally {
      setJoining(false);
    }
  };

  const handleCancelLobby = async () => {
    if (!gameId) return;
    try {
      await online.deleteWaitingLobby();
      toast.success(o.lobbyRemoved);
      router.push("/online");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.openLobbiesError);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(o.linkCopied);
    } catch {
      toast.error(o.copyFailed);
    }
  };

  const handleSaveCloud = useCallback(async () => {
    if (!online.game || !userId || savedToCloud || !online.role) return;
    const r = online.game.result;
    if (!r) return;
    setSaving(true);
    try {
      const pgn = buildPgnFromUcis(
        online.moves.map((m) => m.uci),
        {
          white: "White",
          black: "Black",
          result: r,
        }
      );
      const playerResult = pvpResultForPlayer(r, online.role);
      await saveGameToCloud({
        opponentName: o.opponentName,
        result: playerResult,
        resultType: online.game.result_reason ?? "pvp_online",
        resultMessage: online.game.result_reason ?? undefined,
        playerColor: online.role,
        pgn,
        finalFen: online.chess.fen(),
        movesCount: online.moves.length,
        durationSeconds:
          startMsRef.current != null
            ? Math.max(0, Math.round((Date.now() - startMsRef.current) / 1000))
            : undefined,
        gameKind: "pvp_human_vs_human",
      });
      setSavedToCloud(true);
      toast.success(o.savedCloud);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.saveFailed);
    } finally {
      setSaving(false);
    }
  }, [online, userId, o, savedToCloud]);

  useEffect(() => {
    if (
      online.game?.status === "finished" &&
      online.game?.result &&
      startMsRef.current != null
    ) {
      setEndedDurationSec((prev) => {
        if (prev != null) return prev;
        return Math.max(0, Math.round((Date.now() - startMsRef.current!) / 1000));
      });
    }
  }, [online.game?.status, online.game?.result]);

  useEffect(() => {
    if (!gameId || !online.game) return;
    const fin =
      online.game.status === "finished" || online.game.status === "aborted";
    if (!fin || !online.game.result || !online.role || !userId) return;
    if (resultModalShownForGameId.current === gameId) return;
    resultModalShownForGameId.current = gameId;
    setShowResultModal(true);
  }, [gameId, online.game, online.role, userId]);

  const pgnStringForDownload = useMemo(() => {
    if (!online.game?.result) return "";
    return buildPgnFromUcis(
      online.moves.map((m) => m.uci),
      {
        white: "White",
        black: "Black",
        result: online.game.result,
      }
    );
  }, [online.game?.result, online.moves]);

  const boardStats = useMemo(
    () => pvpGameStatsFromUcis(online.moves.map((m) => m.uci)),
    [online.moves]
  );

  const outcomeForModal = useMemo((): "win" | "loss" | "draw" => {
    if (!online.game?.result || !online.role) return "draw";
    return pvpResultForPlayer(online.game.result, online.role);
  }, [online.game?.result, online.role]);

  const resultLineMessage = useMemo(() => {
    if (!online.game?.result) return "";
    const rm = o.resultModal;
    const r = online.game.result;
    const rr = online.game.result_reason ?? "";
    let detail = rm.reasonGeneric;
    switch (rr) {
      case "checkmate":
        detail = rm.reasonCheckmate;
        break;
      case "stalemate":
        detail = rm.reasonStalemate;
        break;
      case "timeout":
        detail = rm.reasonTimeout;
        break;
      case "resignation":
        detail = rm.reasonResignation;
        break;
      case "draw_agreed":
        detail = rm.reasonDrawAgreed;
        break;
      case "threefold_repetition":
        detail = rm.reasonThreefold;
        break;
      case "insufficient_material":
        detail = rm.reasonInsufficient;
        break;
      case "fifty_move_rule":
        detail = rm.reasonFifty;
        break;
      default:
        break;
    }
    return `${r} — ${detail}`;
  }, [online.game?.result, online.game?.result_reason, o.resultModal]);

  const durationLabelForModal = useMemo(
    () => formatDurationSec(endedDurationSec ?? undefined),
    [endedDurationSec]
  );

  const handleDownloadPgn = useCallback(() => {
    if (!pgnStringForDownload) return;
    const blob = new Blob([pgnStringForDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-avatar-pvp-${gameId ?? "game"}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pgnStringForDownload, gameId]);

  const lastUci = online.moves.length
    ? online.moves[online.moves.length - 1].uci
    : null;
  const lastMove =
    lastUci && lastUci.length >= 4
      ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) }
      : null;

  const gameOver = Boolean(
    online.game &&
      (online.game.status === "finished" || online.game.status === "aborted")
  );

  const orientation =
    online.role === "black" ? "black" : ("white" as const);

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-cyan-500/20">
          <CardContent className="pt-6">
            <p className="text-slate-300">{o.needsSupabase}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
      </main>
    );
  }

  if (!gameId) {
    const locale = lang === "fr" ? "fr-FR" : "en-US";
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center justify-center gap-2">
              <Users className="h-8 w-8" aria-hidden />
              {o.title}
            </h1>
            <p className="theme-text-secondary">{o.subtitle}</p>
          </div>
          <Card className="theme-bg-secondary border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-100">{o.createLobby}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">{o.joinHint}</p>
              {userId && (
                <div className="space-y-1.5">
                  <Label htmlFor="pvp-time-preset" className="text-slate-300">
                    {o.timeControlLabel}
                  </Label>
                  <select
                    id="pvp-time-preset"
                    value={timePreset}
                    onChange={(e) => setTimePreset(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  >
                    {PVP_TIME_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {presetLabels[p.id] ?? p.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!userId ? (
                <Button type="button" onClick={() => setAuthOpen(true)} className="w-full">
                  {o.openAuth}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : o.createLobby}
                </Button>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link href="/play">{o.backToBots}</Link>
              </Button>
            </CardContent>
          </Card>

          {userId && (
            <Card className="theme-bg-secondary border-emerald-500/25">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg text-emerald-100">{o.openLobbiesTitle}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-emerald-300 shrink-0"
                    onClick={() => void openLobbies.refresh()}
                  >
                    {openLobbies.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      "↻"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 font-normal pt-1">{o.openLobbiesHint}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {openLobbies.error && (
                  <p className="text-sm text-amber-200/90">{o.openLobbiesError}</p>
                )}
                {openLobbies.loading && openLobbies.lobbies.length === 0 && !openLobbies.error ? (
                  <p className="text-sm text-slate-500">{o.openLobbiesLoading}</p>
                ) : openLobbies.lobbies.length === 0 ? (
                  <p className="text-sm text-slate-500">{o.openLobbiesEmpty}</p>
                ) : (
                  <ul className="divide-y divide-slate-800 rounded-md border border-slate-800/80 overflow-hidden">
                    {openLobbies.lobbies.map((lobby) => (
                      <li
                        key={lobby.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 bg-slate-900/40"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                lobby.isHost
                                  ? "border-cyan-500/50 text-cyan-200"
                                  : "border-slate-600 text-slate-300"
                              }
                            >
                              {lobby.isHost ? o.yourLobby : o.strangerLobby}
                            </Badge>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {presetLabels[lobby.time_preset] ?? lobby.time_preset}
                          </Badge>
                          <span className="font-mono text-xs text-slate-500 truncate">
                            {lobby.id.slice(0, 8)}…
                          </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(lobby.created_at).toLocaleString(locale, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          {lobby.isHost && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              title={o.removeLobby}
                              onClick={() =>
                                void openLobbies.cancelLobby(lobby.id).then(() => toast.success(o.lobbyRemoved))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button asChild size="sm" className="shrink-0">
                            <Link href={`/online?game=${lobby.id}`}>
                              {lobby.isHost ? o.openLobby : o.joinLobbyRow}
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </main>
    );
  }

  if (online.loading && !online.game) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
      </main>
    );
  }

  if (online.error || !online.game) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-red-500/30">
          <CardContent className="pt-6 space-y-4">
            <p className="text-red-200">{online.error ?? o.gameNotFound}</p>
            <Button variant="outline" asChild>
              <Link href="/online">{o.backLobby}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const g = online.game;
  const waitingOpponent = g.status === "waiting" && !g.black_user_id;
  const canMove =
    g.status === "playing" &&
    Boolean(online.role) &&
    online.isMyTurn &&
    !gameOver;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-2 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-semibold text-cyan-100 truncate">{o.title}</h1>
            <Badge variant="outline" className="shrink-0 border-cyan-500/40">
              {g.status === "waiting"
                ? o.statusWaiting
                : g.status === "playing"
                  ? o.statusPlaying
                  : g.status === "finished"
                    ? o.statusFinished
                    : o.statusAborted}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/online">{o.newLobby}</Link>
          </Button>
        </div>

        {waitingOpponent && online.role === "white" && (
          <Card className="theme-bg-secondary border-cyan-500/20">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-slate-300">{o.waitingOpponent}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={inviteUrl} className="font-mono text-xs flex-1" />
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="secondary" size="icon" onClick={() => void copyInvite()}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-950/30"
                    onClick={() => void handleCancelLobby()}
                  >
                    {o.cancelLobby}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {online.canJoin && !online.role && (
          <Card className="theme-bg-secondary border-emerald-500/30">
            <CardContent className="pt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-slate-200">{o.canJoinPrompt}</p>
              <Button
                type="button"
                onClick={() => void handleJoin()}
                disabled={joining}
                className="shrink-0"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : o.joinGame}
              </Button>
            </CardContent>
          </Card>
        )}

        {!userId && (
          <Card className="theme-bg-secondary border-amber-500/30">
            <CardContent className="pt-4">
              <Button type="button" onClick={() => setAuthOpen(true)}>
                {o.openAuth}
              </Button>
            </CardContent>
          </Card>
        )}

        {online.role && (
          <p className="text-sm text-slate-400">
            {online.role === "white" ? o.youAreWhite : o.youAreBlack}
            {g.status === "playing" &&
              (online.isMyTurn ? ` — ${o.yourTurn}` : ` — ${o.opponentTurn}`)}
          </p>
        )}

        <OnlinePvpClockBar
          game={g}
          chess={online.chess}
          whiteLabel={o.whiteClock}
          blackLabel={o.blackClock}
        />

        <div className="w-full max-w-[min(100%,480px)] mx-auto aspect-square max-h-[70dvh]">
          <OnlineChessboard
            fen={online.chess.fen()}
            orientation={orientation}
            lastMove={lastMove}
            canMove={Boolean(userId) && canMove}
            onSubmitUci={online.submitMove}
            onMoveError={(msg) => toast.error(msg)}
          />
        </div>

        {g.status === "playing" && online.role && userId && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void online.resign().catch((e) => toast.error(String(e)))}
            >
              {o.resign}
            </Button>
            {g.draw_offered_by === userId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void online.drawAction("cancel").catch((e) => toast.error(String(e)))
                }
              >
                {o.drawCancel}
              </Button>
            ) : g.draw_offered_by && g.draw_offered_by !== userId ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void online.drawAction("accept").catch((e) => toast.error(String(e)))
                  }
                >
                  {o.drawAccept}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void online.drawAction("decline").catch((e) => toast.error(String(e)))
                  }
                >
                  {o.drawDecline}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void online.drawAction("offer").catch((e) => toast.error(String(e)))
                }
              >
                {o.drawOffer}
              </Button>
            )}
          </div>
        )}

        {g.draw_offered_by && g.draw_offered_by !== userId && online.role && (
          <p className="text-center text-sm text-amber-200/90">{o.opponentOfferedDraw}</p>
        )}

        <OnlinePvpResultModal
          open={
            showResultModal &&
            gameOver &&
            Boolean(g.result) &&
            Boolean(online.role) &&
            Boolean(userId)
          }
          onOpenChange={setShowResultModal}
          result={outcomeForModal}
          resultMessage={resultLineMessage}
          totalMoves={boardStats.totalMoves}
          captures={boardStats.captures}
          checks={boardStats.checks}
          durationLabel={durationLabelForModal}
          onNewGame={() => router.push("/online")}
          onDownloadPgn={handleDownloadPgn}
          onSaveCloud={handleSaveCloud}
          canSave={Boolean(userId) && !savedToCloud}
          saving={saving}
        />
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => void online.refresh()} />
    </main>
  );
}
