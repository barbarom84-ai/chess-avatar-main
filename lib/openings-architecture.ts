/**
 * Architecture des données d’ouvertures (plan multi-couches).
 *
 * - **Couche A — noyau** : [`OPENINGS_DATABASE`](./openings-library.ts) versionné, pour personas / leçons / UX.
 * - **Couche B — partitions** : JSON dans `lib/data/openings/partitions/` agrégés par
 *   [`getAggregatedOpenings`](./openings-registry.ts) (imports statiques ; chunks séparés possible par fichier).
 * - **Couche C — stats terrain** : API [`/api/openings/explorer`](../app/api/openings/explorer/route.ts)
 *   (proxy + cache vers explorer.lichess.ovh), sans dupliquer la base mondiale.
 *   Les gros exports PGN locaux (ex. `data/database2025/`) ne remplacent pas cette couche : voir README du dossier.
 */

export const OPENING_DATA_LAYERS = {
  core: "openings-library OPENINGS_DATABASE",
  partitions: "lib/data/openings/partitions/*.json via openings-registry",
  liveExplorer: "/api/openings/explorer (Lichess masters/lichess pools)",
} as const;
