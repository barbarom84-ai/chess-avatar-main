"use client";

import { commentTextToNodes } from "@/lib/comment-move-tokens";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";

export default function CoachSanText({
  text,
  side = "white",
  coloredMoves,
  fenBefore,
  fen,
  className,
}: {
  text: string;
  side?: "white" | "black";
  /** SANs that must use a specific side's piece (last move, missed alternative). */
  coloredMoves?: Array<{ san?: string | null; side?: "white" | "black" | null }>;
  /** Position before the explained ply — moves legal here belong to `side`. */
  fenBefore?: string | null;
  /** Displayed position — moves legal here belong to the side to move. */
  fen?: string | null;
  className?: string;
}) {
  const { lang } = useLanguage();
  const { settings } = useChessboardSettings();
  const playedMoves = (coloredMoves ?? [])
    .filter((m) => m.san && m.side)
    .map((m) => ({
      san: m.san as string,
      color: (m.side === "black" ? "b" : "w") as "w" | "b",
    }));
  return (
    <span className={className}>
      {commentTextToNodes(
        text,
        lang,
        side === "black" ? "b" : "w",
        settings.pieceSet,
        playedMoves,
        { fenBefore, fen }
      )}
    </span>
  );
}
