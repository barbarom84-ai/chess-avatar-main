import type { EngineConfig } from "@/lib/analysis";

/**
 * Unifie la plateforme stockée dans une EngineConfig (imports JSON, vieilles données,
 * espaces/casse). Toute valeur non reconnue comme Chess.com est traitée comme Lichess.
 */
export function normalizeEnginePlatform(
  config: Pick<EngineConfig, "platform">
): "lichess" | "chesscom" {
  const raw = config.platform as "lichess" | "chesscom" | undefined | null;
  if (raw === undefined || raw === null) return "lichess";
  const s = String(raw).trim().toLowerCase();
  if (!s) return "lichess";
  const compact = s.replace(/\./g, "").replace(/\s+/g, "");
  if (
    compact === "chesscom" ||
    compact === "chesscomorg" ||
    s === "chess.com"
  ) {
    return "chesscom";
  }
  return "lichess";
}
