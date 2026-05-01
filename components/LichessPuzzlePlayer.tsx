"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SimpleChessboard from "@/components/SimpleChessboard";
import PromotionDialog from "@/components/PromotionDialog";
import { Button } from "@/components/ui/button";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import { resolveDropToQuizChoice } from "@/lib/learn-chess-utils";

function applyUci(game: Chess, uci: string): boolean {
  const s = uci.trim().toLowerCase();
  if (s.length < 4) return false;
  const from = s.slice(0, 2);
  const to = s.slice(2, 4);
  const promotion = s.length > 4 ? (s[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    const m = game.move({ from, to, promotion });
    return !!m;
  } catch {
    return false;
  }
}

export interface LichessPuzzlePlayerProps {
  puzzle: NormalizedLichessPuzzle;
  labels: {
    reset: string;
    solved: string;
    wrong: string;
    themes: string;
    rating: string;
    plays: string;
    openOnLichess: string;
    sideToMove: string;
    white: string;
    black: string;
  };
}

export default function LichessPuzzlePlayer({ puzzle, labels }: LichessPuzzlePlayerProps) {
  const solution = puzzle.solutionUci;
  const initialFen = puzzle.fen;

  const chessRef = useRef(new Chess(initialFen));
  const moveIndexRef = useRef(0);
  const [fen, setFen] = useState(initialFen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [solved, setSolved] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionOptions, setPromotionOptions] = useState<string[]>([]);

  const sync = useCallback(() => {
    const g = chessRef.current;
    setFen(g.fen());
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }, []);

  const reset = useCallback(() => {
    chessRef.current = new Chess(initialFen);
    moveIndexRef.current = 0;
    setSolved(false);
    setWrongFlash(false);
    setPromotionOpen(false);
    setPromotionOptions([]);
    sync();
  }, [initialFen, sync]);

  useEffect(() => {
    reset();
  }, [puzzle.puzzleId, initialFen, reset]);

  const orientation = useMemo(() => {
    const stm = initialFen.split(" ")[1];
    return stm === "b" ? "black" : "white";
  }, [initialFen]);

  const sideToMoveChar = useMemo(() => fen.split(" ")[1], [fen]);

  const autoPlayOpponent = useCallback(() => {
    let idx = moveIndexRef.current;
    if (idx >= solution.length) {
      setSolved(true);
      return;
    }
    const opp = solution[idx];
    if (!applyUci(chessRef.current, opp)) {
      console.warn("[LichessPuzzlePlayer] failed opponent move", opp);
      return;
    }
    idx += 1;
    moveIndexRef.current = idx;
    sync();
    if (idx >= solution.length) setSolved(true);
  }, [solution, sync]);

  const onPromotionPick = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      const opt = promotionOptions[0];
      const from = opt?.trim().toLowerCase().slice(0, 2);
      const to = opt?.trim().toLowerCase().slice(2, 4);
      if (!from || !to) {
        setPromotionOpen(false);
        setPromotionOptions([]);
        return;
      }
      const played = `${from}${to}${piece}`.toLowerCase();
      const expected = solution[moveIndexRef.current];
      setPromotionOpen(false);
      setPromotionOptions([]);
      if (played !== expected) {
        setWrongFlash(true);
        window.setTimeout(() => setWrongFlash(false), 450);
        return;
      }
      if (!applyUci(chessRef.current, played)) return;
      moveIndexRef.current += 1;
      sync();
      if (moveIndexRef.current >= solution.length) {
        setSolved(true);
        return;
      }
      autoPlayOpponent();
    },
    [autoPlayOpponent, promotionOptions, solution, sync]
  );

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      if (solved) return false;
      const idx = moveIndexRef.current;
      if (idx >= solution.length) return false;
      const expected = solution[idx];
      const res = resolveDropToQuizChoice(chessRef.current.fen(), [expected], from, to);
      if (res.type === "promotion") {
        setPromotionOptions(res.options);
        setPromotionOpen(true);
        return true;
      }
      if (res.type !== "match") {
        setWrongFlash(true);
        window.setTimeout(() => setWrongFlash(false), 450);
        return false;
      }
      if (!applyUci(chessRef.current, res.uci)) return false;
      moveIndexRef.current += 1;
      sync();
      if (moveIndexRef.current >= solution.length) {
        setSolved(true);
        return true;
      }
      autoPlayOpponent();
      return true;
    },
    [autoPlayOpponent, solved, solution, sync]
  );

  const stmLabel =
    sideToMoveChar === "w" ? labels.white : sideToMoveChar === "b" ? labels.black : "";

  const playersLine = useMemo(() => {
    const w = puzzle.players.find((p) => p.color === "white");
    const b = puzzle.players.find((p) => p.color === "black");
    const wr = w?.rating != null ? ` (${w.rating})` : "";
    const br = b?.rating != null ? ` (${b.rating})` : "";
    if (!w && !b) return null;
    return `${w?.name ?? "?"}${wr} — ${b?.name ?? "?"}${br}`;
  }, [puzzle.players]);

  return (
    <div className="space-y-4">
      <PromotionDialog
        open={promotionOpen}
        pieceColor={sideToMoveChar === "w" ? "w" : "b"}
        onSelect={onPromotionPick}
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 justify-center">
        {playersLine && <span className="text-slate-300">{playersLine}</span>}
        <span>
          {labels.rating}: <strong className="text-slate-200">{puzzle.rating}</strong>
        </span>
        <span>
          {labels.plays}: <strong className="text-slate-200">{puzzle.plays.toLocaleString()}</strong>
        </span>
      </div>

      {puzzle.themes.length > 0 && (
        <p className="text-xs text-center text-slate-500">
          {labels.themes}: {puzzle.themes.join(", ")}
        </p>
      )}

      <p className="text-xs text-center text-slate-400">
        {labels.sideToMove}: {stmLabel}
      </p>

      <div
        className={`flex justify-center max-w-[min(100%,400px)] mx-auto transition-opacity ${
          wrongFlash ? "opacity-70 ring-2 ring-rose-600/50 rounded-sm" : ""
        }`}
      >
        <SimpleChessboard
          position={fen}
          orientation={orientation}
          onDrop={solved ? undefined : handleDrop}
          lastMove={lastMove}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center items-center">
        <Button type="button" variant="secondary" size="sm" onClick={reset}>
          {labels.reset}
        </Button>
        <a
          href={`https://lichess.org/training/${puzzle.puzzleId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
        >
          {labels.openOnLichess}
        </a>
      </div>

      {solved && (
        <p className="text-sm text-center text-emerald-300 border border-emerald-900/40 rounded-md p-3 bg-emerald-950/20">
          {labels.solved}
        </p>
      )}

      {wrongFlash && (
        <p className="text-sm text-center text-rose-300">{labels.wrong}</p>
      )}
    </div>
  );
}
