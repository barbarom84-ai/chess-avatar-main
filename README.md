# ♟️ Chess Avatar Creator

> Créez une IA qui joue exactement comme vous. Analysez votre style, configurez votre moteur personnalisé, et jouez contre votre clone !

![Version](https://img.shields.io/badge/version-3.0-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Développement
npm run dev

# Production
npm run build
npm start
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour commencer !

## ✨ Fonctionnalités Principales

### 🔍 Analyse Automatique
- **Lichess & Chess.com** supportés
- Analyse de **100 parties récentes**
- Extraction du **style de jeu** (agressif, solide, tactique...)
- Calcul automatique du **niveau** (1-5) et de l'**ELO estimé**
- Détection des **ouvertures favorites**

### 📊 Visualisation Avancée
- **Graphique Radar** : Style de jeu sur 5 dimensions
- **Pie Chart** : Distribution W/D/L
- **Bar Charts** : Répertoire d'ouvertures et phases de jeu
- Interface à **onglets interactifs**
- **Recharts** pour des graphiques professionnels

### ⚙️ Configuration Personnalisée
- **Mode Auto** : Paramètres calculés selon le niveau
- **Mode Manuel** : Contrôle total avec sliders
- Ajustement de :
  - Niveau de difficulté (1-5)
  - Agressivité (0-100%)
  - Threads CPU (1-8)
  - Profondeur (5-25)
  - Temps de réflexion (100-5000ms)
- **Sauvegarde automatique** locale

### 🎮 Jeu Interactif
- **Échiquier Drag & Drop** intuitif
- **Moteur Stockfish.js** intégré (WebAssembly)
- **Jouer contre votre clone IA**
- Évaluation en temps réel
- Historique des coups
- Détection automatique de fin de partie

### 💾 Export & Persistence
- Export **JSON** du profil moteur
- Compatible **Fritz, ChessBase, Arena**
- Sauvegarde **localStorage** automatique
- Import/Export de configurations

### ☁️ Sauvegarde Cloud (Nouveau !)
- **Authentification** email/password
- **Sauvegarde Supabase** PostgreSQL
- **Sync multi-appareils** automatique
- **Bibliothèque publique** de profils
- **Row Level Security** (RLS)

## 📖 Documentation Complète

- 📘 [**STOCKFISH_INTEGRATION.md**](./STOCKFISH_INTEGRATION.md) - Intégration du moteur de jeu
- ⚙️ [**CONFIGURATION_PERSONNALISEE.md**](./CONFIGURATION_PERSONNALISEE.md) - Personnalisation des paramètres
- 📊 [**GRAPHIQUES_PERFORMANCE.md**](./GRAPHIQUES_PERFORMANCE.md) - Visualisation des données
- ☁️ [**SUPABASE_CLOUD.md**](./SUPABASE_CLOUD.md) - Sauvegarde cloud et authentification
- 🛠️ [**SUPABASE_SETUP.md**](./SUPABASE_SETUP.md) - Configuration technique Supabase
- 🆕 [**NOUVELLES_FONCTIONNALITES.md**](./NOUVELLES_FONCTIONNALITES.md) - Historique des versions
- 📋 [**spec.md**](./spec.md) - Spécifications techniques

## 🎯 Guide d'Utilisation

### 1️⃣ Analyser un Profil
```
1. Choisir Lichess ou Chess.com
2. Entrer votre pseudo
3. Cliquer sur "Analyser"
```

### 2️⃣ Voir les Résultats
```
✓ Carte d'identité du moteur
✓ Graphiques de performance
✓ Répertoire d'ouvertures
✓ Style de jeu détaillé
```

### 3️⃣ Configurer (Optionnel)
```
1. Cliquer sur "Configurer"
2. Choisir Auto ou Manuel
3. Ajuster les paramètres
4. Appliquer
```

### 4️⃣ Jouer Contre
```
1. Cliquer sur "Jouer Contre"
2. Choisir votre couleur
3. Jouer en drag & drop
4. Profiter !
```

## 🏗️ Architecture

```
chess-avatar/
├── app/
│   ├── page.tsx              # Page principale (analyse)
│   ├── play/page.tsx         # Page de jeu interactive
│   └── api/
│       ├── lichess/route.ts  # API Lichess
│       └── chesscom/route.ts # API Chess.com
├── components/
│   ├── PersonaCard.tsx       # Carte profil moteur
│   ├── PerformanceCharts.tsx # Graphiques Recharts
│   ├── GameViewer.tsx        # Replay de parties
│   ├── PlayableChessboard.tsx# Échiquier interactif
│   ├── SimpleChessboard.tsx  # Échiquier basique
│   ├── EngineConfigPanel.tsx # Configuration avancée
│   └── ui/                   # Composants Shadcn/UI
├── hooks/
│   └── useStockfish.ts       # Hook moteur Stockfish
├── lib/
│   ├── analysis.ts           # Logique d'analyse
│   ├── storage.ts            # Persistence locale
│   └── utils.ts              # Utilitaires
└── types/
    └── chess.ts              # Types TypeScript
```

## 🔧 Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 16.0.10 | Framework React SSR |
| **React** | 18.3.1 | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 4.x | Styling |
| **Shadcn/UI** | Latest | Components |
| **Chess.js** | 1.4.0 | Chess Logic |
| **Stockfish.js** | 10.0.2 | Chess Engine |
| **Recharts** | 3.5.1 | Data Visualization |
| **Radix UI** | Latest | Primitives |
| **Supabase** | Latest | Cloud Database & Auth |

## 🎨 Features Visuelles

### Thème
- **Mode Dark** optimisé
- Palette **Slate/Green** (Chess.com inspired)
- Typographie **Geist** moderne
- Animations fluides

### Composants
- **Cards** avec bordures et ombres
- **Badges** colorés par contexte
- **Sliders** interactifs
- **Graphiques** responsive
- **Modals** élégantes

## 📊 Métriques Analysées

### Style de Jeu
- ⚔️ **Agressivité** : Basée sur durée des parties
- 🎯 **Précision** : Basée sur winrate
- 🛡️ **Défense** : Basée sur drawrate
- ⚡ **Tactique** : Selon le style détecté
- 🎲 **Positionnel** : Selon le style détecté

### Performance
- 🏆 **Win Rate** : % de victoires
- ⚖️ **Draw Rate** : % de nulles
- ❌ **Loss Rate** : % de défaites
- 📖 **Répertoire** : Top 3-5 ouvertures
- 🎭 **Style** : Classification automatique

### Configuration Moteur
- 🎚️ **Niveau** : 1 (Débutant) à 5 (GM)
- 💪 **ELO** : 1200-2200 estimé
- 🖥️ **Threads** : 1-8 CPU
- 📏 **Depth** : 5-25 plies
- ⏱️ **Time** : 100-5000ms par coup

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
vercel deploy
```

### Docker
```bash
docker build -t chess-avatar .
docker run -p 3000:3000 chess-avatar
```

### Build Statique
```bash
npm run build
npm run export
```

## 🔮 Roadmap

### Version 4.0 (Actuelle) ☁️
- [x] Sauvegarde cloud (Supabase)
- [x] Authentification utilisateur
- [x] Bibliothèque de profils publics
- [x] Profils privés/publics
- [x] Recherche dans la bibliothèque

### Version 4.1 (Prochainement)
- [ ] Mode hors ligne avec sync
- [ ] Comparaison de moteurs
- [ ] Collections de profils

### Version 4.0 (Prévu)
- [ ] Analyse post-partie détaillée
- [ ] Mode Training avec hints
- [ ] Heat maps de l'échiquier
- [ ] Timeline de progression
- [ ] Export UCI standalone

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer :

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

## 📝 Licence

Ce projet est sous licence **MIT**. Voir [LICENSE](./LICENSE) pour plus de détails.

## 🙏 Remerciements

- **Lichess** & **Chess.com** pour leurs APIs publiques
- **Stockfish** pour le moteur d'échecs
- **Recharts** pour les graphiques
- **Shadcn** pour les composants UI
- **Vercel** pour le hosting

## 📧 Contact & Support

- 🐛 **Issues** : [GitHub Issues](https://github.com/yourusername/chess-avatar/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/yourusername/chess-avatar/discussions)
- 📧 **Email** : support@chess-avatar.com

## 📊 Stats du Projet

- **Composants** : 20+
- **Hooks personnalisés** : 3
- **Routes API** : 2
- **Pages** : 4
- **Lignes de code** : ~7000+
- **Base de données** : Supabase PostgreSQL
- **Tests** : À venir

---

**Développé avec ❤️ par la communauté Chess Avatar Creator**

*Version 4.0 - Décembre 2024*
