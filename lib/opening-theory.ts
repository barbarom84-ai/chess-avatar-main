/**
 * Helpers pour afficher les lignes théoriques et détecter les transpositions.
 */

import { Chess } from "chess.js";
import { type Opening } from "./openings-library";
import { getAggregatedOpenings, getOpeningById } from "./openings-registry";

/** Partie « positionnelle » du FEN (échiquier + trait + roques + case EP). */
export function fenPositionKey(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(" ");
}

export interface TheoryPositionHit {
  openingId: string;
  /** 1-based : après quel coup de la ligne référence cette position est atteinte. */
  theoryStep: number;
}

const FEN_INDEX_URL = "/data/openings/fen-index.generated.json";

let fenIndexCache: Map<string, TheoryPositionHit[]> | null = null;
let fenIndexLoadPromise: Promise<void> | null = null;

function buildFenTheoryIndex(): Map<string, TheoryPositionHit[]> {
  const map = new Map<string, TheoryPositionHit[]>();

  for (const opening of getAggregatedOpenings()) {
    const g = new Chess();
    for (let ply = 0; ply < opening.uciMoves.length; ply++) {
      const uci = opening.uciMoves[ply];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const mv = g.move({ from, to, promotion });
      if (!mv) break;
      const key = fenPositionKey(g.fen());
      const hit: TheoryPositionHit = {
        openingId: opening.id,
        theoryStep: ply + 1,
      };
      const arr = map.get(key) ?? [];
      const dup = arr.some(
        (h) => h.openingId === hit.openingId && h.theoryStep === hit.theoryStep
      );
      if (!dup) arr.push(hit);
      map.set(key, arr);
    }
  }

  return map;
}

function mapFromGeneratedJson(
  raw: Record<string, TheoryPositionHit[]>
): Map<string, TheoryPositionHit[]> {
  return new Map(Object.entries(raw));
}

/**
 * Précharge l’index FEN généré au build (évite de rejouer toutes les lignes UCI au runtime).
 */
export function preloadTheoryFenIndex(): Promise<void> {
  if (fenIndexCache) return Promise.resolve();
  if (fenIndexLoadPromise) return fenIndexLoadPromise;

  fenIndexLoadPromise = (async () => {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(FEN_INDEX_URL, { cache: "force-cache" });
        if (res.ok) {
          const data = (await res.json()) as Record<string, TheoryPositionHit[]>;
          fenIndexCache = mapFromGeneratedJson(data);
          return;
        }
      } catch {
        /* fallback below */
      }
    }
    fenIndexCache = buildFenTheoryIndex();
  })();

  return fenIndexLoadPromise;
}

/** Index position → lignes théoriques (pour transpositions). */
export function getTheoryFenIndex(): Map<string, TheoryPositionHit[]> {
  if (!fenIndexCache) {
    fenIndexCache = buildFenTheoryIndex();
    void preloadTheoryFenIndex();
  }
  return fenIndexCache;
}

export function clearTheoryFenIndexCache(): void {
  fenIndexCache = null;
  fenIndexLoadPromise = null;
}

export function lookupTheoryAtFen(fen: string): TheoryPositionHit[] {
  return getTheoryFenIndex().get(fenPositionKey(fen)) ?? [];
}

/** SAN successifs le long de la ligne UCI en base (pour affichage). */
export function getOpeningTheorySans(opening: Opening): string[] {
  const g = new Chess();
  const sans: string[] = [];
  for (const uci of opening.uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const mv = g.move({ from, to, promotion });
    if (!mv) break;
    sans.push(mv.san);
  }
  return sans;
}

/** Une ouverture du répertoire locale qui atteint la même position (transposition). */
export interface TheoryTranspositionHit {
  openingId: string;
  name: string;
  theoryStep: number;
}

/**
 * Autres lignes du répertoire menant à la même position (transposition).
 * Tri par profondeur décroissante ; un seul libellé par nom (la variation la plus profonde).
 */
export function describeTheoryHitsForUi(
  fen: string,
  lang: string,
  opts?: {
    /** Ne pas lister cette entrée (ex. ligne déjà affichée par le préfixe). */
    skipOpeningId?: string;
    skipTheoryStep?: number;
  }
): TheoryTranspositionHit[] {
  const hits = lookupTheoryAtFen(fen);
  const rows: TheoryTranspositionHit[] = [];
  const seenIdStep = new Set<string>();
  for (const h of hits) {
    if (
      opts?.skipOpeningId &&
      h.openingId === opts.skipOpeningId &&
      opts.skipTheoryStep !== undefined &&
      h.theoryStep === opts.skipTheoryStep
    ) {
      continue;
    }
    const op = getOpeningById(h.openingId);
    if (!op) continue;
    const name = lang === "en" && op.nameEn ? op.nameEn : op.name;
    const key = `${h.openingId}-${h.theoryStep}`;
    if (seenIdStep.has(key)) continue;
    seenIdStep.add(key);
    rows.push({ openingId: h.openingId, name, theoryStep: h.theoryStep });
  }

  rows.sort((a, b) => b.theoryStep - a.theoryStep);

  const byName = new Map<string, TheoryTranspositionHit>();
  for (const row of rows) {
    const prev = byName.get(row.name);
    if (!prev || row.theoryStep > prev.theoryStep) {
      byName.set(row.name, row);
    }
  }

  return Array.from(byName.values()).sort((a, b) => b.theoryStep - a.theoryStep);
}
