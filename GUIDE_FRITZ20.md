# 🎮 Guide d'Installation Fritz 20 - Complet

## 📋 Vue d'ensemble

Ce guide complet permet d'installer et configurer votre moteur d'échecs personnalisé dans Fritz 20.

## 📦 Nouveaux Fichiers Créés

### 1. **Scripts d'Installation**

#### `install_fritz20.bat` ⚙️
Script d'installation automatique qui :
- ✅ Vérifie la présence de tous les fichiers nécessaires
- ✅ Crée automatiquement le dossier d'installation
- ✅ Copie les fichiers au bon endroit
- ✅ Génère le fichier de configuration
- ✅ Affiche les instructions pour Fritz 20

**Utilisation** :
```cmd
1. Placez tous les fichiers dans le même dossier
2. Double-cliquez sur install_engine.bat (aucun droit administrateur requis)
3. Suivez les instructions
```

#### `configure_level.bat` 🎯
Script de configuration du niveau qui permet de :
- ✅ Choisir parmi 5 niveaux de difficulté
- ✅ Ajuster automatiquement les paramètres UCI
- ✅ Modifier threads, profondeur, temps de réflexion
- ✅ Adapter l'agressivité du moteur

**Niveaux disponibles** :
- **Niveau 1** : Débutant (ELO ~1200)
  - 1 thread, profondeur 8, 1000ms
- **Niveau 2** : Intermédiaire (ELO ~1500)
  - 1 thread, profondeur 11, 800ms
- **Niveau 3** : Avancé (ELO ~1800)
  - 2 threads, profondeur 14, 600ms
- **Niveau 4** : Expert (ELO ~2100)
  - 4 threads, profondeur 17, 400ms
- **Niveau 5** : Grand Maître (ELO ~2400+)
  - 4 threads, profondeur 20, 200ms

### 2. **Documentation**

#### `README_FRITZ20.txt` 📄
Documentation complète incluant :
- ✅ Guide d'installation pas-à-pas
- ✅ Configuration des paramètres UCI
- ✅ Explication des styles de jeu
- ✅ Section dépannage complète
- ✅ Conseils pro pour optimiser le moteur

## 🎯 Fonctionnalités du Guide Web

### Page Guide Améliorée (`/guide`)

Le guide en ligne contient maintenant **6 sections** :

#### **Étape 1** : Préparez le dossier
- Liste des fichiers nécessaires
- Avertissements importants

#### **Étape 2** : Configuration pour Fritz 20
- Script d'installation automatique complet
- Code CMD prêt à copier
- Instructions détaillées

#### **Étape 3** : Configuration Manuelle
- Instructions pas-à-pas pour Fritz 20
- Configuration des paramètres UCI
- Correspondance avec profile.json

#### **Étape 4** : Ajuster le Niveau
- Script de configuration de difficulté
- 5 niveaux prédéfinis
- Paramètres détaillés pour chaque niveau

#### **Étape 5** : Jouer votre Première Partie
- Instructions pour démarrer
- Conseils sur les styles de jeu
- Tips pour bien jouer

#### **Étape 6** : Dépannage
- Solutions aux problèmes courants
- Messages d'erreur expliqués
- Vérifications de base

## 📥 Téléchargements Disponibles

Trois fichiers téléchargeables depuis le guide :

1. **install_fritz20.bat** (Bouton vert)
2. **configure_level.bat** (Bouton bleu)
3. **README_FRITZ20.txt** (Bouton bleu clair)

## 🎨 Interface Utilisateur

### Boutons de Téléchargement
- En haut de page : 3 boutons pour accès rapide
- Dans chaque section concernée
- Design cohérent avec le site

### Code Blocks
- Fond noir avec texte vert (style terminal)
- Police monospace pour la lisibilité
- Scrollbar horizontale si nécessaire

### Cartes d'Information
- **Vert** : Conseils pro
- **Bleu** : Configuration technique
- **Jaune** : Avertissements
- **Rouge** : Erreurs et dépannage

## 🔧 Paramètres UCI Supportés

Le système gère automatiquement :

| Paramètre | Range | Description |
|-----------|-------|-------------|
| **Threads** | 1-8 | Cœurs CPU utilisés |
| **Hash** | 16-2048 MB | Mémoire de calcul |
| **Depth** | 8-20 | Profondeur de recherche |
| **Move Time** | 100-5000ms | Temps par coup |
| **Contempt** | -100 à 100 | Aversion pour les nulles |
| **Aggressiveness** | 0-100 | Style de jeu |

## 🎮 Styles de Jeu

Le moteur adapte automatiquement son style selon le `profile.json` :

- **🗡️ Agressif** : Attaques rapides, sacrifices
- **🛡️ Solide** : Jeu positionnel, défense
- **⚖️ Équilibré** : Mixte, adaptatif
- **🎯 Positionnel** : Contrôle du centre
- **⚡ Tactique** : Combinaisons, pièges

## 📁 Structure des Fichiers

Après installation, l'arborescence :

```
C:\Users\[User]\Documents\ChessBase\Engines\MonAvatar\
├── AvatarEngine.exe       (Moteur principal)
├── stockfish.exe          (Moteur de base)
├── profile.json           (Configuration générée)
└── engine.ini             (Paramètres UCI)
```

## 🚀 Installation Rapide

```cmd
# Méthode 1 : Pack ZIP automatique (Recommandé - aucun Python requis)
1. Sur la page d'accueil, analyser son profil Lichess/Chess.com
2. Sur la carte avatar, cliquer sur "Pack moteur" (bouton vert)
3. Décompresser le ZIP téléchargé n'importe où
4. CLIC DROIT sur install_engine.bat > "Exécuter en tant qu'administrateur"
   (le script s'auto-élève via UAC si vous double-cliquez à la place)
   → Stockfish est auto-téléchargé si manquant
   → Tout est copié dans Documents\ChessBase\Engines\<Nom>_Avatar\
5. Ouvrir Fritz 20 et ajouter le moteur via Module > Module UCI

# Méthode 2 : Hot-swap d'avatar (changer de profil sans réinstaller)
1. Télécharger juste un nouveau profil JSON (bouton "JSON seul")
2. Aller dans Documents\ChessBase\Engines\<Nom>_Avatar\
3. Double-cliquer sur swap_profile.bat (la fenêtre s'ouvre en administrateur)
4. Choisir 1 ou 2 :
   - 1 : coller le chemin complet (Explorateur : Shift + clic droit sur le fichier,
        "Copier comme chemin d'acces", puis Ctrl+V dans la fenetre)
   - 2 : parcourir avec la boite de dialogue (recommande en admin : le glisser-deposer
        vers une console administrateur est souvent bloque par Windows)
5. Relancer Fritz : le moteur joue avec le nouveau profil

# Méthode 3 : Manuelle (utilisateurs avancés)
1. Créer le dossier Documents\ChessBase\Engines\MonAvatar
2. Copier AvatarEngine.exe, stockfish.exe, profile.json dedans
3. Ouvrir Fritz 20
4. Menu Moteur > Créer un moteur UCI
5. Sélectionner AvatarEngine.exe
```

## 🔍 Dépannage Courant

### ❌ Le moteur ne démarre pas
**Solution** : Vérifier que les 3 fichiers sont ensemble

### ❌ Erreur UCI protocol error
**Solution** : Télécharger Stockfish v16+ depuis stockfishchess.org

### ❌ Hot-swap : « Fichier introuvable » ou un chemin incomplet
**Solution** : `swap_profile.bat` s'ouvre en administrateur ; le glisser-déposer depuis l'Explorateur est souvent bloqué. Utilisez l'option **2** (boîte de dialogue) dans le script, ou l'option **1** avec *Shift + clic droit* sur le fichier → **Copier comme chemin d'accès**, puis collez dans la fenêtre.

### ❌ Jeu trop lent/rapide
**Solution** : Utiliser `configure_level.bat` pour ajuster

### ❌ Style non correspondant
**Solution** : Régénérer profile.json avec plus de parties (15+)

## 💡 Conseils d'Optimisation

### Pour de Meilleures Performances
- Augmenter **Threads** (2 ou 4)
- Augmenter **Hash** (256 MB minimum)
- Ajuster **Depth** selon la puissance PC

### Pour un Style Plus Agressif
- Modifier `aggressiveness` dans profile.json
- Utiliser niveau 4 ou 5
- Réduire `contempt` (accepte plus de risques)

### Pour des Parties Plus Rapides
- Réduire **Move Time**
- Utiliser niveau 1 ou 2
- Réduire **Depth**

## 📊 Statistiques

Le guide complet fournit :
- ✅ 6 étapes détaillées
- ✅ 2 scripts automatisés
- ✅ 1 documentation complète
- ✅ 5 niveaux de difficulté
- ✅ 4 solutions de dépannage communes
- ✅ 3 fichiers téléchargeables

## 🎯 Compatibilité

**Testé et fonctionnel avec** :
- ✅ Fritz 18
- ✅ Fritz 19
- ✅ Fritz 20
- ✅ ChessBase 16+
- ✅ Arena 3.5+

## 📝 Notes Importantes

1. **Aucun Python requis** : `AvatarEngine.exe` est livré pré-compilé dans le pack ZIP. Plus besoin d'installer Python ou PyInstaller chez l'utilisateur.
2. **Stockfish auto-téléchargé** : Si stockfish.exe est absent, `install_engine.bat` le télécharge automatiquement depuis stockfishchess.org (~30 Mo).
3. **Droits administrateur** : Requis. `install_engine.bat` doit être lancé via clic droit > « Exécuter en tant qu'administrateur ». Le script s'auto-élève via UAC si vous double-cliquez à la place. Cela évite les blocages liés à SmartScreen, au contrôle de compte ou aux antivirus lors du téléchargement de Stockfish et de la copie des fichiers.
4. **profile.json** : L'installation copie le profil du ZIP sous le nom unique `profile.json` dans le dossier moteur (le `Bot_*.profile.json` du ZIP sert seulement de source). Le hot-swap met à jour ce même fichier et retire les anciens `Bot_*.profile.json` en doublon dans le dossier moteur.
5. **Fenêtres noires avec Fritz** : Les versions récentes d'`AvatarEngine.exe` sont compilées sans console et lancent Stockfish sans fenêtre visible ; si vous voyez encore des invites de commandes, remplacez l'exécutable par celui d'un pack récent.
6. **Minimum 15 parties** : Pour un profil précis.
7. **Recompilation côté dev** : Si vous modifiez `public/AvatarEngine.py`, lancez `npm run build:engine` pour régénérer `public/AvatarEngine.exe` puis commitez-le.
8. **Recompilation après mise à jour du pack** : Si le moteur joue deux coups d’affilée ou des coups très faibles dès les premières profondeurs, remplacez `AvatarEngine.exe` par une version recompilée depuis le `AvatarEngine.py` le plus récent (`npm run build:engine` ou `public/compile_avatar_engine.bat`), puis redémarrez Fritz.
9. **Coups « imprécis » volontaires vs bug** : À difficulté 1–3, le moteur peut choisir une 2e–4e ligne d’analyse (MultiPV) pour imiter un joueur humain. Tous les N coups du bot, un blunder périodique est possible (`humanBlunderInterval` dans `profile.json`, défaut 10 ; mettre `0` pour désactiver). Pour un jeu plus fort dans Fritz, utilisez `"difficulty": 4` ou `5` dans `profile.json`.

## 🔄 Mises à Jour Futures

Améliorations prévues :
- [ ] Support de Lichess Analysis Board
- [ ] Import/Export de configurations
- [ ] Profils multiples
- [ ] Statistiques de performance
- [ ] Mode tournoi

---

**Version** : 2.0
**Date** : Décembre 2024
**Auteur** : ChessAvatar
**Licence** : Libre d'utilisation
