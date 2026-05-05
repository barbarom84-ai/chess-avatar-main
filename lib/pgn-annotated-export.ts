import type { ParsedGameForReview, ReviewedMove } from "./game-review";

/**
 * PGN seven-tag / header value escaping: backslash and double-quote must be escaped.
 * @see https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1.1
 */
export function escapePgnHeaderValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Lichess-style numeric eval for PGN comments (no leading plus; avoids picky parsers).
 */
function formatNumericEvalForPgn(pawns: number): string {
  const v = clamp(pawns, -99, 99);
  const s = v.toFixed(2);
  if (Object.is(v, -0)) return "0.00";
  return s;
}

/**
 * Mate as extension tag [%eval #n] / [%eval #-n] (white POV), widely accepted by web apps.
 */
function formatMateEvalTag(playerMateInMovesWhitePov: number): string {
  const n = Math.abs(playerMateInMovesWhitePov);
  if (playerMateInMovesWhitePov > 0) return `#${n}`;
  return `#-${n}`;
}

/**
 * Build eval-only comment (ChessBase-friendly): one opcode per brace block, no trailing prose.
 */
function buildEvalCommentBlock(rm: ReviewedMove): string {
  if (rm.isMatePlayer && rm.playerMateInMoves !== undefined && rm.playerMateInMoves !== 0) {
    return `{[%eval ${formatMateEvalTag(rm.playerMateInMoves)}]}`;
  }
  return `{[%eval ${formatNumericEvalForPgn(rm.playerEval)}]}`;
}

/**
 * Classification in its own comment so [%eval …] stays a single token block (strict PGN consumers).
 */
function buildClassificationCommentBlock(rm: ReviewedMove): string {
  const c = rm.classification;
  const label = c.charAt(0).toUpperCase() + c.slice(1);
  return `{${label}}`;
}

/**
 * Rebuild the PGN with per-move annotations. Headers are properly escaped; eval and labels are
 * split into separate comments for compatibility with ChessBase and web importers.
 */
export function buildAnnotatedPgn(
  parsed: ParsedGameForReview,
  moves: ReviewedMove[]
): string {
  const headerBlock = Object.entries(parsed.headers)
    .map(([k, v]) => `[${k} "${escapePgnHeaderValue(v)}"]`)
    .join("\n");

  const tokens: string[] = [];
  for (let i = 0; i < parsed.san.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) tokens.push(`${moveNum}.`);
    tokens.push(parsed.san[i]);
    const rm = moves[i];
    if (rm) {
      tokens.push(buildEvalCommentBlock(rm));
      tokens.push(buildClassificationCommentBlock(rm));
    }
  }

  const result = parsed.headers.Result ?? "*";
  tokens.push(result);

  const moveText = tokens.join(" ");
  return `${headerBlock}\n\n${moveText}\n`;
}

export function sanitizeForPgnFilenameSegment(s: string): string {
  const t = s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, "_").trim();
  return (t.length > 0 ? t : "game").slice(0, 80);
}
