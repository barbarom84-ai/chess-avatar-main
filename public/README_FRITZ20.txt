╔════════════════════════════════════════════════════════════════╗
║     GUIDE D'INSTALLATION POUR FRITZ 20 - CHESS PERSONA        ║
╚════════════════════════════════════════════════════════════════╝

📦 FICHIERS NÉCESSAIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. AvatarEngine.exe       - Le moteur d'échecs personnalisé
2. stockfish.exe          - Le moteur Stockfish (v16+)
3. profile.json           - Votre profil généré sur le site
4. install_fritz20.bat    - Script d'installation automatique
5. configure_level.bat    - Script d'ajustement du niveau

🚀 INSTALLATION RAPIDE (RECOMMANDÉE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Placez TOUS les fichiers dans le même dossier

2. Clic droit sur install_fritz20.bat
   → "Exécuter en tant qu'administrateur"

3. Suivez les instructions à l'écran

4. Ouvrez Fritz 20 :
   - Menu "Moteur" > "Créer un moteur UCI..."
   - Sélectionnez : Documents\ChessBase\Engines\MonAvatar\AvatarEngine.exe
   - Cliquez sur OK

5. C'est prêt ! 🎉

⚙️ CONFIGURATION DU NIVEAU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour ajuster la difficulté :

1. Double-cliquez sur configure_level.bat
2. Choisissez un niveau (1-5)
3. Redémarrez Fritz 20

Niveaux disponibles :
  1 = Débutant       (ELO ~1200) - Idéal pour apprendre
  2 = Intermédiaire  (ELO ~1500) - Challenge modéré
  3 = Avancé         (ELO ~1800) - Pour joueurs expérimentés
  4 = Expert         (ELO ~2100) - Très difficile
  5 = Grand Maître   (ELO ~2400+) - Maximum

📊 PARAMÈTRES UCI (Configuration Manuelle)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dans Fritz 20, vous pouvez ajuster ces paramètres UCI :

┌─────────────┬──────────┬────────────────────────────────┐
│ Paramètre   │ Plage    │ Description                    │
├─────────────┼──────────┼────────────────────────────────┤
│ Threads     │ 1-8      │ Nombre de cœurs CPU utilisés   │
│ Hash        │ 16-2048  │ Mémoire (MB) pour les calculs  │
│ Depth       │ 8-20     │ Profondeur de recherche        │
│ Move Time   │ 100-5000 │ Temps par coup (millisecondes) │
│ Contempt    │ -100-100 │ Aversion pour les nulles       │
└─────────────┴──────────┴────────────────────────────────┘

💡 CONSEILS PRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Le moteur joue selon le style détecté dans votre profile.json
✓ Pour un style plus agressif, augmentez le paramètre "Aggressiveness"
✓ Pour des parties plus rapides, réduisez "Move Time"
✓ Plus de Threads = Calculs plus rapides (mais plus de CPU utilisé)

🎮 STYLES DE JEU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le moteur adapte son style selon votre profil :

🗡️  AGRESSIF     - Attaques rapides, sacrifices audacieux
🛡️  SOLIDE       - Jeu positionnel, défense robuste
⚖️  ÉQUILIBRÉ    - Mixte, adaptatif
🎯 POSITIONNEL  - Contrôle du centre, développement
⚡ TACTIQUE     - Combinaisons, pièges tactiques

🔧 DÉPANNAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Le moteur ne démarre pas
   → Vérifiez que les 3 fichiers (AvatarEngine.exe, stockfish.exe, 
     profile.json) sont dans le même dossier

❌ Erreur "UCI protocol error"
   → Téléchargez la dernière version de Stockfish (v16+)
   → Lien : https://stockfishchess.org/download/

❌ Le moteur joue trop lentement
   → Augmentez le paramètre Threads (2 ou 4)
   → Réduisez la profondeur (Depth)

❌ Le moteur joue trop rapidement
   → Augmentez "Move Time" dans les paramètres UCI

❌ Le style ne correspond pas à mes attentes
   → Régénérez votre profile.json avec plus de parties
   → Minimum recommandé : 15-20 parties

❌ Fritz 20 ne trouve pas le moteur
   → Vérifiez le chemin : %USERPROFILE%\Documents\ChessBase\Engines\MonAvatar
   → Réinstallez avec install_fritz20.bat

📧 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour toute question ou problème :
→ Consultez le guide en ligne sur le site ChessPersona
→ Vérifiez que vous utilisez les dernières versions

📁 STRUCTURE DES DOSSIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Après installation, vos fichiers seront ici :

C:\Users\[VotreNom]\Documents\ChessBase\Engines\MonAvatar\
├── AvatarEngine.exe     (Moteur principal)
├── stockfish.exe        (Moteur de base)
├── profile.json         (Votre profil)
└── engine.ini           (Configuration)

🎯 COMMENCER À JOUER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Lancez Fritz 20
2. Cliquez sur "Nouvelle Partie"
3. Sélectionnez votre avatar dans la liste des moteurs
4. Choisissez votre couleur (Blancs/Noirs)
5. Cliquez sur "Démarrer"
6. Amusez-vous bien ! ♟️

═══════════════════════════════════════════════════════════════════
Version 2.0 - Décembre 2024
Compatible : Fritz 18, 19, 20, ChessBase, Arena
═══════════════════════════════════════════════════════════════════
