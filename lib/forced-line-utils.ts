import { getOpeningById } from "@/lib/openings-library";
import type { EngineConfig } from "@/lib/analysis";

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

  if (firstWhite) {
    const op = getOpeningById(firstWhite);
    if (op?.uciMoves?.length) {
      const { white: w, black: b } = splitUciSequence(op.uciMoves);
      white.push(...w);
      if (!firstBlack) black.push(...b);
    }
  }
  if (firstBlack) {
    const op = getOpeningById(firstBlack);
    if (op?.uciMoves?.length) {
      const { white: w, black: b } = splitUciSequence(op.uciMoves);
      black.push(...b);
      if (!firstWhite) white.push(...w);
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

export function getEffectiveForcedLine(config: EngineConfig): string[] {
  const rep = config.openingRepertoire;
  const hasRepertoire =
    (rep?.whiteOpenings?.length ?? 0) > 0 || (rep?.blackOpenings?.length ?? 0) > 0;
  const src = config.forcedLineSource ?? "custom";
  let white = config.forcedLineWhite ?? [];
  let black = config.forcedLineBlack ?? [];

  if (rep && (src === "openings" || (hasRepertoire && white.length === 0 && black.length === 0))) {
    const derived = deriveForcedLinesFromOpenings(
      rep.whiteOpenings ?? [],
      rep.blackOpenings ?? []
    );
    white = derived.white;
    black = derived.black;
  }

  let seq = interleaveForcedLines(white, black);
  if (seq.length > 0) return seq;

  const legacy = config.forcedLine;
  if (Array.isArray(legacy) && legacy.length > 0) return legacy.map(normalizeUci);

  const fo = (config as ConfigWithLegacy).forcedOpenings;
  if (fo) {
    const whiteId = Array.isArray(fo.white) ? fo.white[0] : fo.white;
    const blackId = Array.isArray(fo.black) ? fo.black[0] : fo.black;
    if (whiteId || blackId) {
      const derived = deriveForcedLinesFromOpenings(
        whiteId ? [{ id: whiteId, weight: 100 }] : [],
        blackId ? [{ id: blackId, weight: 100 }] : []
      );
      seq = interleaveForcedLines(derived.white, derived.black);
      if (seq.length > 0) return seq;
    }
  }

  return [];
}

export function prepareConfigForExport(config: EngineConfig): EngineConfig {
  const forcedLine = getEffectiveForcedLine(config);
  if (forcedLine.length === 0) return config;
  const { white, black } = splitUciSequence(forcedLine);
  return { ...config, forcedLineWhite: white, forcedLineBlack: black };
}

export function getEditableForcedLines(config: EngineConfig): { white: string[]; black: string[] } {
  let white = config.forcedLineWhite ?? [];
  let black = config.forcedLineBlack ?? [];
  if (white.length > 0 || black.length > 0) return { white, black };
  const legacy = config.forcedLine;
  if (Array.isArray(legacy) && legacy.length > 0) return splitUciSequence(legacy);
  return { white, black };
}
