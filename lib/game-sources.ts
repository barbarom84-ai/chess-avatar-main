/**
 * Séparation des sources de parties (plan « corpus » vs utilisateur).
 *
 * - **Parties utilisateur / sauvegardées** : table Postgres `games` (voir DbGame dans
 *   [`supabase-storage`](./supabase-storage.ts)) — PGN complet, métadonnées avatar.
 * - **Références externes** : parties identifiées sur Lichess/Chess.com sans dupliquer
 *   tout le PGN en base ; charger à la volée via API ou URL profonde.
 * - **Corpus analytique bulk** (historique massif) : hors runtime Next.js — exports
 *   mensuels, entrepôt objet, pipeline séparé ; ne pas mélanger avec les lignes DbGame.
 */

import type { DbGame } from "./supabase-storage";

/** Champs optionnels pour marquer une partie comme lien externe plutôt que seule archive locale. */
export type DbGameExternalRef = Pick<
  DbGame,
  "id" | "user_id" | "pgn" | "created_at"
> & {
  /** Plateforme source si la partie est surtout une référence (UI / import URL). */
  source_platform?: "lichess" | "chesscom" | "saved";
  /** Identifiant stable côté plateforme (ex. partie Lichess). */
  external_game_id?: string;
  /** Lien profond pour ouvrir la partie sur le site d’origine. */
  external_game_url?: string;
};

/** Distinction utile pour futures migrations ou index full-text (PGN utilisateur uniquement). */
export function isUserArchivedGame(row: DbGame): boolean {
  return Boolean(row.pgn && row.user_id);
}
