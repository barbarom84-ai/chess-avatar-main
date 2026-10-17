"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ClipboardCopy,
  Download,
  Flag,
  FlipVertical2,
  Handshake,
  ImageDown,
  Loader2,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareElementAsImage } from "@/lib/share-image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ArenaGameReview from "@/components/arena/ArenaGameReview";
import { setReviewSessionFromAnalyze } from "@/lib/review-session";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import {
  playChessCheckSound,
  playChessGameEndSound,
  playChessMoveSound,
} from "@/lib/chess-sound";
import SimpleChessboard from "@/components/SimpleChessboard";
import OnlineChessboard from "@/components/OnlineChessboard";
import EvaluationBar from "@/components/EvaluationBar";
import ArenaPlayerBar, { type ArenaPlayerScore } from "@/components/arena/ArenaPlayerBar";
import ArenaMoveList from "@/components/arena/ArenaMoveList";
import type { ArenaMatchView } from "@/hooks/useArenaMatch";
import { replayUci } from "@/lib/arena-chess";
import { buildArenaPgn } from "@/lib/arena-pgn";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";

export type ArenaStatusTone = "idle" | "live" | "result" | "warn";

/** Primary actions sit above the board; size is driven by
 * `.chessboard-column--arena` / `--board-scale` in globals.css. */

function scoresFor(view: ArenaMatchView): { w: ArenaPlayerScore; b: ArenaPlayerScore } {
  const winner = view.outcome?.winner;
  if (!winner) return { w: null, b: null };
  if (winner === "draw") return { w: "half", b: "half" };
  return winner === "white" ? { w: "1", b: "0" } : { w: "0", b: "1" };
}

function safeFileName(s: string): string {
  return s.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "arena";
}

export default function ArenaBoardPanel({
  white,
  black,
  view,
  showEval,
  statusText,
  statusTone,
  controls,
  header,
  pgnEvent,
  pgnRound,
  pgnTimeControl,
  orientation,
  onFlip,
  onHumanMove,
  onHumanResign,
  onHumanDraw,
}: {
  white?: ProfileOption;
  black?: ProfileOption;
  view: ArenaMatchView;
  showEval: boolean;
  statusText: string;
  statusTone: ArenaStatusTone;
  controls: ReactNode;
  header?: ReactNode;
  pgnEvent: string;
  pgnRound?: string;
  pgnTimeControl?: string;
  /** `"black"` flips the board relative to its default (a human's own side, else White). */
  orientation: "white" | "black";
  onFlip: () => void;
  /** Submits a local human's move; returns `false` when it is not accepted. */
  onHumanMove?: (uci: string) => boolean;
  onHumanResign?: () => boolean;
  onHumanDraw?: () => boolean;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const router = useRouter();
  const total = view.history.length;
  const { settings: boardSettings, updateSettings } = useChessboardSettings();
  const soundOn = boardSettings.soundEnabled;

  const soundedPlyRef = useRef(total);
  useEffect(() => {
    const prev = soundedPlyRef.current;
    soundedPlyRef.current = total;
    if (!soundOn || total <= prev) return;
    if (view.outcome) playChessGameEndSound();
    else if (/[+#]$/.test(view.sans[total - 1] ?? "")) playChessCheckSound();
    else playChessMoveSound();
  }, [total, soundOn, view.outcome, view.sans]);

  // Starting a game brings the whole board (both clocks) into view.
  const boardColumnRef = useRef<HTMLDivElement>(null);
  const wasRunningRef = useRef(view.running);
  useEffect(() => {
    const started = view.running && !wasRunningRef.current;
    wasRunningRef.current = view.running;
    const el = boardColumnRef.current;
    if (!started || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: rect.height > window.innerHeight ? "start" : "nearest",
    });
  }, [view.running]);

  // Navigation is anchored to the history length it was chosen at, so a new
  // move automatically brings the board back to the live position.
  const [nav, setNav] = useState<{ ply: number; at: number } | null>(null);
  const displayedPly = nav && nav.at === total ? nav.ply : total;
  const isLive = displayedPly >= total;

  const displayed = useMemo(() => {
    if (isLive) return { fen: view.fen, lastMove: view.lastMove };
    const g = replayUci(view.history.slice(0, displayedPly));
    const uci = displayedPly > 0 ? view.history[displayedPly - 1] : null;
    return {
      fen: g.fen(),
      lastMove: uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null,
    };
  }, [isLive, view.fen, view.lastMove, view.history, displayedPly]);

  const sideToMove = total % 2 === 0 ? "w" : "b";
  const humanWhite = Boolean(white?.human);
  const humanBlack = Boolean(black?.human);
  const hasHuman = humanWhite || humanBlack;
  // Engine insight would help the human: only shown once the game is over.
  const showInsight = !hasHuman || view.outcome != null;
  const humanTurn = view.awaitingHuman != null && isLive && !view.outcome && Boolean(onHumanMove);
  const awaitingOption =
    view.awaitingHuman === "w" ? white : view.awaitingHuman === "b" ? black : undefined;
  const hotSeatPass =
    humanTurn && humanWhite && humanBlack
      ? ap.passDeviceTo.replace("{name}", awaitingOption?.config.name || "")
      : humanTurn
        ? ap.statusHumanTurn.replace("{name}", awaitingOption?.config.name || "")
        : null;

  // Hot-seat: a lone human sees the board from their side; two humans see it from the side to move.
  const baseOrientation: "white" | "black" =
    humanWhite && humanBlack
      ? sideToMove === "w"
        ? "white"
        : "black"
      : humanBlack
        ? "black"
        : "white";
  const boardOrientation: "white" | "black" =
    orientation === "white" ? baseOrientation : baseOrientation === "white" ? "black" : "white";

  const submitHumanMove = async (uci: string) => {
    if (!onHumanMove?.(uci)) throw new Error("illegal");
  };

  const scores = scoresFor(view);
  const whiteName = white?.config.name || "White";
  const blackName = black?.config.name || "Black";

  const pgn = () =>
    buildArenaPgn({
      whiteName,
      blackName,
      outcome: view.outcome
        ? { pgnResult: view.outcome.pgnResult, resultMessage: view.outcome.resultMessage }
        : { pgnResult: "*", resultMessage: "" },
      uciMoves: view.history,
      event: pgnEvent,
      round: pgnRound,
      timeControl: pgnTimeControl,
    });

  const copyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn());
      toast.success(ap.pgnCopied);
    } catch {
      toast.error(ap.pgnCopyError);
    }
  };

  const selectPly = (ply: number) => setNav(ply >= total ? null : { ply, at: total });

  const analyzeGame = () => {
    setReviewSessionFromAnalyze(whiteName, pgn());
    router.push("/review");
  };

  const [sharing, setSharing] = useState(false);
  const shareImage = async () => {
    const el = boardColumnRef.current;
    if (!el || sharing) return;
    setSharing(true);
    try {
      const res = await shareElementAsImage(
        el,
        `${safeFileName(whiteName)}-vs-${safeFileName(blackName)}.png`,
        `${whiteName} vs ${blackName}`
      );
      if (res === "downloaded") toast.success(ap.imageSaved);
    } catch (e) {
      console.error(e);
      toast.error(ap.imageError);
    } finally {
      setSharing(false);
    }
  };

  const downloadPgn = () => {
    const blob = new Blob([pgn()], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(whiteName)}-vs-${safeFileName(blackName)}.pgn`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const topColor = boardOrientation === "white" ? "b" : "w";
  const bottomColor = boardOrientation === "white" ? "w" : "b";
  const barFor = (color: "w" | "b") => (
    <ArenaPlayerBar
      option={color === "w" ? white : black}
      color={color}
      clock={view.clock}
      toMove={!view.outcome && sideToMove === color}
      thinking={view.thinking}
      awaitingHuman={view.awaitingHuman === color}
      score={color === "w" ? scores.w : scores.b}
    />
  );

  return (
    <section
      className="arena-panel p-3 flex flex-col gap-3"
      aria-label={`${whiteName} vs ${blackName}`}
      data-testid="arena-board-panel"
    >
      {/* Primary actions above the board so scale never covers Start / One move */}
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {controls}
          {humanTurn && onHumanResign && (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-700/60 text-rose-200"
              onClick={() => {
                if (window.confirm(ap.resignConfirm)) onHumanResign();
              }}
              data-testid="arena-resign"
            >
              <Flag className="h-4 w-4 mr-1" />
              {ap.resign}
            </Button>
          )}
          {humanTurn && onHumanDraw && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600"
              onClick={() => {
                if (window.confirm(ap.drawConfirm)) onHumanDraw();
              }}
              data-testid="arena-draw"
            >
              <Handshake className="h-4 w-4 mr-1" />
              {ap.offerDraw}
            </Button>
          )}
        </div>
        <p
          className="arena-status"
          data-tone={statusTone}
          role="status"
          aria-live="polite"
          data-testid="arena-status"
        >
          {statusText}
        </p>
      </div>

      <div
        ref={boardColumnRef}
        className="arena-scroll-anchor chessboard-column--arena min-w-0 space-y-2 mx-auto"
      >
        {header}
        {hotSeatPass && (
          <div className="arena-hotseat-banner" role="status" data-testid="arena-hotseat-banner">
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
            <span>{hotSeatPass}</span>
          </div>
        )}
        {barFor(topColor)}
        <div
          className="chessboard-frame chessboard-frame--arena"
          data-testid="arena-board"
          data-interactive={humanTurn}
        >
          {humanTurn ? (
            <OnlineChessboard
              fen={view.fen}
              orientation={boardOrientation}
              lastMove={view.lastMove}
              canMove
              onSubmitUci={submitHumanMove}
              boardMaxWidth="100%"
            />
          ) : (
            <SimpleChessboard
              position={displayed.fen}
              orientation={boardOrientation}
              lastMove={displayed.lastMove}
              boardMaxWidth="100%"
            />
          )}
        </div>
        {barFor(bottomColor)}
        {showEval && showInsight && <EvaluationBar evaluation={view.evalWhitePov} compact />}
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-center text-[11px] text-slate-500 sm:text-left" data-testid="arena-move-count">
          {ap.movesPlayed}: {total}
        </p>
        <ArenaMoveList
          sans={view.sans}
          displayedPly={displayedPly}
          onSelectPly={selectPly}
        />
        {showInsight && (
          <ArenaGameReview
            sans={view.sans}
            evals={view.evals}
            finished={view.outcome != null && total > 0}
            whiteName={whiteName}
            blackName={blackName}
            displayedPly={displayedPly}
            onSelectPly={selectPly}
            onAnalyze={analyzeGame}
          />
        )}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="arena-icon-btn" onClick={onFlip} title={ap.flipBoard}>
            <FlipVertical2 className="h-4 w-4" />
            <span>{ap.flipBoard}</span>
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            aria-pressed={soundOn}
            onClick={() => updateSettings({ soundEnabled: !soundOn })}
            title={ap.soundToggle}
            data-testid="arena-sound"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{ap.soundToggle}</span>
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => void copyPgn()}
            disabled={total === 0}
          >
            <ClipboardCopy className="h-4 w-4" />
            <span>{ap.copyPgn}</span>
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            onClick={downloadPgn}
            disabled={total === 0}
          >
            <Download className="h-4 w-4" />
            <span>{ap.downloadPgn}</span>
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => void shareImage()}
            disabled={total === 0 || sharing}
            data-testid="arena-share-image"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
            <span>{ap.shareImage}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
