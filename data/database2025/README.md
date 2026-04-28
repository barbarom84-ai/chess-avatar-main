# Base `Database2025` (export ChessBase)

## Fichiers

- **`Database2025.pgn`** — export PGN des parties (fichier volumineux, **non versionné** ; placez-le localement après clonage).
- **`Database2025.pgi`** — index ChessBase (binaire, **non versionné**).

L’app **ne charge pas** ce PGN au runtime (taille ~1 Go+). Il sert de référence locale pour archivage, outils, ou futurs scripts d’import.

**Déploiement Vercel** : la taille max d’upload est ~100 Mo. Ne committez pas ce `.pgn` ; s’il était déjà versionné, retirez-le du dépôt avec  
`git rm --cached data/database2025/Database2025.pgn` (idem `.pgi`). Voir aussi `.vercelignore` à la racine.

## Statistiques d’ouvertures dans l’app

Les stats « terrain » (coups suivants, W/D/B) viennent de l’**Opening Explorer Lichess** via le proxy [`/api/openings/explorer`](../../app/api/openings/explorer/route.ts) (`explorer.lichess.ovh`), avec choix **Masters** ou **base Lichess complète** dans l’interface d’analyse — pas besoin de dupliquer cette base dans Supabase pour les ouvertures.

## Script utilitaire

Depuis la racine du dépôt :

```bash
npm run pgn:count-games
```

Compte les parties (tags `[Event`) dans le fichier pointé par `DATABASE2025_PGN_PATH` ou par défaut `data/database2025/Database2025.pgn`, en lecture flux (sans charger tout le fichier en mémoire).

### Découper en fichiers sous 100 Mo (Vercel / archivage)

Chaque partie reste entière : découpage aux lignes `[Event` (début de partie habituel). Par défaut ~**95 Mo** par fichier (réglable).

```bash
npm run pgn:split-chunks
```

Sortie par défaut : `data/database2025/parts/Database2025-part-001.pgn`, `002`, …  
Variables optionnelles : `DATABASE2025_PGN_PATH`, `PGN_CHUNK_OUT_DIR`, `PGN_CHUNK_MAX_MB` (nombre entier ou décimal, ex. `95`).

Si une **partie unique** dépasse la limite (rare), un fichier `Database2025-oversized-game-at-offset-*.pgn` est créé et un avertissement s’affiche.
