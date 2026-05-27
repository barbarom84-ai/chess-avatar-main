# 🔒 Avertissement de Sécurité Windows

## ⚠️ Message d'Avertissement Normal

Lorsque vous téléchargez et exécutez `install_engine.bat` ou d'autres fichiers `.bat`, **Windows affiche un avertissement de sécurité**. C'est **tout à fait normal** !

---

## 🛡️ Pourquoi Windows Affiche Cet Avertissement ?

Windows protège votre système contre les **scripts potentiellement malveillants** téléchargés depuis Internet. C'est une bonne chose !

**Tous les fichiers `.bat`, `.exe`, `.ps1` téléchargés depuis Internet** déclenchent cet avertissement, même s'ils sont 100% sûrs.

---

## ✅ Notre Code est 100% Transparent

### **Fichiers Open Source**
Tous nos scripts sont **visibles en clair** :
- `install_engine.bat` → Script batch Windows lisible
- `AvatarEngine.py` → Code Python 100% visible
- Aucun fichier binaire caché

### **Que Font Ces Scripts ?**
1. **`install_engine.bat`** :
   - Compile `AvatarEngine.py` en `.exe` avec PyInstaller
   - Lit votre fichier JSON pour extraire le nom
   - Détecte Stockfish automatiquement
   - Copie les fichiers dans `Documents\ChessBase\Engines\`
   - Crée un fichier de configuration `engine.ini`

2. **`AvatarEngine.py`** :
   - Agit comme un wrapper UCI pour Stockfish
   - Lit les configurations depuis `profile.json`
   - Gère la communication avec Fritz/Arena/ChessBase
   - Ne modifie **aucun fichier système**

### **Aucune Action Dangereuse**
- ❌ Pas de connexion Internet
- ❌ Pas d'accès au registre Windows
- ❌ Pas de modification de fichiers système
- ❌ Pas de collecte de données
- ✅ **Seulement des opérations locales sur vos fichiers d'échecs**

---

## 🔓 Comment Débloquer les Fichiers

### **Méthode 1 : Débloquer Avant Exécution (Recommandé)**

1. **Clic droit** sur le fichier `.bat` téléchargé
2. Sélectionnez **"Propriétés"**
3. En bas de la fenêtre, cochez **"Débloquer"** (si présent)
4. Cliquez sur **"OK"**
5. Double-cliquez sur le fichier → Il s'exécute sans avertissement

---

### **Méthode 2 : Exécuter Quand Même**

Quand l'avertissement Windows apparaît :

```
Windows a protégé votre ordinateur
Ce fichier provient d'un emplacement Internet et pourrait être dangereux.
```

1. Cliquez sur **"Informations complémentaires"**
2. Cliquez sur **"Exécuter quand même"**

---

### **Méthode 3 : Lire le Code Vous-Même**

Vous pouvez **ouvrir les fichiers `.bat` avec un éditeur de texte** (Notepad, VSCode, etc.) pour voir **exactement ce qu'ils font** avant de les exécuter.

**Exemple** :
```batch
@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ========================================
echo Installation Automatique du Moteur
echo ========================================
echo.

REM Vérifier si AvatarEngine.exe existe
if not exist "AvatarEngine.exe" (
    echo [INFO] AvatarEngine.exe non trouve, compilation necessaire...
    
    REM Vérifier Python
    where python >nul 2>nul
    if errorlevel 1 (
        echo [ERREUR] Python n'est pas installe !
        pause
        exit /b 1
    )
    ...
)
```

Tout est **lisible et vérifiable** ! 👀

---

## 🔍 Vérification Antivirus

Si vous avez des doutes, vous pouvez **scanner les fichiers avec votre antivirus** avant de les exécuter :

1. **Clic droit** sur le fichier
2. Sélectionnez **"Analyser avec [Votre Antivirus]"**
3. Attendez le résultat → ✅ Clean

---

## 🌐 Vérifications Externes

Vous pouvez également soumettre les fichiers à des services en ligne :

- **VirusTotal** : [virustotal.com](https://www.virustotal.com/)
- **Hybrid Analysis** : [hybrid-analysis.com](https://www.hybrid-analysis.com/)

Ces services scannent les fichiers avec **70+ antivirus différents**.

---

## 📋 Checklist de Sécurité

Avant d'exécuter un script téléchargé, vérifiez :

- ✅ **Source fiable** : Le site est-il légitime ?
- ✅ **Code visible** : Pouvez-vous lire le contenu ?
- ✅ **HTTPS** : Le site utilise-t-il une connexion sécurisée ?
- ✅ **Open Source** : Le code est-il public et auditable ?
- ✅ **Communauté** : D'autres utilisateurs l'ont-ils testé ?

**Chess Avatar** coche toutes ces cases ! ✅

---

## 🆘 En Cas de Doute

Si vous n'êtes **pas à l'aise** avec l'exécution de scripts :

### **Alternative : Installation Manuelle**

1. Installez **Python 3.7+** : [python.org](https://www.python.org/)
2. Installez **PyInstaller** :
   ```powershell
   python -m pip install pyinstaller
   ```
3. Téléchargez `AvatarEngine.py` et `profile.json`
4. Ouvrez PowerShell dans le dossier
5. Compilez manuellement :
   ```powershell
   pyinstaller --onefile --console AvatarEngine.py
   ```
6. Copiez `dist/AvatarEngine.exe` + Stockfish + `profile.json` dans :
   ```
   C:\Users\VotreNom\Documents\ChessBase\Engines\VotreBot\
   ```
7. Créez `engine.ini` manuellement :
   ```ini
   [Engine]
   Name=VotreBot_Avatar
   Author=Chess Avatar
   Protocol=UCI
   StockfishPath=stockfish.exe

   [Options]
   Hash=128
   Threads=4

   [Personality]
   Profile=profile.json
   ```

---

## 🎯 Résumé

| Question | Réponse |
|----------|---------|
| **L'avertissement est-il normal ?** | ✅ Oui, Windows protège tous les `.bat` téléchargés |
| **Les scripts sont-ils sûrs ?** | ✅ Oui, code 100% visible et auditable |
| **Y a-t-il des actions dangereuses ?** | ❌ Non, seulement des opérations locales |
| **Puis-je vérifier le code ?** | ✅ Oui, ouvrez les fichiers avec un éditeur |
| **Dois-je avoir peur ?** | ❌ Non, c'est juste un avertissement standard |

---

## 📞 Support

Si vous avez des questions ou des inquiétudes concernant la sécurité :

1. **Lisez le code source** : Tous les fichiers sont en texte clair
2. **Scannez avec votre antivirus** : Vérifiez par vous-même
3. **Utilisez l'installation manuelle** : Contrôle total à chaque étape

---

## 🎓 Pour Aller Plus Loin

### **Comprendre les Avertissements Windows**

Windows utilise **Mark of the Web (MOTW)** pour marquer les fichiers téléchargés depuis Internet. C'est une **zone de sécurité alternative** qui déclenche des avertissements pour protéger l'utilisateur.

**Ce n'est PAS un virus**, c'est juste Windows qui dit : *"Attention, ce fichier vient d'Internet, vérifiez-le avant de l'exécuter"*.

---

**Développé avec ❤️ et transparence par Chess Avatar**

*Votre sécurité est notre priorité. Nous ne cachons rien, tout est vérifiable.*
