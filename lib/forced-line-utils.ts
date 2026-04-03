import { getOpeningById } from "@/lib/openings-library";
import type { EngineConfig } from "@/lib/analysis";
import { buildFritzBlackOpeningFallback } from "@/lib/fritz-opening-fallback";

export type ForcedLineSource = "openings" | "custom";

export function splitUciSequence(uciMoves: string[]): { white: string[]; black: string[] } {
  const white: string[] = [];
  const black: string[] = [];
  for (let i = 0; i < uciMoves.length; i++) {
    if (i % 2 === 0) white.push(uciMoves[i]);
    else black.push(uciMoves[i]);
  }
  return { white, black };
}

export function deriveForcedLinesFromOpenings(
  whiteOpenings: { id: string; weight: number }[],
  blackOpenings: { id: string; weight: number }[]
): { white: string[]; black: string[] } {
  const white: string[] = [];
  const black: string[] = [];
  const byWeight = (a: { weight: number }, b: { weight: number }) => (b.weight ?? 0) - (a.weight ?? 0);
  const firstWhite = [...whiteOpenings].sort(byWeight)[0]?.id;
  const firstBlack = [...blackOpenings].sort(byWeight)[0]?.id;

  /* Chaque répertoire ne remplit que son côté : pas de repli des coups noirs d’une ouverture blanche
   * quand seules les blanches sont choisies (et inversement). */
  if (firstWhite) {
    const op = getOpeningById(firstWhite);
    if (op?.uciMoves?.length) {
      const { white: w } = splitUciSequence(op.uciMoves);
      white.push(...w);
    }
  }
  if (firstBlack) {
    const op = getOpeningById(firstBlack);
    if (op?.uciMoves?.length) {
      const { black: b } = splitUciSequence(op.uciMoves);
      black.push(...b);
    }
  }

  return { white, black };
}

export function interleaveForcedLines(white: string[], black: string[]): string[] {
  const out: string[] = [];
  const max = Math.max(white.length, black.length);
  for (let i = 0; i < max; i++) {
    if (i < white.length) out.push(normalizeUci(white[i]));
    if (i < black.length) out.push(normalizeUci(black[i]));
  }
  return out;
}

export function normalizeUci(uci: string): string {
  if (!uci || typeof uci !== "string") return "";
  const s = uci.trim().toLowerCase();
  return s.length >= 4 ? s.slice(0, 4) + (s[4] ?? "") : s;
}

/** Config étendu pour rétrocompatibilité (forcedOpenings, etc.) */
type ConfigWithLegacy = EngineConfig & {
  forcedOpenings?: { white?: string | string[]; black?: string | string[] };
};

/**
 * Coups blancs / noirs effectifs (sans intercaler). Pour le jeu : le joueur humain
 * n’est pas obligé de suivre la ligne blanche du répertoire pour que le bot joue les noirs.
 */
export function getEffectiveForcedLinesByColor(config: EngineConfig): { white: string[]; black: string[] } {
  const rep = config.openingRepertoire;
  const hasRepertoire =
    (rep?.whiteOpenings?.length ?? 0) > 0 || (rep?.blackOpenings?.length ?? 0) > 0;
  const src = config.forcedLineSource ?? "custom";
  let white = (config.forcedLineWhite ?? []).map(normalizeUci).filter(Boolean);
  let black = (config.forcedLineBlack ?? []).map(normalizeUci).filter(Boolean);

  if (rep && (src === "openings" || (hasRepertoire && white.length === 0 && black.length === 0))) {
    const derived = deriveForcedLinesFromOpenings(
      rep.whiteOpenings ?? [],
      rep.blackOpenings ?? []
    );
    white = derived.white.map(normalizeUci).filter(Boolean);
    black = derived.black.map(normalizeUci).filter(Boolean);
  }

  if (white.length > 0 || black.length > 0) {
    return { white, black };
  }

  const legacy = config.forcedLine;
  if (Array.isArray(legacy) && legacy.length > 0) {
    const { white: w, black: b } = splitUciSequence(legacy.map(normalizeUci));
    return { white: w.filter(Boolean), black: b.filter(Boolean) };
  }

  const fo = (config as ConfigWithLegacy).forcedOpenings;
  if (fo) {
    const whiteId = Array.isArray(fo.white) ? fo.white[0] : fo.white;
    const blackId = Array.isArray(fo.black) ? fo.black[0] : fo.black;
    if (whiteId || blackId) {
      const derived = deriveForcedLinesFromOpenings(
        whiteId ? [{ id: whiteId, weight: 100 }] : [],
        blackId ? [{ id: blackId, weight: 100 }] : []
      );
      return {
        white: derived.white.map(normalizeUci).filter(Boolean),
        black: derived.black.map(normalizeUci).filter(Boolean),
      };
    }
  }

  return { white: [], black: [] };
}

export function getEffectiveForcedLine(config: EngineConfig): string[] {
  const { white, black } = getEffectiveForcedLinesByColor(config);
  const seq = interleaveForcedLines(white, black);
  return seq.length > 0 ? seq : [];
}

/** Demi-coup i (0 = trait aux blancs) : coup prévu dans la ligne si défini. */
export function expectedForcedUciAtPly(white: string[], black: string[], ply: number): string | undefined {
  const idx = ply >>> 1;
  const raw = ply % 2 === 0 ? white[idx] : black[idx];
  return raw ? normalizeUci(raw) : undefined;
}

/** Ne contrôle que les coups du bot (les vôtres peuvent être 1.e4 même si le répertoire blanc est Réti). */
export function forcedLinePrefixMatchesBotMovesOnly(
  white: string[],
  black: string[],
  historyUci: string[],
  botPlaysWhite: boolean
): boolean {
  for (let i = 0; i < historyUci.length; i++) {
    const moveIsByBot = botPlaysWhite ? i % 2 === 0 : i % 2 === 1;
    if (!moveIsByBot) continue;

    const expected = expectedForcedUciAtPly(white, black, i);
    if (expected === undefined) continue;
    if (normalizeUci(historyUci[i]) !== expected) return false;
  }
  return true;
}

export function nextForcedMoveForBot(
  white: string[],
  black: string[],
  nextPly: number,
  botPlaysWhite: boolean
): string | undefined {
  const whiteToMove = nextPly % 2 === 0;
  if (botPlaysWhite !== whiteToMove) return undefined;
  return expectedForcedUciAtPly(white, black, nextPly);
}

export function remainingForcedMovesForBot(
  white: string[],
  black: string[],
  fromPly: number,
  botPlaysWhite: boolean
): string[] {
  const out: string[] = [];
  const limit = Math.max(white.length, black.length) * 2 + 4;
  for (let i = fromPly; i < limit; i++) {
    const whiteToMove = i % 2 === 0;
    if (botPlaysWhite !== whiteToMove) continue;
    const mv = expectedForcedUciAtPly(white, black, i);
    if (!mv) break;
    out.push(mv);
  }
  return out;
}

export function prepareConfigForExport(
  config: EngineConfig,
  options?: { openingsDatabase?: { id: string; uciMoves?: string[] }[] }
): EngineConfig {
  const { white, black } = getEffectiveForcedLinesByColor(config);
  let next: EngineConfig = { ...config };
  if (white.length > 0 || black.length > 0) {
    next = { ...next, forcedLineWhite: white, forcedLineBlack: black };
  }
  const fritz = buildFritzBlackOpeningFallback(next, options?.openingsDatabase);
  if (fritz.length > 0) {
    next = { ...next, fritzBlackOpeningFallback: fritz };
  }
  return next;
}

export function getEditableForcedLines(config: EngineConfig): { white: string[]; black: string[] } {
  const white = config.forcedLineWhite ?? [];
  const black = config.forcedLineBlack ?? [];
  if (white.length > 0 || black.length > 0) return { white, black };
  const legacy = config.forcedLine;
  if (Array.isArray(legacy) && legacy.length > 0) return splitUciSequence(legacy);
  return { white, black };
}
