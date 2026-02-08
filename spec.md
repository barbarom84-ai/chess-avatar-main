# Project Specification: Chess Avatar Creator (CAC)

## 1. Vision
Une application web permettant aux joueurs d'échecs de créer un "Clone IA" de leur style de jeu (ou de celui d'un ami) en important des parties depuis Chess.com ou Lichess. Le but ultime est d'exporter ce profil sous forme compatible UCI pour jouer contre lui dans des logiciels tiers (Fritz, Chessbase).

## 2. Core Features (MVP)

### A. Ingest & Analysis (Backend)
- **API Connectors:** Connexion aux API publiques de Lichess et Chess.com (pas d'auth complexe requise pour les parties publiques, juste le username).
- **Game Parsing:** Télécharger les 100 dernières parties (PGN).
- **Style Extraction:** Analyser les parties pour déterminer :
    - Les ouvertures préférées (Répertoire).
    - L'agressivité (Taux d'échange de pièces).
    - Le niveau moyen (ACPL - Average Centipawn Loss).
    - La gestion du temps.

### B. Interface (Frontend)
- **Dashboard:** Design inspiré de Chess.com/Lichess (Dark/Light mode, propre, réactif).
- **Chess Board:** Un échiquier interactif (utiliser `chessboard.tsx` ou `react-chessboard`) pour rejouer les parties.
- **Stats Panel:** Affichage visuel du style (Graphiques radar : Agressivité, Précision, Solidité).
- **Persona Chat:** Un petit module LLM qui imite le style de chat du joueur (optionnel pour le MVP).

### C. Engine & Simulation
- Intégration de Stockfish (via WebAssembly pour le web) pour l'analyse en direct.
- **"Humanizer" Logic:** Algorithme qui ajuste Stockfish pour qu'il ne joue pas le meilleur coup, mais le coup "le plus probable pour ce joueur" (basé sur l'ouverture et le rating).

### D. Export
- Bouton "Télécharger mon moteur".
- Génère un fichier de configuration `.json` ou un script Python packagé qui agit comme un moteur UCI.

## 3. Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn/UI, Lucide Icons.
- **Chess Logic:** `chess.js` (règles), `react-chessboard` (visuel).
- **Backend (API):** Python (FastAPI) est RECOMMANDÉ pour le traitement lourd des PGN et l'analyse Stockfish, mais pour le MVP, nous tenterons d'utiliser les **Next.js API Routes** avec des librairies JS légères si possible.
- **Database:** Supabase (PostgreSQL) pour stocker les profils utilisateurs et les caches de parties.

## 4. Design Guidelines
- **Atmosphère:** Professionnelle, "E-sport", focus.
- **Couleurs:** Vert/Gris (style Chess.com) ou Blanc/Gris/Noir (style Lichess).
- **Typographie:** Inter ou Roboto Mono pour les coups.

## 5. File Structure Rules
- Components dans `@/components`.
- Hooks personnalisés pour le moteur d'échecs dans `@/hooks/use-chess-engine`.
- Types TypeScript stricts pour les objets `Game`, `Player`, `Move`.