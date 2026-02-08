# 🚀 Ordre d'Installation Correct - IMPORTANT

## ⚠️ ORDRE CRUCIAL DES ÉTAPES

Si vous avez déjà compilé `AvatarEngine.exe` AVANT les dernières corrections, il contient l'ANCIEN code qui ne fonctionne pas correctement avec Fritz 20.

---

## ✅ PROCÉDURE COMPLÈTE (À Suivre dans l'Ordre)

### 📋 Étape 1 : Préparation du Dossier

1. Créez un dossier `MonAvatar` sur votre bureau
2. **Ne mettez RIEN dedans pour l'instant**

---

### 📥 Étape 2 : Téléchargement des Fichiers (Dans l'Ordre)

Depuis le site ChessPersona, téléchargez **DANS CET ORDRE** :

1. **`AvatarEngine.py`** (version la plus récente avec corrections UCI)
   - ⚠️ **IMPORTANT** : Si vous l'avez déjà téléchargé AVANT le 12/12/2025, RE-téléchargez-le !
   
2. **`compile_avatar_engine.bat`**

3. **`install_engine.bat`**

4. **Stockfish** depuis [stockfishchess.org](https://stockfishchess.org/download/)
   - Prenez la version Windows 64-bit
   - Le fichier s'appellera `stockfish-windows-x86-64-avx2.exe` (ou similaire)

5. **`profile.json`**
   - Générez votre profil sur la page d'accueil
   - Bouton "JSON" pour télécharger
   - ⚠️ **RENOMMEZ-LE** en `profile.json`

**Tous ces fichiers vont dans le dossier `MonAvatar`**

---

### 🔧 Étape 3 : Compilation de AvatarEngine.exe

**ATTENTION** : Cette étape doit être faite **APRÈS** avoir téléchargé le nouveau `AvatarEngine.py` !

1. Allez dans le dossier `MonAvatar`
2. **Double-cliquez** sur `compile_avatar_engine.bat`
3. Attendez que la compilation se termine
4. Vérifiez que `AvatarEngine.exe` a été créé

**Contenu du dossier à ce stade** :
```
MonAvatar/
├── AvatarEngine.py                             ✅
├── AvatarEngine.exe                            ✅ (vient d'être créé)
├── compile_avatar_engine.bat                   ✅
├── install_engine.bat                          ✅
├── stockfish-windows-x86-64-avx2.exe          ✅
└── profile.json                                ✅
```

---

### 💾 Étape 4 : Installation dans Fritz 20

**Maintenant seulement**, exécutez l'installation :

1. **Double-cliquez** sur `install_engine.bat`
2. Entrez le nom du moteur (ex: `marco_Avatar`)
3. Entrez le nom de l'auteur (ex: `marco`)
4. Attendez que la copie se termine

Le script va créer le fichier `engine.ini` avec vos noms personnalisés.

---

### 🎮 Étape 5 : Ajout dans Fritz 20

1. Ouvrez **Fritz 20**
2. Onglet **Module** → **Module UCI**
3. Cliquez sur **...** pour parcourir
4. Naviguez vers : `C:\Users\marco\Documents\ChessBase\Engines\marco_Avatar`
5. Sélectionnez `AvatarEngine.exe`
6. **Vérifiez que les champs Nom et Auteur sont remplis** ✅

---

## 🔄 SI LES CHAMPS SONT TOUJOURS VIDES

### Option A : Supprimer et Recommencer

1. **Supprimez** le dossier `MonAvatar` entier
2. **Recommencez depuis l'Étape 1**
3. Assurez-vous de **RE-télécharger** `AvatarEngine.py` (version corrigée)

### Option B : Re-compiler Uniquement

Si vous avez déjà tout téléchargé mais compilé trop tôt :

1. Dans le dossier `MonAvatar`, **supprimez** `AvatarEngine.exe`
2. **RE-téléchargez** `AvatarEngine.py` (version du 12/12/2025 ou plus récente)
3. **Double-cliquez** sur `compile_avatar_engine.bat` à nouveau
4. **Supprimez** le dossier dans Fritz : `Documents\ChessBase\Engines\marco_Avatar`
5. **Re-exécutez** `install_engine.bat`
6. **Re-ajoutez** le moteur dans Fritz 20

---

## 🧪 Test Manuel de l'Exécutable

Pour vérifier que `AvatarEngine.exe` fonctionne correctement :

1. Ouvrez l'**Invite de commandes** (cmd.exe)
2. Naviguez vers le dossier : `cd "C:\Users\marco\Desktop\MonAvatar"`
3. Lancez : `AvatarEngine.exe`
4. Tapez : `uci` puis **Entrée**
5. Vous devriez voir **EN PREMIER** :
   ```
   id name marco_Avatar
   id author marco
   option name Hash type spin ...
   ...
   uciok
   ```

**Si vous voyez** :
```
id name Stockfish 16
```
→ ❌ Vous utilisez l'ANCIEN code. RE-téléchargez `AvatarEngine.py` et RE-compilez.

---

## 📊 Checklist de Vérification

Avant d'ajouter le moteur dans Fritz 20, vérifiez :

- [ ] Le fichier `AvatarEngine.py` a été téléchargé **après le 12/12/2025**
- [ ] Le fichier `AvatarEngine.exe` a été **compilé APRÈS** avoir téléchargé le nouveau .py
- [ ] Le fichier `engine.ini` existe dans le dossier d'installation
- [ ] Le fichier `engine.ini` contient bien `Name=marco_Avatar` et `Author=marco`
- [ ] Le test manuel (cmd → `uci`) affiche votre nom personnalisé

---

## 🎯 Dates des Versions

**Version correcte de AvatarEngine.py** : 
- Date : 12 décembre 2025 ou plus récente
- Contient : `self.waiting_for_uciok` et bufferisation UCI
- Ligne ~100 : `def handle_uci(self)` avec `self.waiting_for_uciok = True`

**Version OBSOLÈTE** :
- Date : Avant le 12 décembre 2025
- Ne contient PAS : Bufferisation UCI
- ❌ Ne fonctionne PAS correctement avec Fritz 20

---

## 🔑 Résumé en 5 Étapes

1. 📁 Créer dossier `MonAvatar`
2. 📥 Télécharger TOUS les fichiers (AvatarEngine.py VERSION RÉCENTE)
3. 🔧 Compiler : `compile_avatar_engine.bat`
4. 💾 Installer : `install_engine.bat` (crée engine.ini)
5. 🎮 Ajouter dans Fritz 20

**ORDRE CRUCIAL** : Téléchargement → Compilation → Installation → Ajout Fritz 20

---

**Date de ce guide : 12 décembre 2025** 🎉
