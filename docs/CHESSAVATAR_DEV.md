# ChessAvatar WASM — développement et déploiement

Ce document décrit comment construire le moteur Rust/WASM, le synchroniser dans l’app Next.js, et ce que vérifie la CI.

## Architecture

```
UCI Chess Engine/          ← moteur Rust (source)
  crates/chessavatar-wasm/
  packages/engine-bridge/    ← worker UCI → WASM

chess-avatar-main/
  public/chessavatar/        ← bundle versionné (~21 Mo avec NNUE)
  lib/chessavatar-client.ts  ← client Web Worker côté app
  scripts/sync-chessavatar-wasm.mjs
  scripts/verify-chessavatar-wasm.mjs
```

- **Coups du bot** : ChessAvatar WASM (ou Stockfish selon préférence / Auto).
- **Analyse / review** : Stockfish uniquement.

## Build moteur (Windows)

Depuis `UCI Chess Engine` :

```powershell
.\scripts\build-wasm.ps1
cd packages\engine-bridge
npm install
npm run build
```

Prérequis : Rust, `wasm-pack`, Node.js.

## Sync vers l’app

Depuis `chess-avatar-main` :

```bash
npm run sync:chessavatar
```

Copie `chessavatar_wasm.js`, `chessavatar_wasm_bg.wasm`, `worker.js`, `nn-default.nnue` et génère `public/chessavatar/manifest.json` (SHA-256 pour la CI).

Variable optionnelle :

```bash
ENGINE_ROOT="/chemin/vers/UCI Chess Engine" npm run sync:chessavatar
```

## Vérification locale / CI

```bash
npm run verify:chessavatar
```

Contrôle la présence des artefacts, tailles minimales et hashes du manifest.

La CI (`.github/workflows/ci.yml`) exécute `verify:chessavatar` après les tests unitaires.

## Fonctionnalités récentes

| Fonctionnalité | Où |
|----------------|-----|
| MultiPV + persona bot | `worker.ts` → `set_multipv`, `lib.rs` → info UCI complètes ; `chessAvatarGetBestMove` + `pickPersonaBiasedMove` |
| Persona GameReviewer | `getPersonaStyleMove` → ChessAvatar avec MultiPV |
| Préférence moteur compte | `user_accounts.preferences`, `BotEnginePreferenceSync` |
| Télémétrie | `lib/chessavatar-telemetry.ts` → PostHog + Sentry |
| Version moteur UI | badge UCI `id name` dans `BotEngineSelector` |
| Cache NNUE IndexedDB | `lib/nnue-idb-cache.ts`, chargement via `postMessage` transferable |
| SIMD128 wasm | build `--enable-simd`, détection `lib/wasm-simd.ts` |
| Movegen sans alloc | `BoardState::for_each_legal_move` + root MultiPV `MoveList` |

## Validation avant deploy

```bash
npm run verify:chessavatar
npm run smoke:chessavatar
npm test
npm run build
```

## CSP production

`next.config.ts` : `worker-src 'self' blob:` ; le NNUE est chargé par **transfert de buffer** (pas de `fetch(blob:…)`).

## Débogage

En dev ou avec `window.__CHESS_DEBUG = true` : logs `[ChessAvatar]` et stats de recherche étendues.

## Commit des binaires

Après `sync:chessavatar`, committer `public/chessavatar/` **y compris** `manifest.json` pour que la CI passe sans accès au repo moteur.

## Fritz / pack moteur UCI (hybride)

Le site distribue un ZIP via `/api/engine-pack` :

| Fichier | Rôle |
|---------|------|
| `AvatarEngine.exe` | Wrapper UCI (ouvertures, persona, MultiPV) |
| `stockfish.exe` | Téléchargé par `install_engine.bat` — **recherche milieu de partie** |
| `ChessAvatar.exe` | *(dev local uniquement)* — non inclus dans le ZIP exporté |
| `nn-default.nnue` | *(dev local)* — activer avec `UseChessAvatar=true` dans `engine.ini` |

### Build pack complet (mainteneurs)

```powershell
# 1. Moteur natif Windows
cd "../UCI Chess Engine"
.\scripts\build-release.ps1

# 2. Copier exe + NNUE + recompiler le wrapper Python
cd "../chess-avatar-main"
npm run build:engine-pack
```

`build:engine-pack` = `sync:chessavatar-native` + PyInstaller `AvatarEngine.py` → `public/AvatarEngine.exe`.

### Comportement AvatarEngine

1. Ouvertures / lignes forcées / fallback Fritz noir  
2. **Stockfish** par défaut (`UseChessAvatar=false` dans `engine.ini`)  
3. **ChessAvatar.exe** seulement si `UseChessAvatar=true` et binaires présents (tests locaux)

Persona et blunders humains : MultiPV (aligné sur le site).

### Web vs Fritz

| | Web | Fritz |
|---|-----|-------|
| Moteur search | WASM | `ChessAvatar.exe` natif |
| Stockfish | Analyse + bots forts + fallback | Fallback recherche seulement |
| Persona | App + MultiPV | Wrapper Python + MultiPV |
