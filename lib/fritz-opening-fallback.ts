import type { EngineConfig, FritzBlackChoice, FritzBlackOpeningFallbackEntry } from "@/lib/analysis";
import { getOpeningById } from "@/lib/openings-registry";

function normUci(uci: string): string {
  if (!uci || typeof uci !== "string") return "";
  const s = uci.trim().toLowerCase();
  return s.length >= 4 ? s.slice(0, 4) + (s[4] ?? "") : s;
}

export type { FritzBlackChoice, FritzBlackOpeningFallbackEntry };

type DbOpening = { id: string; uciMoves?: string[] };

/**
 * À partir des ouvertures noires du répertoire, construit une table :
 * séquence des coups blancs (UCI) → coups noirs possibles avec poids.
 * Ne dépend pas de la ligne blanche « théorique » du bot (Réti vs 1.e4 humain).
 */
export function buildFritzBlackOpeningFallback(
  config: EngineConfig,
  openingsDb?: DbOpening[]
): FritzBlackOpeningFallbackEntry[] {
  const blackRefs = config.openingRepertoire?.blackOpenings ?? [];
  if (blackRefs.length === 0) return [];

  const dbById = new Map<string, DbOpening>();
  if (openingsDb) {
    for (const o of openingsDb) dbById.set(o.id, o);
  }

  const byKey = new Map<string, Map<string, number>>();

  const sorted = [...blackRefs].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  for (const ref of sorted) {
    const fromDb = dbById.get(ref.id);
    const fromLib = getOpeningById(ref.id);
    const uciRaw = fromDb?.uciMoves ?? fromLib?.uciMoves;
    if (!uciRaw?.length) continue;

    const moves = uciRaw.map((m) => normUci(m)).filter(Boolean);
    const w = Math.max(1, ref.weight ?? 50);

    for (let i = 1; i < moves.length; i += 2) {
      const whitePrefix: string[] = [];
      for (let j = 0; j < i; j += 2) {
        whitePrefix.push(moves[j]);
      }
      const blackMove = moves[i];
      if (!blackMove) continue;

      const key = whitePrefix.join("|");
      if (!byKey.has(key)) byKey.set(key, new Map());
      const inner = byKey.get(key)!;
      inner.set(blackMove, (inner.get(blackMove) ?? 0) + w);
    }
  }

  const out: FritzBlackOpeningFallbackEntry[] = [];
  for (const [key, uciWeights] of byKey) {
    const whiteUci = key.length > 0 ? key.split("|") : [];
    const choices: FritzBlackChoice[] = [];
    for (const [uci, weight] of uciWeights) {
      choices.push({ uci, weight });
    }
    if (choices.length > 0) {
      out.push({ whiteUci, choices });
    }
  }

  out.sort((a, b) => b.whiteUci.length - a.whiteUci.length);
  return out;
}
