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

/** English SAN piece letter → image filename letter (always English in chess.js). */
const SAN_LETTER_TO_IMG: Record<string, string> = {
  N: "N",
  B: "B",
  R: "R",
  Q: "Q",
  K: "K",
};

function sanRestAfterPieceLetter(san: string, piece: string): string {
  if (piece === "p") return san;
  if (san.length < 1) return san;
  const first = san[0];
  if (PIECE_LETTER.has(first)) return san.slice(1);
  return san;
}

function isCastleSan(san: string): boolean {
  const s = san.trim();
  return s === "O-O" || s === "O-O-O" || s === "0-0" || s === "0-0-0";
}

function sanNotationFromFallbackSan(
  san: string,
  pieceSet: PieceSet,
  movingColor: "w" | "b",
  size: SanNotationSize,
  className: string
) {
  if (isCastleSan(san)) {
    return (
      <span className={`font-mono ${className}`} aria-label={san}>
        {san}
      </span>
    );
  }

  const first = san[0];
  const imgLetter = first ? SAN_LETTER_TO_IMG[first] : undefined;
  if (imgLetter) {
    const px = SIZE_PX[size];
    const src = getPieceImagePath(pieceSet, movingColor, imgLetter);
    const rest = san.slice(1);
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

  /* Pawn moves (e4, exd5, e8=Q…): universal squares / symbols, no pawn icon */
  return (
    <span className={`font-mono ${className}`} aria-label={san}>
      {san}
    </span>
  );
}

export interface SanNotationProps {
  verboseMove?: Move | null;
  fallbackSan?: string;
  /** Camp qui joue le coup — pour icônes si seul le SAN (anglais) est fourni. */
  movingColor?: "w" | "b";
  pieceSet: PieceSet;
  size?: SanNotationSize;
  className?: string;
}

export default function SanNotation({
  verboseMove,
  fallbackSan,
  movingColor,
  pieceSet,
  size = "sm",
  className = "",
}: SanNotationProps) {
  const san = verboseMove?.san ?? fallbackSan ?? "";
  if (!san) return null;

  const castleVerbose =
    verboseMove &&
    (verboseMove.isKingsideCastle() || verboseMove.isQueensideCastle());
  if (castleVerbose || (!verboseMove && isCastleSan(san))) {
    return (
      <span
        className={`font-mono inline-flex items-center gap-0.5 ${className}`}
        aria-label={san}
      >
        {san}
      </span>
    );
  }

  const pieceType = verboseMove?.piece;

  /* Pawn moves: algebraic text only (icons are confusing; notation stays universal). */
  if (verboseMove && pieceType === "p") {
    return (
      <span className={`font-mono ${className}`} aria-label={san}>
        {san}
      </span>
    );
  }

  if (!verboseMove) {
    return sanNotationFromFallbackSan(
      san,
      pieceSet,
      movingColor ?? "w",
      size,
      className
    );
  }

  if (!pieceType) {
    return sanNotationFromFallbackSan(
      san,
      pieceSet,
      movingColor ?? verboseMove.color ?? "w",
      size,
      className
    );
  }

  const color = verboseMove.color;
  const typeUpper = pieceType.toUpperCase();
  const src = getPieceImagePath(pieceSet, color, typeUpper);
  const px = SIZE_PX[size];
  const rest = sanRestAfterPieceLetter(san, pieceType);

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
