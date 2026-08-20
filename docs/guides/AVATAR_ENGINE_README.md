# AvatarEngine - Guide d'Installation

## 📋 Vue d'ensemble

**AvatarEngine** est un wrapper UCI (Universal Chess Interface) qui permet d'utiliser vos profils ChessAvatar dans des logiciels d'échecs comme Fritz 20, ChessBase, Arena, etc.

## 🎯 Prérequis

1. **Python 3.7+** (pour compiler le script)
   - Télécharger : https://www.python.org/downloads/
   - ⚠️ Cochez "Add Python to PATH" lors de l'installation

2. **Stockfish** (moteur d'échecs)
   - Télécharger : https://stockfishchess.org/download/
   - Prenez la version Windows 64-bit

3. **profile.json** (votre profil ChessAvatar)
   - Généré depuis le site ChessAvatar
   - Bouton "JSON" sur la page d'accueil
   - ⚠️ **Important** : Le fichier téléchargé ne s'appelle pas "profile.json" par défaut. Renommez-le en `profile.json` après téléchargement.

## 🚀 Installation Rapide

### Étape 1 : Préparation des fichiers

1. Créez un dossier `MonAvatar` sur votre bureau
2. Téléchargez ces fichiers dans ce dossier :
   - ✅ `AvatarEngine.py` (depuis ChessAvatar)
   - ✅ `compile_avatar_engine.bat` (depuis ChessAvatar)
   - ✅ `stockfish.exe` (depuis stockfishchess.org)
   - ✅ `profile.json` (généré par ChessAvatar)
     - ⚠️ **N'oubliez pas** : Renommez le fichier téléchargé en `profile.json`

### Étape 2 : Compilation

1. Double-cliquez sur `compile_avatar_engine.bat`
2. Le script va :
   - ✅ Vérifier Python
   - ✅ Installer PyInstaller si nécessaire
   - ✅ Compiler `AvatarEngine.py` en `AvatarEngine.exe`
   - ✅ Nettoyer les fichiers temporaires

### Étape 3 : Installation dans Fritz 20

**Option A : Automatique (Recommandé)**
1. Téléchargez `install_engine.bat`
2. Placez-le dans le dossier `MonAvatar`
3. Double-cliquez sur `install_engine.bat` (aucun droit administrateur requis — l’installation se fait dans votre dossier Documents)
4. Les fichiers seront copiés dans `Documents\ChessBase\Engines\MonAvatar`

**Option B : Manuelle - Fritz 20 / ChessBase**
1. Ouvrez Fritz 20 ou ChessBase
2. Cliquez sur l'onglet **Module** dans le ruban supérieur
3. Cliquez sur **Module UCI** dans la section "Gestion des modules"
4. Cliquez sur le bouton **...** pour parcourir
5. Naviguez vers votre dossier `MonAvatar`
6. Sélectionnez `AvatarEngine.exe`
7. Donnez-lui un nom (ex: "Mon Avatar")
8. Cliquez sur **Valider**

**Option C : Manuelle - Arena / Cutechess**
1. Menu **Engines** → **Install New Engine**
2. Naviguez vers votre dossier `MonAvatar`
3. Sélectionnez `AvatarEngine.exe`

## 📁 Structure des fichiers

```
MonAvatar/
├── AvatarEngine.exe      (✅ Généré par compilation)
├── stockfish.exe          (📥 Téléchargé)
├── profile.json           (📥 Généré par ChessAvatar - à renommer)
├── AvatarEngine.py        (📥 Script source)
└── compile_avatar_engine.bat (📥 Script de compilation)
```

⚠️ **Note importante** : Le fichier JSON téléchargé depuis ChessAvatar n'a pas le nom "profile.json" par défaut. Assurez-vous de le renommer en `profile.json` avant de continuer.

## ⚙️ Configuration

Le fichier `profile.json` contient :

```json
{
  "name": "Mon Avatar",
  "username": "MonNom",
  "skill": 15,
  "depth": 16,
  "elo": 2000,
  "style": {
    "aggression": 50,
    "riskTolerance": 50,
    "positionalVsTactical": 50
  }
}
```

### Paramètres UCI appliqués automatiquement :
- **Skill Level** : `profile.skill` (0-20)
- **UCI_Elo** : `profile.elo` (1350-2850)
- **Depth** : `profile.depth` (8-20)
- **UCI_LimitStrength** : `true` (pour respecter l'ELO)

### Coups plus « humains » (erreurs périodiques)

- **`humanBlunderInterval`** (nombre entier, optionnel) : tous les **N** coups joués par l’avatar dans la partie, le moteur joue un coup **sous-optimal** (variantes MultiPV, comme sur le site). **Défaut : 10** si la clé est absente. Mettre **`0`** pour désactiver.
- Les coups issus de la **ligne forcée**, du **répertoire d’ouvertures** ou du **fallback Fritz** ne sont pas modifiés.

## 🎮 Utilisation

1. Lancez Fritz 20
2. Sélectionnez votre moteur "Mon Avatar" dans la liste
3. Jouez ! Le moteur s'adaptera selon votre profil

## 🔧 Personnalisation avancée

### Modifier le profil sans recompiler

Éditez simplement `profile.json` et relancez Fritz :

```json
{
  "skill": 18,        ← Plus fort
  "elo": 2500,        ← ELO plus élevé
  "depth": 20         ← Recherche plus profonde
}
```

### Créer plusieurs avatars

Dupliquez le dossier `MonAvatar` :
- `MonAvatar_Debutant/` (skill: 5, elo: 1400)
- `MonAvatar_Intermediaire/` (skill: 12, elo: 1900)
- `MonAvatar_Expert/` (skill: 20, elo: 2600)

Ajoutez chaque `AvatarEngine.exe` comme moteur séparé dans Fritz.

## 🐛 Dépannage

### ❌ "Python n'est pas reconnu"
**Solution** : Réinstallez Python et cochez "Add Python to PATH"

### ❌ "PyInstaller introuvable"
**Solution** : Exécutez `python -m pip install pyinstaller` dans le terminal (si `pip` est bloqué par Windows, utilisez `python -m pip`)

### ❌ "AvatarEngine.exe ne démarre pas"
**Solution** : Vérifiez que `stockfish.exe` et `profile.json` sont dans le même dossier

### ❌ "Le moteur joue trop fort/faible"
**Solution** : Ajustez `skill` (0-20) et `elo` (1350-2850) dans `profile.json`

### ❌ "PyInstaller inaccessible" / pip bloqué (Device Guard)
**Solution** : contactez votre administrateur pour autoriser pip, ou compilez AvatarEngine.exe sur un PC où pip fonctionne puis copiez l'exe dans le dossier du moteur.

### ❌ "Erreur lors de la compilation"
**Solution** : 
1. Fermez tous les programmes
2. Supprimez les dossiers `build/` et `dist/`
3. Relancez `compile_avatar_engine.bat`

## 📚 Compatibilité

### ✅ Logiciels compatibles :
- Fritz 20
- ChessBase 17
- Arena Chess GUI
- BanksiaGUI
- Cutechess
- Lucas Chess
- Tout logiciel supportant UCI

### 💻 Systèmes d'exploitation :
- ✅ Windows 10/11 (natif)
- ✅ Linux (avec Wine ou recompilation Python)
- ✅ macOS (nécessite adaptation du script)

## 🤝 Support

- 🌐 Site : https://chess-avatar.vercel.app
- 📧 GitHub Issues : [Lien du repo]
- 📖 Documentation complète : https://chess-avatar.vercel.app/guide

## 📜 Licence

AvatarEngine est fourni sous licence MIT.
Stockfish est sous licence GPL v3.

---

**Créé avec ♟️ par ChessAvatar**
