"use client";

import { commentTextToNodes } from "@/lib/comment-move-tokens";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";

export default function CoachSanText({
  text,
  side = "white",
  className,
}: {
  text: string;
  side?: "white" | "black";
  className?: string;
}) {
  const { lang } = useLanguage();
  const { settings } = useChessboardSettings();
  return (
    <span className={className}>
      {commentTextToNodes(
        text,
        lang,
        side === "black" ? "b" : "w",
        settings.pieceSet
      )}
    </span>
  );
}
