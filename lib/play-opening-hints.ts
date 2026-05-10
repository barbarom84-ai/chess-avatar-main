import { Chess } from "chess.js";
import { findBestOpeningByPrefix } from "@/lib/openings-registry";
import { getOpeningById, getOpeningName, type Opening } from "@/lib/openings-library";
import { describeTheoryHitsForUi } from "@/lib/opening-theory";

export const PLAY_EVAL_BAR_STORAGE_KEY = "chess-avatar-play-eval-bar-visible";
export const PLAY_THEORY_ARROWS_STORAGE_KEY = "chess-avatar-play-opening-hints-visible";

export function sanHistoryToUci(sanMoves: string[]): string[] {
  const temp = new Chess();
  const uci: string[] = [];
  for (const san of sanMoves) {
    const m = temp.move(san);
    if (m) uci.push(m.from + m.to + (m.promotion ?? ""));
  }
  return uci;
}

export interface PlayOpeningHintsResult {
  aligned: boolean;
  opening: Opening | null;
  matchedPlies: number;
  /** Main label: ECO · localized name when identified */
  titleLine: string | null;
  /** Other repertoire lines at this position (transpositions) */
  subtitleLine: string | null;
  /** Next book moves as UCI (deduped, max 3) */
  theoryArrowUcis: string[];
}

function uciToArrowKey(uci: string): string {
  return uci.length >= 4 ? uci.slice(0, 4) : uci;
}

/**
 * Opening label + optional theory arrows for the in-play board (local repertoire + FEN index).
 */
export function computePlayOpeningHints(
  sanMoves: string[],
  fen: string,
  lang: string
): PlayOpeningHintsResult {
  const uci = sanHistoryToUci(sanMoves);
  const { opening, matchedPlies } = findBestOpeningByPrefix(uci);
  const aligned = Boolean(opening && matchedPlies === uci.length);

  const theoryArrowUcis: string[] = [];
  const seenArrow = new Set<string>();

  const pushArrow = (raw: string) => {
    if (raw.length < 4) return;
    const k = uciToArrowKey(raw);
    if (seenArrow.has(k)) return;
    seenArrow.add(k);
    theoryArrowUcis.push(raw);
  };

  let titleLine: string | null = null;

  if (opening && aligned) {
    titleLine = `${opening.eco} · ${getOpeningName(opening, lang)}`;
    if (matchedPlies < opening.uciMoves.length) {
      pushArrow(opening.uciMoves[matchedPlies]);
    }
  } else if (opening && !aligned && uci.length > 0) {
    titleLine = `${opening.eco} · ${getOpeningName(opening, lang)}`;
  }

  const transHits = describeTheoryHitsForUi(fen, lang, {
    skipOpeningId: aligned && opening ? opening.id : undefined,
    skipTheoryStep:
      aligned && opening !== null ? matchedPlies : undefined,
  });

  if (!opening && transHits.length > 0) {
    const stepWord = lang === "fr" ? "Étape" : "Step";
    titleLine = transHits
      .slice(0, 2)
      .map((h) => `${h.name} (${stepWord} ${h.theoryStep})`)
      .join(" · ");
  }

  let subtitleLine: string | null = null;
  if (transHits.length > 0) {
    const stepWord = lang === "fr" ? "Étape" : "Step";
    subtitleLine = transHits
      .slice(0, 4)
      .map((h) => `${h.name} (${stepWord} ${h.theoryStep})`)
      .join(" · ");
    if (subtitleLine === titleLine) subtitleLine = null;
  }

  if (!aligned || !opening) {
    for (const h of transHits) {
      if (theoryArrowUcis.length >= 3) break;
      const op = getOpeningById(h.openingId);
      if (!op || h.theoryStep >= op.uciMoves.length) continue;
      pushArrow(op.uciMoves[h.theoryStep]);
    }
  }

  return {
    aligned,
    opening,
    matchedPlies,
    titleLine,
    subtitleLine,
    theoryArrowUcis,
  };
}
