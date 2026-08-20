# 🎯 Guide de la Ligne Forcée

## Concept

La **Ligne Forcée** permet de programmer une séquence de coups que le bot jouera **obligatoirement** à ses propres tours de jeu, peu importe ce que joue l'adversaire.

---

## Comment ça fonctionne

### Principe
- Vous définissez une liste de coups UCI (ex: `["e2e4", "g1f3", "f1c4"]`)
- Le bot jouera **uniquement ces coups à ses propres tours**
- L'adversaire peut jouer ce qu'il veut
- Une fois tous les coups forcés joués, le bot continue avec Stockfish

### Exemple Concret

**Ligne forcée :** `["e2e4", "g1f3", "f1c4"]` (bot joue les blancs)

**Partie réelle :**
1. e4 *(coup forcé n°1 du bot)* c5 *(adversaire joue ce qu'il veut)*
2. Nf3 *(coup forcé n°2)* d6 *(adversaire libre)*
3. Bc4 *(coup forcé n°3)* Nf6 *(adversaire libre)*
4. [Stockfish prend le relais]

**Autre exemple (bot joue les noirs) :**

**Ligne forcée :** `["e7e5", "g8f6", "f8c5"]`

**Partie réelle :**
1. e4 *(adversaire)* e5 *(coup forcé n°1 du bot)*
2. Nf3 *(adversaire)* Nf6 *(coup forcé n°2)*
3. Bc4 *(adversaire)* Bc5 *(coup forcé n°3)*
4. [Stockfish prend le relais]

---

## Format UCI

Les coups doivent être au format UCI :
- **Format :** `[case de départ][case d'arrivée][promotion optionnelle]`
- **Exemples :**
  - `e2e4` = pion e2 vers e4
  - `g1f3` = cavalier g1 vers f3
  - `e7e8q` = pion e7 vers e8 avec promotion en dame

---

## Cas d'Usage

### 1. Tester une Ouverture Spécifique
Force le bot à jouer exactement l'ouverture que tu veux étudier :
```json
["d2d4", "c2c4", "b1c3", "e2e4"]
```
→ Bot blancs : Gambit Dame + poussée e4

### 2. Créer un Bot avec une Faiblesse
Force des coups médiocres pour un bot plus faible :
```json
["f2f3", "g2g4"]
```
→ Bot blancs : ouverture très faible

### 3. Pratiquer une Position
Toujours arriver à la même position pour l'entraîner :
```json
["e2e4", "g1f3", "f1c4", "b1c3"]
```

### 4. Forcer un Style Agressif/Passif
```json
["e2e4", "d2d4", "c2c4"]  // Ultra agressif
["e2e3", "d2d3", "b1d2"]  // Ultra passif
```

---

## Différence avec le Répertoire d'Ouvertures

| **Ligne Forcée** | **Répertoire d'Ouvertures** |
|---|---|
| Séquence exacte, toujours la même | Choix aléatoire pondéré |
| Peu importe ce que joue l'adversaire | S'adapte aux coups adverses |
| Priorité absolue | Priorité secondaire |
| Parfait pour tester/pratiquer | Parfait pour la variété |

---

## Configuration dans le JSON

Le profil exporté contient :
```json
{
  "name": "Bot_Test",
  "forcedLine": ["e2e4", "g1f3", "f1c4"],
  "elo": 1800,
  ...
}
```

---

## Logs dans Fritz/Arena

Lors du démarrage, le moteur affichera :
```
info string Forced line: 3 moves configured
info string Forced moves: e2e4 g1f3 f1c4
```

Pendant la partie :
```
info string Bot playing as white
info string Playing forced move 1/3: e2e4
info string Playing forced move 2/3: g1f3
info string Playing forced move 3/3: f1c4
info string Forwarding to Stockfish: go movetime 500
```

---

## Priorités du Moteur

1. **🎯 Ligne Forcée** ← Si définie et pas encore terminée
2. **📚 Répertoire d'Ouvertures** ← Si en phase d'ouverture
3. **🤖 Stockfish** ← Pour tout le reste

---

## Astuces

### Validation Automatique
L'interface web valide automatiquement chaque coup en temps réel. Impossible d'ajouter un coup illégal !

### Formats Acceptés
- **UCI** : `e2e4`, `g1f3`
- **SAN** : `e4`, `Nf3` (converti automatiquement en UCI)

### Longueur Recommandée
- **3-5 coups** : Ouverture légère
- **6-10 coups** : Variante spécifique
- **10+ coups** : Position d'entraînement précise

### Réinitialisation
À chaque `ucinewgame`, le compteur de coups forcés est réinitialisé. Le bot rejouera la séquence.

---

## Exemple Complet

**Objectif :** Créer un bot qui joue toujours l'Espagnole avec les blancs

**Ligne forcée :**
```json
["e2e4", "g1f3", "f1b5"]
```

**Résultat :**
- Si l'adversaire joue 1...e5 2...Nc6 → Espagnole classique ✅
- Si l'adversaire joue 1...c5 → Bot joue quand même Nf3 puis Bb5 (hors théorie, mais c'est forcé)
- Après 3 coups, Stockfish continue normalement

---

## Compatibilité

✅ Fritz 20  
✅ Arena  
✅ ChessBase  
✅ Tous les logiciels UCI

---

**Bon jeu ! 🎯♟️**
