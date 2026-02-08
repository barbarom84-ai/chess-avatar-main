# 🎯 Guide du Répertoire d'Ouvertures

## Comment ça fonctionne

Votre bot peut maintenant jouer des ouvertures spécifiques plutôt que de toujours choisir le "meilleur coup" de Stockfish !

---

## 📚 Fonctionnement

### Phase 1 : Ouverture (Coups 1-15)
- Le bot **choisit** parmi ses ouvertures préférées
- Sélection **pondérée** selon les poids définis
- Ajoute de la **variété** au jeu

### Phase 2 : Milieu/Fin de Partie (Coups 15+)
- Stockfish **prend le relais**
- Calcul du meilleur coup
- Force maximale

---

## 🎮 Configuration dans l'Interface

### 1. Générer votre profil
- Page d'accueil → Entrez votre nom Lichess/Chess.com
- Cliquez sur "Analyser"

### 2. Choisir les Ouvertures
- Onglet **"Ouvertures"** dans le panneau de configuration
- **Option A** : Appliquer un preset (Assassin, Forteresse, etc.)
- **Option B** : Personnaliser manuellement
  - Rechercher des ouvertures
  - Ajuster les poids (0-100)
  - Plus de poids = Plus de chances d'être jouée

### 3. Télécharger le JSON
- Bouton **"JSON"**
- Le fichier contient :
  - ✅ Votre configuration
  - ✅ Répertoire d'ouvertures choisi
  - ✅ **Base de données complète** des ouvertures

---

## 📊 Exemple de Répertoire

```json
{
  "name": "FondueMan",
  "openingRepertoire": {
    "whiteOpenings": [
      {
        "id": "italian-game",
        "weight": 60
      },
      {
        "id": "spanish-opening",
        "weight": 40
      }
    ],
    "blackOpenings": [
      {
        "id": "sicilian-defense",
        "weight": 80
      },
      {
        "id": "french-defense",
        "weight": 20
      }
    ]
  },
  "openingsDatabase": [
    {
      "id": "italian-game",
      "name": "Partie Italienne",
      "uciMoves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
      ...
    }
  ]
}
```

### Résultat en Jeu

**Avec les Blancs** :
- 60% du temps → Joue `1. e4 e5 2. Nf3 Nc6 3. Bc4` (Italienne)
- 40% du temps → Joue `1. e4 e5 2. Nf3 Nc6 3. Bb5` (Espagnole)

**Avec les Noirs** (si adversaire joue `1. e4`) :
- 80% du temps → Répond `1... c5` (Sicilienne)
- 20% du temps → Répond `1... e6` (Française)

---

## 🎲 Sélection Pondérée

### Comment les Poids Fonctionnent

```
Ouverture A : weight = 60
Ouverture B : weight = 30
Ouverture C : weight = 10
Total : 100

Probabilités :
- A : 60% de chances
- B : 30% de chances
- C : 10% de chances
```

### Stratégies

**Monotone** (Pas de Variété) :
```json
{
  "id": "spanish-opening",
  "weight": 100
}
// → Joue TOUJOURS l'Espagnole
```

**Équilibré** (Variété) :
```json
[
  { "id": "italian-game", "weight": 33 },
  { "id": "spanish-opening", "weight": 33 },
  { "id": "scotch-game", "weight": 34 }
]
// → Variété à parts égales
```

**Principal + Surprises** :
```json
[
  { "id": "queens-gambit", "weight": 70 },
  { "id": "london-system", "weight": 20 },
  { "id": "english-opening", "weight": 10 }
]
// → Surtout Gambit Dame, parfois Londres, rarement Anglaise
```

---

## 🎯 Presets Disponibles

### 1. Assassin 🗡️
- **Style** : Agressif
- **Ouvertures** : Gambits (Roi, Evans)
- **But** : Attaque dès le début

### 2. Forteresse 🛡️
- **Style** : Défensif
- **Ouvertures** : Londres, Caro-Kann
- **But** : Solidité et patience

### 3. Hypermoderne 🎭
- **Style** : Hypermoderne
- **Ouvertures** : Réti, Alekhine
- **But** : Contrôle à distance

### 4. Old School 📚
- **Style** : Classique
- **Ouvertures** : Espagnole, Italienne
- **But** : Théorie éprouvée

### 5. Équilibré ⚖️
- **Style** : Mixte
- **Ouvertures** : Mix de tout
- **But** : Adaptabilité

### 6. Grand Maître 👑
- **Style** : Répertoire pro
- **Ouvertures** : Catalane, Nimzo-Indienne
- **But** : Jouer comme Carlsen

---

## 🔍 Détection Automatique

Le moteur détecte **intelligemment** quelle ouverture jouer :

### Exemple de Partie

```
Position initiale (startpos)
→ Bot aux Blancs
→ Vérifie ses ouvertures Blanches
→ Trouve: Italian-game (60%), Spanish-opening (40%)
→ Tire au sort selon les poids
→ Résultat: Italian-game
→ Joue: e2e4

Adversaire joue: e7e5
→ Bot continue: g1f3

Adversaire joue: b8c6
→ Bot continue: f1c4 (fin de l'ouverture Italienne)

Coup 4+
→ Stockfish prend le relais
```

---

## 🧪 Test Local

### Vérifier le Répertoire

```bash
cd MonAvatar
AvatarEngine.exe

# Output attendu :
info string White openings: 2 loaded
info string Black openings: 2 loaded

# Commandes de test :
uci
ucinewgame
position startpos
go depth 1

# Résultat :
info string Opening: Partie Italienne -> e2e4
bestmove e2e4
```

---

## 📋 Checklist d'Installation

- [ ] Générer profil sur le site
- [ ] Configurer les ouvertures (onglet "Ouvertures")
- [ ] Télécharger le JSON (contient openingsDatabase)
- [ ] Placer dans dossier MonAvatar
- [ ] Exécuter `install_engine.bat`
- [ ] Vérifier dans Fritz 20 : `info string White openings loaded`
- [ ] Jouer une partie et observer les premiers coups

---

## 🎁 Avantages

### ✅ Variété
- Votre bot ne joue **jamais** exactement la même ouverture
- Surprises pour l'adversaire
- Jeu plus intéressant

### ✅ Personnalité
- Reflète **votre style**
- Ouvertures que **vous préférez**
- Bot unique et personnel

### ✅ Réalisme
- Comme un **humain** avec un répertoire
- Pas de "super ordinateur" dès le coup 1
- Transition naturelle vers Stockfish

### ✅ Contrôle
- **Vous** décidez quelles ouvertures
- Ajustez les **poids** pour influencer
- Désactivez si vous voulez Stockfish pur

---

## 🔧 Dépannage

### ❌ "White openings: 0 loaded"

**Cause** : `openingsDatabase` manquant dans profile.json

**Solution** :
1. Régénérer le profil sur le site
2. Re-télécharger le JSON
3. Vérifier que le JSON contient `"openingsDatabase": [...]`

---

### ❌ Bot ne joue pas les ouvertures

**Cause** : Poids = 0 ou ouverture incompatible

**Solution** :
1. Vérifier les poids dans le JSON (doivent être > 0)
2. Vérifier que l'ouverture correspond à la position
3. Tester en local avec `position startpos` puis `go`

---

### ❌ Même ouverture à chaque fois

**Cause** : Un seul choix avec weight = 100

**Solution** :
- Ajouter d'autres ouvertures avec des poids
- Équilibrer les poids pour plus de variété

---

## 🎨 Créer un Répertoire Unique

### Style Agressif Personnel

```json
{
  "whiteOpenings": [
    { "id": "kings-gambit", "weight": 50 },
    { "id": "evans-gambit", "weight": 30 },
    { "id": "vienna-game", "weight": 20 }
  ],
  "blackOpenings": [
    { "id": "sicilian-defense", "weight": 70 },
    { "id": "alekhine-defense", "weight": 30 }
  ]
}
```

### Style Positionnel Personnel

```json
{
  "whiteOpenings": [
    { "id": "queens-gambit", "weight": 60 },
    { "id": "catalan-opening", "weight": 40 }
  ],
  "blackOpenings": [
    { "id": "nimzo-indian-defense", "weight": 50 },
    { "id": "grunfeld-defense", "weight": 50 }
  ]
}
```

---

## 📈 Évolution Future

Fonctionnalités possibles :
- 📊 **Statistiques** : Ouvertures les plus jouées/gagnées
- 🎯 **Adaptation** : Ajuster les poids selon les résultats
- 🌐 **Import** : Importer un répertoire depuis Lichess
- 🔄 **Apprentissage** : Le bot apprend de ses parties

---

**Votre bot a maintenant une personnalité d'ouverture unique ! 🎭♟️**
