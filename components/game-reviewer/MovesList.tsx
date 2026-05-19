"use client";

import { Fragment, useMemo } from "react";
import { Chess, type Move, type Square as ChessSquare } from "chess.js";
import {
  BookOpen,
  LogOut,
  Skull,
  ShieldAlert,
  Lock,
} from "lucide-react";
import SanNotation from "@/components/SanNotation";
import { VirtualScroll } from "@/components/ui/virtual-scroll";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";
import { CLASSIFICATION_COLORS, type ParsedGameForReview, type ReviewedMove } from "@/lib/game-review";
import { buildVerboseHistoryFromSan } from "@/lib/move-history-verbose";
import { uciToVerboseMoveFromFen } from "@/lib/learn-chess-utils";
import type { Opening } from "@/lib/openings-library";
import type { ExplorationForest, ExplorationVarNode } from "@/lib/review-exploration-tree";

export interface MoveFlags {
  isForced: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

function pathMatchesExplorationPrefix(path: number[], active: number[]): boolean {
  if (path.length > active.length) return false;
  return path.every((v, i) => active[i] === v);
}

function ExplorationMoveListBlock({
  branchBaseFen,
  forest,
  explorationPath,
  onExplorationPathSelect,
}: {
  branchBaseFen: string;
  forest: ExplorationForest;
  explorationPath: number[];
  onExplorationPathSelect: (path: number[]) => void;
}) {
  const { t } = useLanguage();
  if (forest.roots.length === 0) return null;
  return (
    <div className="mb-1.5 mt-1.5 rounded border border-violet-500/35 bg-violet-950/25 px-1 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90 mb-1 px-0.5">
        {t.review.explorationMoveListTitle}
      </div>
      <VariationPlyRows
        fen={branchBaseFen}
        nodes={forest.roots}
        pathPrefix={[]}
        explorationPath={explorationPath}
        onExplorationPathSelect={onExplorationPathSelect}
        depth={0}
        branchPly={forest.branchMainlinePly}
        halfMoveOffset={0}
      />
    </div>
  );
}

function VariationPlyRows({
  fen,
  nodes,
  pathPrefix,
  explorationPath,
  onExplorationPathSelect,
  depth,
  branchPly,
  halfMoveOffset,
}: {
  fen: string;
  nodes: ExplorationVarNode[];
  pathPrefix: number[];
  explorationPath: number[];
  onExplorationPathSelect: (path: number[]) => void;
  depth: number;
  branchPly: number;
  halfMoveOffset: number;
}) {
  const { settings } = useChessboardSettings();

  return (
    <>
      {nodes.map((node, i) => {
        const path = [...pathPrefix, i];
        let board: Chess;
        try {
          board = new Chess(fen);
        } catch {
          return null;
        }
        const turnBefore = board.turn();
        let m = null;
        try {
          const from = node.uci.slice(0, 2) as ChessSquare;
          const to = node.uci.slice(2, 4) as ChessSquare;
          const promotion =
            node.uci.length >= 5
              ? (node.uci[4] as "q" | "r" | "b" | "n")
              : undefined;
          m = board.move({
            from,
            to,
            ...(promotion ? { promotion } : {}),
          });
        } catch {
          return null;
        }
        if (!m) return null;
        const fenAfter = board.fen();
        const absPly = branchPly + halfMoveOffset;
        const mn = Math.floor(absPly / 2) + 1;
        const numLabel = absPly % 2 === 0 ? `${mn}.` : `${mn}...`;
        const verbose = uciToVerboseMoveFromFen(fen, node.uci);
        const isOnPath = pathMatchesExplorationPrefix(path, explorationPath);
        const btn = (
          <button
            type="button"
            onClick={() => onExplorationPathSelect(path)}
            className={`text-left px-1 py-0.5 rounded transition-colors flex items-center gap-1 w-full min-h-[1.5rem] ${
              isOnPath
                ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50"
                : "text-violet-200/90 hover:bg-violet-900/40"
            }`}
          >
            <SanNotation
              verboseMove={verbose}
              fallbackSan={m.san}
              movingColor={turnBefore === "w" ? "w" : "b"}
              pieceSet={settings.pieceSet}
              size="sm"
            />
          </button>
        );
        return (
          <Fragment key={node.id}>
            <div
              className={`grid grid-cols-[2.2rem_1fr_1fr] gap-1 py-0.5 border-b border-violet-800/30 ${
                depth > 0 ? "border-l border-violet-500/40 ml-0.5 pl-1" : ""
              }`}
            >
              <span className="text-violet-400/80 text-[10px] text-right pr-1 pt-0.5 font-mono leading-none">
                {numLabel}
              </span>
              {turnBefore === "w" ? btn : <span />}
              {turnBefore === "b" ? btn : <span />}
            </div>
            {node.children.length > 0 ? (
              <VariationPlyRows
                fen={fenAfter}
                nodes={node.children}
                pathPrefix={path}
                explorationPath={explorationPath}
                onExplorationPathSelect={onExplorationPathSelect}
                depth={depth + 1}
                branchPly={branchPly}
                halfMoveOffset={halfMoveOffset + 1}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

/** FEN Ã  la position de branchement `branchMainlinePly` sur la ligne principale. */
function branchBaseFenForMainlinePly(
  parsed: ParsedGameForReview,
  branchMainlinePly: number
): string {
  if (branchMainlinePly <= 0) return parsed.fenBefore[0];
  const idx = Math.min(branchMainlinePly - 1, parsed.fenAfter.length - 1);
  return parsed.fenAfter[idx] ?? parsed.fenBefore[0];
}

function variationRowIdxForBranch(branchMainlinePly: number): number {
  return branchMainlinePly > 0
    ? Math.floor((branchMainlinePly - 1) / 2)
    : -1;
}

export function MovesList({
  parsed,
  moves,
  verboseMainline,
  currentIndex,
  openingByPly,
  moveFlagsByPly,
  exitTheoryPly,
  onSelect,
  explorationByPly,
  explorationPathByPly,
  onExplorationPathSelect,
}: {
  parsed: ParsedGameForReview;
  moves: ReviewedMove[];
  verboseMainline: ReturnType<typeof buildVerboseHistoryFromSan>;
  currentIndex: number;
  openingByPly: Array<Opening | null>;
  moveFlagsByPly: MoveFlags[];
  exitTheoryPly: number;
  onSelect: (idx: number) => void;
  explorationByPly: Record<number, ExplorationForest>;
  explorationPathByPly: Record<number, number[]>;
  onExplorationPathSelect: (branchMainlinePly: number, path: number[]) => void;
}) {
  const { t } = useLanguage();

  const branchPliesOrdered = useMemo(() => {
    return Object.keys(explorationByPly)
      .map(Number)
      .filter((ply) => {
        const f = explorationByPly[ply];
        return (
          f &&
          f.roots.length > 0 &&
          ply >= 0 &&
          ply < parsed.san.length
        );
      })
      .sort((a, b) => a - b);
  }, [explorationByPly, parsed.san.length]);

  const rows = useMemo(() => {
    const out: Array<{
      moveNumber: number;
      white: {
        san: string;
        ply: number;
        reviewed?: ReviewedMove;
        opening: Opening | null;
        flags: MoveFlags | null;
        isExitTheory: boolean;
      };
      black?: {
        san: string;
        ply: number;
        reviewed?: ReviewedMove;
        opening: Opening | null;
        flags: MoveFlags | null;
        isExitTheory: boolean;
      };
    }> = [];

    for (let i = 0; i < parsed.san.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteSan = parsed.san[i];
      const blackSan = parsed.san[i + 1];
      out.push({
        moveNumber,
        white: {
          san: whiteSan,
          ply: i,
          reviewed: moves[i],
          opening: openingByPly[i] ?? null,
          flags: moveFlagsByPly[i] ?? null,
          isExitTheory: exitTheoryPly === i,
        },
        black: blackSan
          ? {
              san: blackSan,
              ply: i + 1,
              reviewed: moves[i + 1],
              opening: openingByPly[i + 1] ?? null,
              flags: moveFlagsByPly[i + 1] ?? null,
              isExitTheory: exitTheoryPly === i + 1,
            }
          : undefined,
      });
    }
    return out;
  }, [parsed.san, moves, openingByPly, moveFlagsByPly, exitTheoryPly]);

  return (
    <div className="text-sm font-mono">
      {explorationByPly[0]?.roots?.length ? (
        <ExplorationMoveListBlock
          branchBaseFen={branchBaseFenForMainlinePly(parsed, 0)}
          forest={explorationByPly[0]}
          explorationPath={explorationPathByPly[0] ?? []}
          onExplorationPathSelect={(path) => onExplorationPathSelect(0, path)}
        />
      ) : null}
      <VirtualScroll
        items={rows}
        itemHeight={branchPliesOrdered.length > 0 ? 72 : 34}
        maxHeight={480}
        threshold={55}
        getKey={(row) => row.moveNumber}
        renderItem={(row, rowIdx) => (
        <Fragment key={row.moveNumber}>
          <div className="grid grid-cols-[2.2rem_1fr_1fr] gap-1 py-0.5 border-b border-slate-800/60">
            <span className="text-slate-500 text-right pr-1">
              {row.moveNumber}.
            </span>
            <MoveCell
              sanPly={row.white}
              verboseMove={verboseMainline?.[row.white.ply] ?? null}
              isActive={currentIndex === row.white.ply + 1}
              t={t}
              onSelect={onSelect}
            />
            {row.black ? (
              <MoveCell
                sanPly={row.black}
                verboseMove={verboseMainline?.[row.black.ply] ?? null}
                isActive={currentIndex === row.black.ply + 1}
                t={t}
                onSelect={onSelect}
              />
            ) : (
              <span />
            )}
          </div>
          {branchPliesOrdered
            .filter(
              (bp) => bp > 0 && variationRowIdxForBranch(bp) === rowIdx
            )
            .map((bp) => (
              <ExplorationMoveListBlock
                key={`explore-${bp}`}
                branchBaseFen={branchBaseFenForMainlinePly(parsed, bp)}
                forest={explorationByPly[bp]}
                explorationPath={explorationPathByPly[bp] ?? []}
                onExplorationPathSelect={(path) =>
                  onExplorationPathSelect(bp, path)
                }
              />
            ))}
        </Fragment>
      )}
      />
    </div>
  );
}

function MoveCell({
  sanPly,
  verboseMove,
  isActive,
  t,
  onSelect,
}: {
  sanPly: {
    san: string;
    ply: number;
    reviewed?: ReviewedMove;
    opening: Opening | null;
    flags: MoveFlags | null;
    isExitTheory: boolean;
  };
  verboseMove: Move | null;
  isActive: boolean;
  t: ReturnType<typeof useLanguage>["t"];
  onSelect: (idx: number) => void;
}) {
  const { settings } = useChessboardSettings();
  const r = sanPly.reviewed;
  const colors = r ? CLASSIFICATION_COLORS[r.classification] : null;
  const isBook = sanPly.opening !== null;
  const flags = sanPly.flags;
  return (
    <button
      type="button"
      onClick={() => onSelect(sanPly.ply + 1)}
      className={`text-left px-1 py-0.5 rounded transition-colors flex items-center gap-1 ${
        isActive
          ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/50"
          : "text-slate-200 hover:bg-slate-800/60"
      }`}
    >
      <SanNotation
        verboseMove={verboseMove}
        fallbackSan={sanPly.san}
        movingColor={sanPly.ply % 2 === 0 ? "w" : "b"}
        pieceSet={settings.pieceSet}
        size="sm"
      />
      {isBook && (
        <BookOpen
          className="h-3 w-3 text-amber-300/80 shrink-0"
          aria-label={t.review.opening.bookMove}
        />
      )}
      {sanPly.isExitTheory && (
        <LogOut
          className="h-3 w-3 text-orange-300 shrink-0"
          aria-label={t.review.opening.exitTheoryNow}
        />
      )}
      {flags?.isCheckmate && (
        <Skull
          className="h-3 w-3 text-rose-400 shrink-0"
          aria-label={t.review.flags.checkmate}
        />
      )}
      {flags?.isCheck && !flags?.isCheckmate && (
        <ShieldAlert
          className="h-3 w-3 text-orange-400 shrink-0"
          aria-label={t.review.flags.check}
        />
      )}
      {flags?.isForced && (
        <Lock
          className="h-3 w-3 text-sky-300 shrink-0"
          aria-label={t.review.flags.forced}
        />
      )}
      {colors && (
        <span
          className={`text-[10px] leading-none px-1 rounded ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {colors.emoji}
        </span>
      )}
    </button>
  );
}
