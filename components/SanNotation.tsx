"use client";

import Image from "next/image";
import type { Move } from "chess.js";
import {
  getPieceImagePath,
  type PieceSet,
} from "@/contexts/ChessboardSettingsContext";

export type SanNotationSize = "sm" | "md" | "lg";

const SIZE_PX: Record<SanNotationSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

const PIECE_LETTER = new Set(["N", "B", "R", "Q", "K"]);

function sanRestAfterPieceLetter(san: string, piece: string): string {
  if (piece === "p") return san;
  if (san.length < 1) return san;
  const first = san[0];
  if (PIECE_LETTER.has(first)) return san.slice(1);
  return san;
}

export interface SanNotationProps {
  verboseMove?: Move | null;
  fallbackSan?: string;
  pieceSet: PieceSet;
  size?: SanNotationSize;
  className?: string;
}

export default function SanNotation({
  verboseMove,
  fallbackSan,
  pieceSet,
  size = "sm",
  className = "",
}: SanNotationProps) {
  const san = verboseMove?.san ?? fallbackSan ?? "";
  if (!san) return null;

  if (!verboseMove) {
    return (
      <span className={`font-mono ${className}`} aria-label={san}>
        {san}
      </span>
    );
  }

  const castle =
    verboseMove.isKingsideCastle() || verboseMove.isQueensideCastle();

  if (castle) {
    return (
      <span
        className={`font-mono inline-flex items-center gap-0.5 ${className}`}
        aria-label={san}
      >
        {san}
      </span>
    );
  }

  const color = verboseMove.color;
  const typeUpper = verboseMove.piece.toUpperCase();
  const src = getPieceImagePath(pieceSet, color, typeUpper);
  const px = SIZE_PX[size];
  const rest = sanRestAfterPieceLetter(san, verboseMove.piece);

  return (
    <span
      className={`inline-flex items-center gap-0.5 align-middle font-mono leading-none ${className}`}
      aria-label={san}
    >
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        className="object-contain shrink-0 align-middle"
        unoptimized
      />
      <span className="leading-tight">{rest}</span>
    </span>
  );
}
