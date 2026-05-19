import type { ParsedGameForReview, ReviewedMove } from "./game-review";
import type { ExplorationForest } from "./review-exploration-tree";
import { forestToPgnSnippet } from "./review-exploration-tree";

export type BuildAnnotatedPgnOptions = {
  /** Variantes par index de coup sur la ligne principale où la branche démarre. */
  explorationsByPly?: Record<number, ExplorationForest> | null;
};

function explorationInsertionFromForest(
  baseFen: string,
  forest: ExplorationForest
): string {
  const inner = forestToPgnSnippet(baseFen, forest).trim();
  if (!inner) return "";
  const parts: string[] = [];
  const note = forest.note.trim();
  if (note) {
    const safe = note.replace(/\}/g, "›").replace(/\{/g, "(");
    parts.push(`{${safe}}`);
  }
  parts.push(`(${inner})`);
  return parts.join(" ");
}

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

/** Seven-tag roster defaults when a tag was absent or stripped as invalid. */
const DEFAULT_ROSTER: Record<string, string> = {
  Event: "?",
  Site: "?",
  Date: "????.??.??",
  Round: "?",
  White: "?",
  Black: "?",
  Result: "*",
};

const ROSTER_ORDER = [
  "Event",
  "Site",
  "Date",
  "Round",
  "White",
  "Black",
  "Result",
] as const;

function isGarbageHeaderValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  const s = String(v).trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return true;
  return false;
}

/**
 * PGN standard date is YYYY.MM.DD ; sources often use ISO YYYY-MM-DD (ChessBase/Fritz reject it).
 */
export function normalizePgnDateField(value: string): string {
  const t = value.trim();
  const iso = t.match(/^(\d{4})[-.](\d{2})[-.](\d{2})$/);
  if (iso) return `${iso[1]}.${iso[2]}.${iso[3]}`;
  return t;
}

/**
 * Drop unusable header values (literal "null" from JSON/API dumps) so desktop importers do not crash.
 */
export function sanitizeHeadersForDesktopExport(
  headers: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(headers)) {
    const key = rawKey.trim();
    if (!key || isGarbageHeaderValue(rawVal)) continue;
    let val = String(rawVal).trim();
    const kl = key.toLowerCase();
    if (kl === "date" || kl === "utcdate" || kl === "eventdate") {
      val = normalizePgnDateField(val);
      if (isGarbageHeaderValue(val)) continue;
    }
    out[key] = val;
  }
  return out;
}

function finalizeHeadersForExport(
  headers: Record<string, string>
): Record<string, string> {
  const cleaned = sanitizeHeadersForDesktopExport(headers);
  return { ...DEFAULT_ROSTER, ...cleaned };
}

function orderedHeaderEntries(h: Record<string, string>): [string, string][] {
  const rosterSet = new Set<string>([...ROSTER_ORDER]);
  const roster = ROSTER_ORDER.map(
    (k): [string, string] => [k, h[k] ?? DEFAULT_ROSTER[k] ?? "?"]
  );
  const rest = Object.entries(h)
    .filter(([k]) => !rosterSet.has(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return [...roster, ...rest];
}

/**
 * Single plain-text comment per move for ChessBase / Fritz / older desktop importers.
 * Avoids `%eval`, brackets, and `%` — those commonly crash or confuse legacy PGN scanners.
 */
function buildDesktopFriendlyComment(rm: ReviewedMove): string {
  if (rm.isBook) return "{Book}";
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
 * Rebuild the PGN with per-move annotations. Headers are filtered (no literal "null" spam),
 * dates normalized to YYYY.MM.DD, then seven-tag roster first — for ChessBase / Fritz.
 */
export function buildAnnotatedPgn(
  parsed: ParsedGameForReview,
  moves: ReviewedMove[],
  opts?: BuildAnnotatedPgnOptions
): string {
  const nl = "\r\n";
  const exportHeaders = finalizeHeadersForExport(parsed.headers);
  const headerLines = orderedHeaderEntries(exportHeaders).map(
    ([k, v]) => `[${k} "${escapePgnHeaderValue(v)}"]`
  );
  const headerBlock = headerLines.join(nl);

  const byPly = opts?.explorationsByPly;

  const tokens: string[] = [];
  for (let i = 0; i < parsed.san.length; i++) {
    const forestAtPly = byPly?.[i];
    if (forestAtPly?.roots?.length) {
      const fen = parsed.fenBefore[i];
      if (fen) {
        const block = explorationInsertionFromForest(fen, forestAtPly);
        if (block) tokens.push(block);
      }
    }
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) tokens.push(`${moveNum}.`);
    tokens.push(parsed.san[i]);
    const rm = moves[i];
    if (rm) {
      tokens.push(buildDesktopFriendlyComment(rm));
    }
  }

  const result = exportHeaders.Result ?? "*";
  tokens.push(result);

  const moveText = tokens.join(" ");
  return `${headerBlock}${nl}${nl}${moveText}${nl}`;
}

export function sanitizeForPgnFilenameSegment(s: string): string {
  const t = s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, "_").trim();
  return (t.length > 0 ? t : "game").slice(0, 80);
}
