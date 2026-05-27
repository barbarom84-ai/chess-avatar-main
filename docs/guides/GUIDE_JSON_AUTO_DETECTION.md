# 🚀 Détection Automatique des Fichiers JSON

## ✨ Nouvelle Fonctionnalité : Plus Besoin de Renommer !

Les scripts `install_engine.bat`, `create_engine_ini.bat` et `AvatarEngine.py` détectent maintenant **automatiquement** n'importe quel fichier JSON dans le dossier.

---

## 📝 Noms de Fichiers Acceptés

### ✅ Formats Reconnus :

1. **`profile.json`** (nom standard, priorité 1)
2. **`Bot_FondueMan.profile.json`** (format personnalisé, priorité 2)
3. **`Magnus_Avatar.profile.json`** (format personnalisé, priorité 2)
4. **`mon-profil.json`** (n'importe quel nom, priorité 3)
5. **N'importe quel `*.json`** (sauf fichiers système)

### ❌ Fichiers Ignorés :

- `engine.json` (réservé)
- `package.json` (système)
- Autres fichiers de configuration

---

## 🔍 Logique de Détection

### Dans `install_engine.bat` :

```batch
:: Chercher n'importe quel fichier .json
for %%f in (*.json) do (
    echo [INFO] Fichier de profil trouve : %%f
    set PROFILE_FILE=%%f
    goto :profile_ok
)
```

**Résultat** :
```
[INFO] Fichier de profil trouve : Bot_FondueMan.profile.json
[INFO] Nom du moteur : FondueMan_Avatar
[INFO] Auteur : Chess Avatar
```

---

### Dans `AvatarEngine.py` :

```python
def load_profile(self):
    script_dir = Path(__file__).parent
    
    # Priorité 1: profile.json (standard)
    profile_path = script_dir / 'profile.json'
    
    # Priorité 2: *.profile.json
    if not profile_path.exists():
        profile_files = list(script_dir.glob('*.profile.json'))
        if profile_files:
            profile_path = profile_files[0]
    
    # Priorité 3: n'importe quel .json
    if not profile_path.exists():
        json_files = [f for f in script_dir.glob('*.json') 
                      if f.name not in ['engine.json', 'package.json']]
        if json_files:
            profile_path = json_files[0]
    
    # Charger le fichier trouvé
    with open(profile_path, 'r', encoding='utf-8') as f:
        return json.load(f)
```

**Sortie** :
```
info string Profile loaded: Bot_FondueMan.profile.json
```

---

## 📂 Exemples d'Utilisation

### Exemple 1 : Nom Standard

```
MonAvatar/
├── AvatarEngine.py
├── install_engine.bat
├── stockfish-windows-x86-64-avx2.exe
└── profile.json                    ← Détecté automatiquement
```

**Résultat** :
- ✅ Détecté : `profile.json`
- ✅ Nom du moteur : extrait depuis `profile.json`

---

### Exemple 2 : Nom Personnalisé (recommandé)

```
MonAvatar/
├── AvatarEngine.py
├── install_engine.bat
├── stockfish-windows-x86-64-avx2.exe
└── Bot_FondueMan.profile.json      ← Détecté automatiquement
```

**Résultat** :
- ✅ Détecté : `Bot_FondueMan.profile.json`
- ✅ Nom du moteur : `FondueMan_Avatar`
- ✅ Pas besoin de renommer !

---

### Exemple 3 : Plusieurs Profils

```
Bureau/
├── Magnus_Avatar/
│   ├── Bot_Magnus.profile.json     ← Détecté
│   └── ... (autres fichiers)
│
├── Tal_Avatar/
│   ├── Bot_Tal.profile.json        ← Détecté
│   └── ... (autres fichiers)
│
└── Karpov_Avatar/
    ├── Bot_Karpov.profile.json     ← Détecté
    └── ... (autres fichiers)
```

**Chaque dossier utilise son propre profil automatiquement !**

---

## 🎯 Avantages

### ✅ Plus de Flexibilité :

- Gardez le nom d'origine du fichier téléchargé
- Pas de confusion avec plusieurs profils
- Identification facile du contenu

### ✅ Plus Simple :

- Pas d'étape de renommage manuel
- Moins d'erreurs possibles
- Workflow plus rapide

### ✅ Plus Clair :

- `Bot_FondueMan.profile.json` → On sait que c'est FondueMan
- `Bot_Magnus.profile.json` → On sait que c'est Magnus
- Meilleure organisation des fichiers

---

## 📊 Comparaison Avant/Après

### ❌ Avant (Renommage Obligatoire)

```
1. Télécharger : Bot_FondueMan.profile.json
2. Renommer en : profile.json
3. Exécuter : install_engine.bat
```

**Problème** : Si plusieurs profils, confusion possible

---

### ✅ Après (Détection Automatique)

```
1. Télécharger : Bot_FondueMan.profile.json
2. Exécuter : install_engine.bat
```

**Avantage** : Nom clair, pas de renommage

---

## 🧪 Tests

### Test 1 : Avec `profile.json`

```batch
cd MonAvatar
# Contient : profile.json

install_engine.bat

# Sortie :
[INFO] Fichier de profil trouve : profile.json
[INFO] Nom du moteur : Magnus_Avatar
```

---

### Test 2 : Avec Nom Personnalisé

```batch
cd MonAvatar
# Contient : Bot_FondueMan.profile.json

install_engine.bat

# Sortie :
[INFO] Fichier de profil trouve : Bot_FondueMan.profile.json
[INFO] Nom du moteur : FondueMan_Avatar
```

---

### Test 3 : Avec Nom Quelconque

```batch
cd MonAvatar
# Contient : mon-super-profil.json

install_engine.bat

# Sortie :
[INFO] Fichier de profil trouve : mon-super-profil.json
[INFO] Nom du moteur : SuperProfil_Avatar
```

---

## 🔧 Configuration dans `engine.ini`

Le fichier `engine.ini` créé contient le nom exact du fichier JSON détecté :

**Avant** :
```ini
[Personality]
Profile=profile.json
```

**Après** :
```ini
[Personality]
Profile=Bot_FondueMan.profile.json
```

**Avantage** : `AvatarEngine.exe` charge le bon fichier automatiquement

---

## 📝 Workflow Complet

### 1. Téléchargement

Sur le site ChessAvatar :
1. Créez votre bot
2. Cliquez sur "JSON"
3. Le fichier se télécharge avec un nom comme `Bot_VotreNom.profile.json`

**Vous pouvez garder ce nom ! 🎉**

---

### 2. Installation

```
MonAvatar/
├── AvatarEngine.py
├── install_engine.bat
├── stockfish-windows-x86-64-avx2.exe
└── Bot_FondueMan.profile.json      ← Gardez le nom d'origine
```

Double-clic sur `install_engine.bat` :

```
[INFO] Fichier de profil trouve : Bot_FondueMan.profile.json
[INFO] Nom du moteur : FondueMan_Avatar
[INFO] Auteur : Chess Avatar

[OK] engine.ini cree avec succes
[OK] Installation terminee !
```

---

### 3. Vérification dans Fritz 20

```
Nom : FondueMan_Avatar
Auteur : Chess Avatar
```

**Tout fonctionne automatiquement ! ✅**

---

## 🎁 Cas d'Usage : Plusieurs Bots

Vous pouvez maintenant gérer plusieurs bots sans confusion :

```
Bureau/
├── Magnus_Avatar/
│   ├── Bot_Magnus.profile.json
│   ├── install_engine.bat
│   └── ...
│
├── Tal_Avatar/
│   ├── Bot_Tal.profile.json
│   ├── install_engine.bat
│   └── ...
│
└── Karpov_Avatar/
    ├── Bot_Karpov.profile.json
    ├── install_engine.bat
    └── ...
```

**Exécutez `install_engine.bat` dans chaque dossier** :

- Magnus → Installe `Magnus_Avatar` avec `Bot_Magnus.profile.json`
- Tal → Installe `Tal_Avatar` avec `Bot_Tal.profile.json`
- Karpov → Installe `Karpov_Avatar` avec `Bot_Karpov.profile.json`

**Aucune confusion possible ! 🎯**

---

## 🐛 Dépannage

### ❌ "Aucun fichier .json trouvé !"

**Cause** : Pas de fichier `.json` dans le dossier

**Solution** :
```
1. Vérifiez que le fichier est bien dans MonAvatar/
2. Vérifiez l'extension : doit être .json
3. Liste des fichiers : dir *.json
```

---

### ❌ Mauvais Profil Chargé

**Cause** : Plusieurs fichiers `.json` dans le dossier

**Solution** :
- Le script prend le **premier** trouvé
- Supprimez les fichiers JSON inutilisés
- Ou renommez celui voulu en `profile.json` (priorité 1)

---

### ❌ "Profile loaded: engine.json"

**Cause** : Bug si `engine.json` existe

**Solution** :
- ✅ Corrigé ! `engine.json` est maintenant ignoré
- Le script ne charge que les vrais profils

---

## 📅 Historique

**Version 3.1 - 12/12/2025** :
- ✨ Détection automatique de n'importe quel fichier JSON
- 🎯 Ordre de priorité intelligent
- 📝 Plus besoin de renommer
- 🎁 Support des noms personnalisés

**Version 3.0** :
- Compilation intégrée
- Automatisation du nom/auteur

**Version 2.0** :
- Détection automatique de Stockfish

**Version 1.0** :
- Nécessitait `profile.json` exact

---

**Plus de flexibilité, moins de contraintes ! 🚀**
