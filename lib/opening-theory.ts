/**
 * Helpers pour afficher les lignes théoriques et détecter les transpositions.
 *
 * Stratégie d’élargissement de la base (sans alourdir le bundle initial) :
 * - Garder un noyau « curated » dans le repo (comme OPENINGS_DATABASE).
 * - Ajouter des fichiers JSON partitionnés (ex. eco-B.ts, eco-E.ts) importés
 *   dynamiquement via import() depuis une page dédiée ou un worker au premier usage.
 * - Pré-calculer en build un trie UCI + Map FEN compactée si la base dépasse ~500 lignes.
 * - Option avancée : charger une extension depuis un CDN (gzip) après consentement,
 *   avec cache IndexedDB — jamais bloquer le premier paint.
 * - Ne pas dupliquer Lichess entier : privilégier les lignes jouées par les utilisateurs
 *   (analytics) ou un sous-ensemble ECO par niveau.
 */

import { Chess } from "chess.js";
import {
  OPENINGS_DATABASE,
  type Opening,
  getOpeningById,
} from "./openings-library";

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

let fenIndexCache: Map<string, TheoryPositionHit[]> | null = null;

function buildFenTheoryIndex(): Map<string, TheoryPositionHit[]> {
  const map = new Map<string, TheoryPositionHit[]>();

  for (const opening of OPENINGS_DATABASE) {
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

/** Index position → lignes théoriques (pour transpositions). */
export function getTheoryFenIndex(): Map<string, TheoryPositionHit[]> {
  if (!fenIndexCache) {
    fenIndexCache = buildFenTheoryIndex();
  }
  return fenIndexCache;
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

/**
 * Libellés lisibles pour les autres lignes du répertoire menant à la même position (transposition).
 */
export function describeTheoryHitsForUi(
  fen: string,
  lang: string,
  opts?: {
    /** Ne pas lister cette entrée (ex. ligne déjà affichée par le préfixe). */
    skipOpeningId?: string;
    skipTheoryStep?: number;
  }
): string[] {
  const hits = lookupTheoryAtFen(fen);
  const out: string[] = [];
  const seen = new Set<string>();
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
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${name} · ${lang === "en" ? "move" : "coup"} ${h.theoryStep}`);
  }
  return out;
}
