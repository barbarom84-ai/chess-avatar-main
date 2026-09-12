import { Chess } from "chess.js";
import { localizeSan } from "@/lib/localized-san";
import { uciToSquares } from "@/lib/game-review";

export type CoachSightMove = {
  san: string;
  from: string;
  to: string;
};

export type CoachBoardSight = {
  fen: string;
  lastMove: { from: string; to: string } | null;
  arrows: Array<{ from: string; to: string; color?: string }>;
  citedLegal: CoachSightMove[];
  citedIllegal: string[];
};

const PIECE_SAN_RE =
  /\b(?:[O0]-[O0](?:-[O0])?[+#]?|[NBRQKCFDT][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQKCFDT])?[+#]?)\b/g;

const SUGGEST_INTENT_RE = /\b(?:play|jouer|continuation|suite|move)\b/i;
const PAWN_SAN_RE =
  /\b([a-h](?:x[a-h])?[1-8](?:=[NBRQKCFDT])?[+#]?)\b/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asWord(label: string, text: string): boolean {
  return new RegExp(
    `(?<![A-Za-z0-9])${escapeRegExp(label)}(?![A-Za-z0-9])`
  ).test(text);
}

/**
 * Map a coach paragraph onto the FEN it was given: legal cited moves become
 * arrows; invented piece-SANs are flagged.
 */
export function coachBoardSight(args: {
  fen?: string | null;
  lastMoveUci?: string | null;
  lastMoveSan?: string | null;
  bestMoveSan?: string | null;
  text?: string | null;
}): CoachBoardSight | null {
  const fen = args.fen?.trim();
  if (!fen) return null;
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  const verbose = chess.moves({ verbose: true });
  const legalByLabel = new Map<
    string,
    { san: string; from: string; to: string }
  >();
  for (const m of verbose) {
    const entry = { san: m.san, from: m.from, to: m.to };
    legalByLabel.set(m.san, entry);
    legalByLabel.set(localizeSan(m.san, "fr"), entry);
  }

  const knownOk = new Set(
    [args.lastMoveSan, args.bestMoveSan]
      .flatMap((san) => (san ? [san, localizeSan(san, "fr")] : []))
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const text = args.text ?? "";
  const citedLegal: CoachSightMove[] = [];
  const seenLegal = new Set<string>();
  const labels = [...legalByLabel.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    if (label.length < 2) continue;
    if (!asWord(label, text)) continue;
    const move = legalByLabel.get(label);
    if (!move || seenLegal.has(move.san)) continue;
    seenLegal.add(move.san);
    citedLegal.push(move);
  }

  const citedIllegal: string[] = [];
  const seenIllegal = new Set<string>();
  const pushIllegal = (raw: string) => {
    if (!raw || knownOk.has(raw) || legalByLabel.has(raw) || seenIllegal.has(raw)) {
      return;
    }
    seenIllegal.add(raw);
    citedIllegal.push(raw);
  };

  for (const match of text.matchAll(PIECE_SAN_RE)) {
    pushIllegal(match[0]);
  }
  if (SUGGEST_INTENT_RE.test(text)) {
    for (const match of text.matchAll(PAWN_SAN_RE)) {
      pushIllegal(match[1]);
    }
  }

  const lastMove = args.lastMoveUci ? uciToSquares(args.lastMoveUci) : null;

  return {
    fen,
    lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
    arrows: citedLegal.slice(0, 3).map((m, i) => ({
      from: m.from,
      to: m.to,
      color: i === 0 ? "#22d3ee" : "#c084fc",
    })),
    citedLegal,
    citedIllegal,
  };
}
