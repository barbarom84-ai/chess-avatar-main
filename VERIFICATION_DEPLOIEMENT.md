# Vérification : Local vs Version Web

## Comment vérifier que la version déployée = version locale

### 1. Vérifier l'identifiant de build

Sur le site déployé :
1. Clic droit → **Afficher le code source de la page** (ou Ctrl+U)
2. Rechercher `data-build=`
3. Vous devez voir : `data-build="2025-01-28-v2"`

- Si vous voyez une **autre valeur** ou **rien** → la version déployée est ancienne.

### 2. Vérifier le comportement des lignes forcées

- **Version correcte** : après 1.e4, le bot joue Nf6 (Défense Alekhine) quand configuré.
- **Version ancienne** : le bot joue un autre coup (ex. Nc6, e6).

### 3. Redéployer correctement

Depuis le dossier du projet (**chess-avatar-main**, pas chess-avatar ou autre) :

```powershell
cd "c:\Users\marco\Cursor Workplace\chess-avatar-main"
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
vercel --prod --force
```

- `--force` : force un nouveau build sur Vercel (pas de cache).

### 4. Vider le cache du navigateur

Après le déploiement : **Ctrl+Shift+R** (ou Cmd+Shift+R) pour recharger sans cache.

### 5. Fichiers critiques pour les lignes forcées

Ces fichiers doivent être à jour dans le déploiement :

| Fichier | Rôle |
|---------|------|
| `hooks/useStockfish.ts` | Logique getBestMove, forcedLine via getEffectiveForcedLine |
| `lib/forced-line-utils.ts` | getEffectiveForcedLine, tri par poids (byWeight) |
| `components/PlayableChessboard.tsx` | Appel getBestMove avec moveHistoryUci |

### 6. Si vous déployez depuis un autre dossier

Vérifiez que vous êtes bien dans **chess-avatar-main** avant `vercel` :

```powershell
cd "c:\Users\marco\Cursor Workplace\chess-avatar-main"
pwd  # doit afficher ...\chess-avatar-main
vercel --prod
```

---

**Dernière mise à jour** : 2025-01-28
