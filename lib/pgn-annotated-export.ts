import type { ParsedGameForReview, ReviewedMove } from "./game-review";

/**
 * PGN seven-tag / header value escaping: backslash and double-quote must be escaped.
 * @see https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1.1
 */
export function escapePgnHeaderValue(value: string): string {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Single plain-text comment per move for ChessBase / Fritz / older desktop importers.
 * Avoids `%eval`, brackets, and `%` — those commonly crash or confuse legacy PGN scanners.
 */
function buildDesktopFriendlyComment(rm: ReviewedMove): string {
  const cls =
    rm.classification.charAt(0).toUpperCase() + rm.classification.slice(1);
  if (
    rm.isMatePlayer &&
    rm.playerMateInMoves !== undefined &&
    rm.playerMateInMoves !== 0
  ) {
    const n = Math.abs(rm.playerMateInMoves);
    const matePhrase =
      rm.playerMateInMoves > 0
        ? `White mates in ${n}`
        : `Black mates in ${n}`;
    return `{${cls} -- ${matePhrase}}`;
  }
  const v = clamp(rm.playerEval, -99, 99);
  const num = v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
  return `{${cls} ${num}}`;
}

/**
 * Rebuild the PGN with per-move annotations. Comments are ASCII-only plain braces (no `%eval`
 * blocks) for compatibility with ChessBase, Fritz, and web importers.
 */
export function buildAnnotatedPgn(
  parsed: ParsedGameForReview,
  moves: ReviewedMove[]
): string {
  const nl = "\r\n";
  const headerBlock = Object.entries(parsed.headers)
    .map(([k, v]) => `[${k} "${escapePgnHeaderValue(String(v))}"]`)
    .join(nl);

  const tokens: string[] = [];
  for (let i = 0; i < parsed.san.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) tokens.push(`${moveNum}.`);
    tokens.push(parsed.san[i]);
    const rm = moves[i];
    if (rm) {
      tokens.push(buildDesktopFriendlyComment(rm));
    }
  }

  const result = parsed.headers.Result ?? "*";
  tokens.push(result);

  const moveText = tokens.join(" ");
  return `${headerBlock}${nl}${nl}${moveText}${nl}`;
}

export function sanitizeForPgnFilenameSegment(s: string): string {
  const t = s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, "_").trim();
  return (t.length > 0 ? t : "game").slice(0, 80);
}
