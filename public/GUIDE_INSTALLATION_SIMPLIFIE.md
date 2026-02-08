# 🚀 Guide d'Installation Ultra-Simplifié - ChessPersona Avatar Engine

## ✨ NOUVEAU : UN SEUL Script pour TOUT !

`install_engine.bat` fait maintenant **TOUT automatiquement** :
- ✅ **Compile** AvatarEngine.py en .exe (si nécessaire)
- ✅ **Extrait** votre nom depuis profile.json
- ✅ **Détecte** Stockfish automatiquement
- ✅ **Configure** engine.ini
- ✅ **Installe** dans Fritz 20

**Un double-clic et c'est fait ! 🎉**

---

## 📋 Installation en 3 Étapes

### 📁 Étape 1 : Télécharger les Fichiers

Créez un dossier `MonAvatar` et téléchargez :

1. **`AvatarEngine.py`** (depuis ChessPersona)
2. **`install_engine.bat`** (depuis ChessPersona)
3. **`stockfish-windows-x86-64-avx2.exe`** (depuis stockfishchess.org)
4. **`profile.json`** (généré sur ChessPersona, à renommer)

**C'est tout ! Pas besoin de compiler manuellement.**

---

### 🚀 Étape 2 : Lancer l'Installation

1. Double-cliquez sur **`install_engine.bat`**
2. Le script va :
   - Vérifier si AvatarEngine.exe existe
   - **Le compiler automatiquement** si nécessaire
   - Lire votre nom dans profile.json
   - Détecter Stockfish
   - Créer engine.ini
   - Installer dans Fritz 20

**Sortie console** :
```
========================================
Installation du Moteur UCI
========================================

Dossier actuel : C:\Users\marco\Bureau\MonAvatar

[INFO] AvatarEngine.exe introuvable
[INFO] Compilation automatique en cours...

[OK] AvatarEngine.py trouve
[OK] Python detecte
[OK] PyInstaller detecte

========================================
  Compilation en cours...
========================================

[OK] AvatarEngine.exe compile avec succes !

[INFO] Stockfish trouve : stockfish-windows-x86-64-avx2.exe
[OK] Tous les fichiers sont presents

Lecture de profile.json...

========================================
Configuration automatique
========================================
[INFO] Nom du moteur : Magnus_Avatar
[INFO] Auteur : Chess Avatar
[INFO] Stockfish : stockfish-windows-x86-64-avx2.exe

[OK] engine.ini cree avec succes

========================================
Installation terminee !
========================================

Votre avatar est pret a jouer !
```

---

### 🎮 Étape 3 : Ajouter dans Fritz 20

1. Ouvrez **Fritz 20**
2. Onglet **Module** → **Module UCI**
3. Cliquez sur **...** pour parcourir
4. Sélectionnez : `C:\Users\VOTRE_NOM\Documents\ChessBase\Engines\Magnus_Avatar\AvatarEngine.exe`
5. **Vérifiez que les champs sont remplis** ✅

---

## 🎯 Comparaison Avant/Après

### ❌ Avant (2 Scripts)

```
1. Télécharger fichiers (4 fichiers)
2. Double-clic : compile_avatar_engine.bat
3. Attendre la compilation
4. Double-clic : install_engine.bat
5. Attendre l'installation
6. Ajouter dans Fritz 20
```

**Total : ~3 minutes, 2 scripts**

---

### ✅ Après (1 Script)

```
1. Télécharger fichiers (4 fichiers)
2. Double-clic : install_engine.bat
3. → Compile automatiquement si nécessaire
4. → Configure et installe automatiquement
5. Ajouter dans Fritz 20
```

**Total : ~2 minutes, 1 SEUL script ! 🚀**

---

## 🔧 Détails Techniques

### Logique de Compilation Automatique

Le script vérifie d'abord si `AvatarEngine.exe` existe :

**Cas 1 : AvatarEngine.exe existe déjà**
```batch
[OK] AvatarEngine.exe deja present
→ Passe directement à la configuration
```

**Cas 2 : AvatarEngine.exe n'existe pas**
```batch
[INFO] AvatarEngine.exe introuvable
[INFO] Compilation automatique en cours...

1. Vérifier AvatarEngine.py
2. Vérifier Python installé
3. Vérifier/Installer PyInstaller
4. Compiler avec PyInstaller
5. Copier dans dossier courant
6. Nettoyer fichiers temporaires

[OK] AvatarEngine.exe compile avec succes !
→ Continue avec la configuration
```

---

### Extraction Automatique du Nom

**Votre profile.json** :
```json
{
  "username": "Magnus",
  "name": "Magnus Carlsen Clone",
  "elo": 2800
}
```

**Logique du script** :
```
1. Chercher "username" → Trouvé : "Magnus"
2. Ajouter "_Avatar" → Résultat : "Magnus_Avatar"
3. Auteur → Fixe : "Chess Avatar"
```

---

### Détection Automatique de Stockfish

Le script cherche n'importe quel fichier commençant par `stockfish` :

**Exemples valides** :
- ✅ `stockfish.exe`
- ✅ `stockfish-windows-x86-64-avx2.exe`
- ✅ `stockfish-windows-x86-64-sse41.exe`
- ✅ `stockfish_16_x64.exe`

**Pas de renommage nécessaire !**

---

## 📊 Fichiers Requis

### Minimum Absolu :

```
MonAvatar/
├── AvatarEngine.py           ← Obligatoire
├── install_engine.bat        ← Obligatoire
├── stockfish*.exe            ← Obligatoire
└── profile.json              ← Obligatoire
```

**4 fichiers, 1 script, et c'est parti ! 🚀**

---

## 🎁 Scripts Optionnels

### `compile_avatar_engine.bat` (Désormais Optionnel)

Ce script est maintenant **intégré** dans `install_engine.bat`.

**Quand l'utiliser ?**
- Si vous voulez compiler **avant** l'installation
- Pour tester la compilation seule
- Pour créer AvatarEngine.exe dans un autre dossier

**⚠️ Ce n'est plus nécessaire dans le workflow normal !**

---

### `create_engine_ini.bat` (Test Rapide)

Crée uniquement `engine.ini` pour tests.

**Quand l'utiliser ?**
- Pour vérifier que profile.json est bien formaté
- Pour tester l'extraction du nom
- Pour déboguer la configuration

**Usage** :
```batch
cd MonAvatar
create_engine_ini.bat

# Résultat :
[INFO] Nom du moteur : Magnus_Avatar
[INFO] Auteur : Chess Avatar
[OK] engine.ini cree avec succes !
```

---

## 🐛 Dépannage

### ❌ "Python n'est pas installé"

**Solution** :
1. Téléchargez Python : https://www.python.org/downloads/
2. **Important** : Cochez "Add Python to PATH" lors de l'installation
3. Redémarrez le terminal/script

---

### ❌ "AvatarEngine.py introuvable"

**Cause** : Le fichier n'est pas dans le même dossier que `install_engine.bat`

**Solution** :
```
MonAvatar/
├── AvatarEngine.py           ← Doit être ici
├── install_engine.bat        ← À côté
└── ...
```

---

### ❌ "Stockfish introuvable"

**Cause** : Aucun fichier commençant par `stockfish` et se terminant par `.exe`

**Solution** :
- Vérifiez que le fichier existe
- Vérifiez qu'il s'appelle bien `stockfish*.exe`
- Liste des fichiers .exe présents : `dir *.exe`

---

### ❌ "profile.json introuvable"

**Cause** : Le fichier téléchargé n'est pas renommé correctement

**Solution** :
1. Générez votre profil sur ChessPersona
2. Téléchargez le fichier JSON
3. **Renommez-le exactement** en `profile.json`
4. Placez-le dans `MonAvatar/`

---

### ❌ "La compilation a échoué"

**Causes possibles** :
- Python pas installé correctement
- PyInstaller pas installé
- AvatarEngine.py corrompu

**Solution** :
```batch
# Test Python
python --version

# Test PyInstaller
python -m pip show pyinstaller

# Réinstaller PyInstaller
python -m pip uninstall pyinstaller
python -m pip install pyinstaller

# Retélécharger AvatarEngine.py (version récente)
```

---

### ❌ Les champs sont vides dans Fritz 20

**Cause** : `engine.ini` pas créé ou AvatarEngine.exe ancien

**Solution** :
```batch
# 1. Supprimer AvatarEngine.exe
del AvatarEngine.exe

# 2. Relancer install_engine.bat
install_engine.bat

# → Le script va recompiler avec la dernière version
```

---

## 🧪 Test Local (Avant Fritz 20)

Vous pouvez tester AvatarEngine.exe directement :

```batch
cd MonAvatar
AvatarEngine.exe

# Taper dans la console :
uci

# Résultat attendu :
id name Magnus_Avatar      ← Votre nom depuis profile.json
id author Chess Avatar    ← Auteur fixe
option name Hash type spin default 128 min 1 max 65536
option name Threads type spin default 4 min 1 max 512
...
uciok
```

---

## 📦 Workflow Complet Résumé

### Fichiers à Télécharger :

| Fichier | Source | Action |
|---------|--------|--------|
| `AvatarEngine.py` | ChessPersona | Télécharger |
| `install_engine.bat` | ChessPersona | Télécharger |
| `stockfish*.exe` | stockfishchess.org | Télécharger |
| `profile.json` | ChessPersona | Générer + Renommer |

---

### Étapes d'Installation :

```
1. Créer dossier MonAvatar/
2. Télécharger les 4 fichiers dedans
3. Double-clic : install_engine.bat
4. Attendre la compilation automatique (si nécessaire)
5. Attendre l'installation automatique
6. Ouvrir Fritz 20
7. Module > Module UCI > Ajouter AvatarEngine.exe
8. JOUER ! 🎉
```

---

## 🎯 Exemples de Noms Générés

| profile.json | Nom du Moteur | Auteur |
|--------------|---------------|--------|
| `"username": "Magnus"` | `Magnus_Avatar` | `Chess Avatar` |
| `"username": "Hikaru"` | `Hikaru_Avatar` | `Chess Avatar` |
| `"username": "marco"` | `marco_Avatar` | `Chess Avatar` |
| `"name": "AlphaZero"` | `AlphaZero_Avatar` | `Chess Avatar` |
| (vide) | `ChessAvatar` | `Chess Avatar` |

---

## 🎁 Créer Plusieurs Avatars

Vous pouvez créer plusieurs moteurs avec des profils différents :

```
Bureau/
├── Magnus_Avatar/
│   ├── AvatarEngine.py
│   ├── install_engine.bat
│   ├── stockfish*.exe
│   └── profile.json (Magnus, ELO 2800)
│
├── Tal_Avatar/
│   ├── AvatarEngine.py
│   ├── install_engine.bat
│   ├── stockfish*.exe
│   └── profile.json (Tal, ELO 2700, agressif)
│
└── Karpov_Avatar/
    ├── AvatarEngine.py
    ├── install_engine.bat
    ├── stockfish*.exe
    └── profile.json (Karpov, ELO 2750, positionnel)
```

**Chaque dossier installe un moteur différent !**

Exécutez `install_engine.bat` dans chaque dossier :
- `Magnus_Avatar` → Installe dans `ChessBase\Engines\Magnus_Avatar\`
- `Tal_Avatar` → Installe dans `ChessBase\Engines\Tal_Avatar\`
- `Karpov_Avatar` → Installe dans `ChessBase\Engines\Karpov_Avatar\`

---

## ✅ Checklist de Vérification

Avant d'exécuter `install_engine.bat` :

- [ ] Dossier `MonAvatar` créé
- [ ] `AvatarEngine.py` téléchargé (version récente)
- [ ] `install_engine.bat` téléchargé
- [ ] `stockfish*.exe` téléchargé (n'importe quelle variante)
- [ ] `profile.json` généré et renommé correctement
- [ ] Tous les fichiers dans le **même dossier**
- [ ] Python installé (pour la compilation)

**Si tout est coché → Double-clic et c'est fini ! 🚀**

---

## 📅 Historique des Versions

**Version 3.0 - 12/12/2025** :
- 🚀 **Compilation intégrée** dans install_engine.bat
- ✅ Un seul script pour tout le processus
- ⚡ Installation en ~2 minutes (vs ~3 minutes avant)
- 🎯 Workflow ultra-simplifié

**Version 2.0 - 12/12/2025** :
- ✨ Automatisation du nom et auteur
- 🆕 Script `create_engine_ini.bat`
- ✅ Détection automatique de Stockfish

**Version 1.0** :
- Saisie manuelle
- 2 scripts séparés (compile + install)

---

## 🎉 Conclusion

**Avant** : 2 scripts, saisie manuelle, 3 minutes  
**Maintenant** : 1 script, 100% automatique, 2 minutes

**Installation maintenant ultra-simplifiée ! 🚀**

---

**Questions ? Problèmes ? Consultez la section Dépannage ou le site ChessPersona.**
