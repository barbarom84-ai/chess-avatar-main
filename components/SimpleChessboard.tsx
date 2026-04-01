"use client";

import { Chess } from "chess.js";
import Image from "next/image";
import { useEffect, useState } from "react";
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
}

export default function SimpleChessboard({
  position,
  onDrop,
  orientation = "white",
  lastMove,
  arrows = [],
  squareEmojis,
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
  
  const game = new Chess(position === "start" ? undefined : position);
  const board = game.board();

  const [draggedSquare, setDraggedSquare] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [manualArrows, setManualArrows] = useState<Array<{ from: string; to: string; color?: string }>>([]);
  const [manualCircles, setManualCircles] = useState<Array<{ square: string; color?: string }>>([]);
  const [arrowStart, setArrowStart] = useState<{ square: string; color: string } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const checkedKingColor = game.inCheck() ? game.turn() : null;
  const checkedKingSquare = checkedKingColor
    ? (() => {
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece && piece.type === "k" && piece.color === checkedKingColor) {
              return `${files[f]}${ranks[r]}`;
            }
          }
        }
        return null;
      })()
    : null;

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

  const handleDragStart = (square: string, e: React.DragEvent) => {
    if (!onDrop) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', square);
    setDraggedSquare(square);

    // Afficher les coups légaux si l'option est activée
    if (showLegalMoves) {
      const moves = game.moves({ square: square as any, verbose: true });
      const targets = moves.map(m => m.to);
      setHighlightedSquares(targets);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetSquare: string, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!onDrop || !draggedSquare) return;

    const success = onDrop(draggedSquare, targetSquare);
    
    setDraggedSquare(null);
    setHighlightedSquares([]);
  };

  const handleDragEnd = () => {
    setDraggedSquare(null);
    setHighlightedSquares([]);
  };

  // Mode click-to-move
  const handleSquareClick = (square: string, piece: any) => {
    if (!onDrop) return;

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
        const success = onDrop(selectedSquare, square);
        setSelectedSquare(null);
        setHighlightedSquares([]);
        return;
      }

      // Sinon, si on clique sur une autre pièce, on la sélectionne
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as any, verbose: true });
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
        const moves = game.moves({ square: square as any, verbose: true });
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="w-full aspect-square bg-slate-800 p-1.5 sm:p-2 rounded-lg shadow-2xl relative mx-auto"
      style={{ maxWidth: "min(96vw, 84vh, 820px)" }}
    >
      <div className="grid grid-cols-8 gap-0 w-full h-full">
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
            const isHovered = hoveredSquare === square;
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
                style={{
                  backgroundColor: bgColor,
                  transition: `background-color ${animDur} ease`,
                }}
                className={`relative flex items-center justify-center cursor-pointer ${
                  isDragging ? 'opacity-50 scale-95' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(square, e)}
                onClick={() => handleSquareClick(square, piece)}
                onMouseDown={(e) => handleRightClickMouseDown(square, e)}
                onMouseUp={(e) => handleRightClickMouseUp(square, e)}
                onMouseEnter={() => setHoveredSquare(square)}
                onMouseLeave={() => setHoveredSquare(null)}
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

                {piece && (
                  <div
                    className={`w-[80%] h-[80%] relative transition-all ${
                      isDragging ? "scale-110 rotate-6 opacity-70" : "scale-100 rotate-0"
                    } ${isSelected ? "scale-110 drop-shadow-2xl" : ""} ${
                      isCheckedKingSquare ? "drop-shadow-[0_0_12px_rgba(239,68,68,0.85)]" : ""
                    } ${onDrop ? "cursor-pointer hover:scale-105" : ""}`}
                    style={{ transitionDuration: animDur }}
                    draggable={!!onDrop}
                    onDragStart={(e) => handleDragStart(square, e)}
                    onDragEnd={handleDragEnd}
                  >
                    <Image
                      src={getPieceImage(piece)}
                      alt={`${piece.color}${piece.type}`}
                      fill
                      sizes="(max-width: 640px) 11vw, (max-width: 1024px) 9vw, 80px"
                      className="object-contain drop-shadow-lg pointer-events-none"
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
