"use client";

import { Chess, type Square, type Piece } from "chess.js";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChessboardSettings, getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import {
  LICHESS_ARROW_COLORS,
  getLichessArrowColorFromModifiers,
  applyArrowOpacityPercent,
} from "@/lib/chess-arrows";

interface SimpleChessboardProps {
  position: string;
  onDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  arrows?: Array<{ from: string; to: string; color?: string }>;
  /** Émojis affichés sur des cases (ex. case d’arrivée d’un coup annoté) */
  squareEmojis?: Record<string, string>;
  /** Cases spéciales Fantasy : anneau coloré + icône (explosive/trap/tunnel). */
  squareEffects?: Record<
    string,
    {
      icon: string;
      variant: "explosive" | "trap" | "tunnel";
      /** Center of a triggered explosion. */
      exploded?: boolean;
      /** Neighbour caught in blast radius. */
      blastRadius?: boolean;
    }
  >;
}

export default function SimpleChessboard({
  position,
  onDrop,
  orientation = "white",
  lastMove,
  arrows = [],
  squareEmojis,
  squareEffects,
}: SimpleChessboardProps) {
  const { settings } = useChessboardSettings();
  const {
    boardTheme,
    pieceSet,
    showCoordinates,
    showLegalMoves,
    highlightLastMove,
    lastMoveArrowOpacityPercent,
    animationSpeed,
  } = settings;
  
  const { game, board, checkedKingColor, checkedKingSquare } = useMemo(() => {
    const g = new Chess(position === "start" ? undefined : position);
    const b = g.board();
    const kingColor = g.inCheck() ? g.turn() : null;
    let kingSquare: string | null = null;
    if (kingColor) {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = b[r][f];
          if (piece && piece.type === "k" && piece.color === kingColor) {
            kingSquare = `${files[f]}${ranks[r]}`;
            break;
          }
        }
        if (kingSquare) break;
      }
    }
    return {
      game: g,
      board: b,
      checkedKingColor: kingColor,
      checkedKingSquare: kingSquare,
    };
  }, [position]);

  const [draggedSquare, setDraggedSquare] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [manualArrows, setManualArrows] = useState<Array<{ from: string; to: string; color?: string }>>([]);
  const [manualCircles, setManualCircles] = useState<Array<{ square: string; color?: string }>>([]);
  const [arrowStart, setArrowStart] = useState<{ square: string; color: string } | null>(null);
  const [dragClientPos, setDragClientPos] = useState<{ x: number; y: number } | null>(null);
  const [dragPiece, setDragPiece] = useState<{ type: string; color: string } | null>(null);
  const [dragGhostSize, setDragGhostSize] = useState<{ width: number; height: number } | null>(null);

  const dragMovedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const activeDragSquareRef = useRef<string | null>(null);
  const dragStartClientRef = useRef<{ x: number; y: number } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  // Inverser l'échiquier si orientation = black
  const displayFiles = orientation === 'black' ? [...files].reverse() : files;
  const displayRanks = orientation === 'black' ? [...ranks].reverse() : ranks;

  const getPieceImage = (piece: { type: string; color: string }) => {
    const color = piece.color === 'w' ? 'w' : 'b';
    const type = piece.type.toUpperCase();
    return getPieceImagePath(pieceSet, color, type);
  };

  // Durée d'animation en fonction des paramètres
  const getAnimationDuration = () => {
    switch (animationSpeed) {
      case "none":
        return "0ms";
      case "fast":
        return "100ms";
      case "normal":
        return "200ms";
      case "slow":
        return "400ms";
      default:
        return "200ms";
    }
  };

  const animDur = getAnimationDuration();
  const isBoardDragging = draggedSquare !== null;

  const resetPointerDrag = () => {
    activeDragSquareRef.current = null;
    setDraggedSquare(null);
    setDragClientPos(null);
    setDragPiece(null);
    setDragGhostSize(null);
    setHighlightedSquares([]);
    dragMovedRef.current = false;
    dragStartClientRef.current = null;
  };

  const beginPiecePointerDrag = (
    square: string,
    piece: { type: string; color: string },
    e: React.PointerEvent
  ) => {
    if (!onDrop || e.button !== 0) return;
    if (piece.color !== game.turn()) return;

    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    activeDragSquareRef.current = square;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggedSquare(square);
    setDragPiece({ type: piece.type, color: piece.color });
    setDragClientPos({ x: e.clientX, y: e.clientY });
    setDragGhostSize({ width: rect.width, height: rect.height });

    if (showLegalMoves) {
      const moves = game.moves({ square: square as Square, verbose: true });
      setHighlightedSquares(moves.map((m) => m.to));
    }
  };

  const suppressSyntheticClickAfterPointer = () => {
    suppressNextClickRef.current = true;
    requestAnimationFrame(() => {
      suppressNextClickRef.current = false;
    });
  };

  const movePiecePointerDrag = (square: string, e: React.PointerEvent) => {
    if (activeDragSquareRef.current !== square) return;
    setDragClientPos({ x: e.clientX, y: e.clientY });
    const origin = dragStartClientRef.current;
    if (origin) {
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (dx * dx + dy * dy > 36) {
        dragMovedRef.current = true;
      }
    }
  };

  const endPiecePointerDrag = (square: string, e: React.PointerEvent) => {
    if (!onDrop || activeDragSquareRef.current !== square) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const fromSquare = square;
    const moved = dragMovedRef.current;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest("[data-chess-square]");
    const toSquare = cell?.getAttribute("data-chess-square") ?? null;

    resetPointerDrag();

    if (!moved && toSquare === fromSquare) {
      const p = game.get(fromSquare as Square);
      handleSquareClick(fromSquare, p);
      suppressSyntheticClickAfterPointer();
      return;
    }

    suppressSyntheticClickAfterPointer();

    if (toSquare && toSquare !== fromSquare) {
      onDrop(fromSquare, toSquare);
    }
  };

  const handlePieceLostPointerCapture = (square: string) => {
    if (activeDragSquareRef.current !== square) return;
    resetPointerDrag();
    suppressSyntheticClickAfterPointer();
  };

  // Mode click-to-move
  const handleSquareClick = (
    square: string,
    piece: Piece | null | undefined
  ) => {
    if (!onDrop) return;
    if (suppressNextClickRef.current) return;

    // Si une case est déjà sélectionnée
    if (selectedSquare) {
      // Si on clique sur la même case, on désélectionne
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setHighlightedSquares([]);
        return;
      }

      // Si on clique sur une case valide, on fait le coup
      if (highlightedSquares.includes(square)) {
        onDrop(selectedSquare, square);
        setSelectedSquare(null);
        setHighlightedSquares([]);
        return;
      }

      // Sinon, si on clique sur une autre pièce, on la sélectionne
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as Square, verbose: true });
        const targets = moves.map(m => m.to);
        setHighlightedSquares(targets);
        return;
      }

      // Sinon, on désélectionne
      setSelectedSquare(null);
      setHighlightedSquares([]);
    } else {
      // Première sélection : si c'est une pièce du joueur actuel
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as Square, verbose: true });
        const targets = moves.map(m => m.to);
        setHighlightedSquares(targets);
      }
    }
  };

  // Fonction pour convertir une case en coordonnées SVG
  const squareToCoords = (square: string): { x: number; y: number } => {
    const file = square[0];
    const rank = square[1];
    const fileIdx = displayFiles.indexOf(file);
    const rankIdx = displayRanks.indexOf(rank);
    // Centre de la case (en pourcentage)
    const x = (fileIdx + 0.5) * 12.5; // 100% / 8 = 12.5%
    const y = (rankIdx + 0.5) * 12.5;
    return { x, y };
  };

  const handleRightClickMouseDown = (square: string, e: React.MouseEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    setArrowStart({
      square,
      color: getLichessArrowColorFromModifiers(e),
    });
  };

  const handleRightClickMouseUp = (square: string, e: React.MouseEvent) => {
    if (e.button !== 2 || !arrowStart) return;
    e.preventDefault();

    if (arrowStart.square === square) {
      // Clic droit sans drag = cercle coloré (toggle), style Lichess.
      setManualCircles((prev) => {
        const existingIndex = prev.findIndex(
          (c) => c.square === square && c.color === arrowStart.color
        );
        if (existingIndex >= 0) {
          return prev.filter((_, idx) => idx !== existingIndex);
        }
        return [...prev, { square, color: arrowStart.color }];
      });
      setArrowStart(null);
      return;
    }

    setManualArrows((prev) => {
      const existingIndex = prev.findIndex(
        (a) => a.from === arrowStart.square && a.to === square && a.color === arrowStart.color
      );
      if (existingIndex >= 0) {
        return prev.filter((_, idx) => idx !== existingIndex);
      }
      return [...prev, { from: arrowStart.square, to: square, color: arrowStart.color }];
    });

    setArrowStart(null);
  };

  const propArrowsProcessed = arrows.map((a) => {
    const base = a.color || LICHESS_ARROW_COLORS.defaultGreen;
    const isLastMoveArrow =
      !!lastMove && a.from === lastMove.from && a.to === lastMove.to;
    return {
      ...a,
      color: isLastMoveArrow
        ? applyArrowOpacityPercent(base, lastMoveArrowOpacityPercent)
        : base,
    };
  });
  const renderedArrows = [...propArrowsProcessed, ...manualArrows];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setManualArrows([]);
        setManualCircles([]);
        setArrowStart(null);
        activeDragSquareRef.current = null;
        setDraggedSquare(null);
        setDragClientPos(null);
        setDragPiece(null);
        setDragGhostSize(null);
        setHighlightedSquares([]);
        dragMovedRef.current = false;
        dragStartClientRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`w-full aspect-square bg-slate-800 p-1.5 sm:p-2 rounded-lg shadow-2xl relative mx-auto min-h-0 ${
        onDrop ? "touch-none" : ""
      } ${isBoardDragging ? "cursor-grabbing select-none" : ""}`}
      style={{ maxWidth: "min(96vw, 84vh, 820px)" }}
    >
      <div className="grid grid-cols-8 grid-rows-8 gap-0 w-full h-full min-h-0">
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}`;
            const boardRankIdx = ranks.indexOf(rank);
            const boardFileIdx = files.indexOf(file);
            const piece = board[boardRankIdx][boardFileIdx];
            const isLight = (boardRankIdx + boardFileIdx) % 2 === 0;
            
            const isDragging = draggedSquare === square;
            const isSelected = selectedSquare === square;
            const isHighlighted = showLegalMoves && highlightedSquares.includes(square);
            const isLastMove = highlightLastMove && lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckedKingSquare = checkedKingSquare === square;
            
            // Couleur de la case (utilise le thème)
            let bgColor = '';
            if (isSelected) {
              bgColor = boardTheme.selectedSquare;
            } else if (isLastMove) {
              bgColor = isLight ? boardTheme.lastMoveLight : boardTheme.lastMoveDark;
            } else {
              bgColor = isLight ? boardTheme.lightSquare : boardTheme.darkSquare;
            }
            
            return (
              <div
                key={square}
                data-chess-square={square}
                style={{
                  backgroundColor: bgColor,
                  transition: isBoardDragging
                    ? "none"
                    : `background-color ${animDur} ease`,
                }}
                className={`relative flex items-center justify-center cursor-pointer ${
                  isDragging ? "opacity-50 scale-95" : ""
                }`}
                onClick={() => handleSquareClick(square, piece)}
                onMouseDown={(e) => handleRightClickMouseDown(square, e)}
                onMouseUp={(e) => handleRightClickMouseUp(square, e)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {squareEmojis?.[square] && (
                  <span
                    className="absolute bottom-0.5 right-0.5 z-[25] text-[clamp(10px,2.8vw,18px)] leading-none pointer-events-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                    title=""
                    aria-hidden
                  >
                    {squareEmojis[square]}
                  </span>
                )}

                {squareEffects?.[square] && (
                  <>
                    <div
                      className={`pointer-events-none absolute inset-0 z-[8] rounded-sm fantasy-sq fantasy-sq-${squareEffects[square].variant}${
                        squareEffects[square].exploded ? " fantasy-sq-exploded" : ""
                      }${squareEffects[square].blastRadius ? " fantasy-sq-blast-radius" : ""}`}
                      aria-hidden
                    />
                    {squareEffects[square].icon ? (
                      <span
                        className={`pointer-events-none absolute top-0.5 left-1 z-[26] text-[clamp(10px,2.8vw,18px)] leading-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]${
                          squareEffects[square].exploded ? " fantasy-explosion-icon" : ""
                        }`}
                        aria-hidden
                      >
                        {squareEffects[square].icon}
                      </span>
                    ) : null}
                  </>
                )}

                {piece && (
                  <div
                    className={`w-[80%] h-[80%] relative ${
                      isBoardDragging
                        ? ""
                        : "transition-transform transition-opacity"
                    } ${
                      isDragging && onDrop ? "" : "scale-100 rotate-0"
                    } ${isSelected ? `scale-110${isBoardDragging ? "" : " drop-shadow-2xl"}` : ""} ${
                      isCheckedKingSquare && !isBoardDragging
                        ? "drop-shadow-[0_0_12px_rgba(239,68,68,0.85)]"
                        : ""
                    } ${
                      onDrop && !isBoardDragging
                        ? "cursor-grab hover:scale-105 active:cursor-grabbing"
                        : onDrop
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
                    }`}
                    style={
                      isBoardDragging ? undefined : { transitionDuration: animDur }
                    }
                    draggable={false}
                    onPointerDown={(e) => beginPiecePointerDrag(square, piece, e)}
                    onPointerMove={(e) => movePiecePointerDrag(square, e)}
                    onPointerUp={(e) => endPiecePointerDrag(square, e)}
                    onLostPointerCapture={() => handlePieceLostPointerCapture(square)}
                  >
                    <Image
                      src={getPieceImage(piece)}
                      alt={`${piece.color}${piece.type}`}
                      fill
                      sizes="(max-width: 640px) 11vw, (max-width: 1024px) 9vw, 80px"
                      className={`object-contain pointer-events-none ${
                        isDragging && onDrop ? "opacity-0" : ""
                      } ${isBoardDragging ? "" : "drop-shadow-lg"}`}
                      unoptimized
                      draggable={false}
                    />
                  </div>
                )}

                {/* Indicateur de coup légal - Amélioré */}
                {isHighlighted && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {piece ? (
                      <>
                        <div
                          className="w-full h-full border-[3px] rounded-sm opacity-50 animate-pulse"
                          style={{ borderColor: boardTheme.legalMoveCapture }}
                        />
                        <div
                          className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg"
                          style={{ backgroundColor: boardTheme.legalMoveCapture }}
                        />
                        <div
                          className="absolute bottom-0 left-0 w-3 h-3 rounded-tr-lg"
                          style={{ backgroundColor: boardTheme.legalMoveCapture }}
                        />
                      </>
                    ) : (
                      <div
                        className="w-[30%] h-[30%] rounded-full opacity-70 hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: boardTheme.legalMoveEmpty }}
                      />
                    )}
                  </div>
                )}

                {isSelected && (
                  <div
                    className="absolute inset-0 border-4 rounded-sm pointer-events-none z-10 animate-pulse"
                    style={{ borderColor: boardTheme.selectedSquare }}
                  />
                )}

                {/* Indicateur de roi en échec */}
                {isCheckedKingSquare && (
                  <div className="absolute inset-0 border-[3px] border-red-500 rounded-sm pointer-events-none z-20 animate-pulse" />
                )}

                {/* Cercles manuels (clic droit sans drag) */}
                {manualCircles
                  .filter((circle) => circle.square === square)
                  .map((circle, idx) => (
                    <div
                      key={`circle-${square}-${idx}`}
                      className="absolute inset-[4%] rounded-full border-[3px] pointer-events-none z-20"
                      style={{ borderColor: circle.color || LICHESS_ARROW_COLORS.defaultGreen }}
                    />
                  ))}
                
                {/* Coordonnées */}
                {showCoordinates && fileIdx === 0 && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] font-semibold opacity-80"
                    style={{
                      color: isLight ? boardTheme.darkSquare : boardTheme.lightSquare,
                    }}
                  >
                    {rank}
                  </span>
                )}
                {showCoordinates && rankIdx === displayRanks.length - 1 && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] font-semibold opacity-80"
                    style={{
                      color: isLight ? boardTheme.darkSquare : boardTheme.lightSquare,
                    }}
                  >
                    {file}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {dragPiece && dragClientPos && dragGhostSize && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[200]"
          style={{
            left: dragClientPos.x,
            top: dragClientPos.y,
            width: dragGhostSize.width,
            height: dragGhostSize.height,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative h-full w-full">
            <Image
              src={getPieceImage(dragPiece)}
              alt=""
              fill
              sizes={`${Math.ceil(dragGhostSize.width)}px`}
              className="object-contain drop-shadow-lg"
              unoptimized
              draggable={false}
            />
          </div>
        </div>
      )}
      
      {/* Overlay SVG pour les flèches */}
      {renderedArrows.length > 0 && (
        <svg 
          className="absolute inset-0 pointer-events-none" 
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {renderedArrows.map((arrow, idx) => {
              const color = arrow.color || LICHESS_ARROW_COLORS.defaultGreen;
              return (
                <marker
                  key={`marker-${idx}`}
                  id={`arrowhead-${idx}`}
                  markerWidth="3.4"
                  markerHeight="3.4"
                  refX="2.9"
                  refY="1.7"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 3.4 1.7, 0 3.4" fill={color} />
                </marker>
              );
            })}
          </defs>
          {renderedArrows.map((arrow, idx) => {
            const from = squareToCoords(arrow.from);
            const to = squareToCoords(arrow.to);
            const color = arrow.color || LICHESS_ARROW_COLORS.defaultGreen;
            
            return (
              <g key={idx}>
                {/* Cercle de départ façon Lichess */}
                <circle
                  cx={`${from.x}%`}
                  cy={`${from.y}%`}
                  r="2.8"
                  fill="none"
                  stroke={color}
                  strokeWidth="0.6"
                />
                <line
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke={color}
                  strokeWidth="1.05"
                  markerEnd={`url(#arrowhead-${idx})`}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
