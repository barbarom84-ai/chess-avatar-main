# 🚀 Déploiement Rapide - Chess Avatar

## 🎯 Option 1 : Vercel CLI (SANS GIT) - **RECOMMANDÉ POUR VOUS**

Puisque Git n'est pas installé sur votre système, cette méthode est la plus simple.

### Étape 1 : Installer Vercel CLI

Ouvrez PowerShell dans votre dossier projet :

```powershell
cd "c:\Users\marco\Cursor Workplace\chess-persona"
npm install -g vercel
```

### Étape 2 : Tester que le Build Fonctionne

```powershell
npm run build
```

Si tout est vert ✅, continuez !

### Étape 3 : Se Connecter à Vercel

```powershell
vercel login
```

**Choisissez** : `Email` ou `GitHub` (recommandé)

Si vous choisissez Email :
1. Entrez votre email
2. Vérifiez votre boîte mail
3. Cliquez sur le lien de confirmation

### Étape 4 : Déployer pour la Première Fois

```powershell
vercel
```

**Répondez aux questions** :

| Question | Réponse |
|----------|---------|
| Set up and deploy? | `Y` (Oui) |
| Which scope? | Sélectionnez votre compte |
| Link to existing project? | `N` (Non) |
| What's your project's name? | `chess-persona` (ou autre nom) |
| In which directory is your code located? | `.` (laisser par défaut, appuyez sur Entrée) |
| Want to override the settings? | `N` (Non) |

⏳ **Attendez 2-3 minutes...**

🎉 **Votre site est déployé !** Vous recevrez une URL de preview.

### Étape 5 : Configurer Supabase

#### A. Ajouter les Variables d'Environnement

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```
**Entrez** : `https://votre-projet.supabase.co` (votre URL Supabase)

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```
**Entrez** : `votre-clé-anonyme-supabase`

**Où trouver ces valeurs ?**
1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. **Settings** → **API**
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### B. Redéployer en Production

```powershell
vercel --prod
```

🎉 **Votre site est maintenant en ligne avec Supabase configuré !**

### Étape 6 : Configurer Supabase pour Accepter votre Domaine

1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. **Authentication** → **URL Configuration**
4. Dans **"Site URL"**, ajoutez :
   ```
   https://chess-persona-xxx.vercel.app
   ```
   (Remplacez par votre vraie URL Vercel)
5. Dans **"Redirect URLs"**, ajoutez :
   ```
   https://chess-persona-xxx.vercel.app/*
   ```
6. Cliquez sur **"Save"**

---

## ✅ C'est Fini !

Votre site est maintenant en ligne ! 🌍

**URL de votre site** : Copiez l'URL affichée par Vercel (du type `https://chess-persona-xxx.vercel.app`)

---

## 🔄 Mises à Jour Futures

Chaque fois que vous modifiez votre code :

```powershell
cd "c:\Users\marco\Cursor Workplace\chess-persona"
vercel --prod
```

C'est tout ! Vercel redéploie automatiquement.

---

## 🎯 Option 2 : Avec Git + GitHub (Si vous installez Git)

### Installer Git

1. Téléchargez Git : [git-scm.com/download/win](https://git-scm.com/download/win)
2. Installez-le (tout par défaut)
3. Redémarrez PowerShell

### Puis suivez ces étapes

```powershell
cd "c:\Users\marco\Cursor Workplace\chess-persona"

# Initialiser Git
git init
git add .
git commit -m "Initial commit - Chess Avatar"

# Créer un dépôt sur GitHub (faites-le manuellement sur github.com)
# Puis :
git remote add origin https://github.com/VOTRE-USERNAME/chess-persona.git
git push -u origin main
```

### Déployer sur Vercel avec GitHub

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec **GitHub**
3. **Add New Project** → **Import Git Repository**
4. Sélectionnez `chess-persona`
5. Ajoutez les variables d'environnement Supabase
6. **Deploy**

**Avantage** : Chaque `git push` déploie automatiquement ! 🚀

---

## 🧪 Tester Votre Site Déployé

### 1. Analyse de Profil
- Essayez d'analyser un profil Chess.com ou Lichess
- Vérifiez que les statistiques s'affichent

### 2. Sauvegarde de Partie
- Jouez une partie contre le bot
- Sauvegardez-la
- Vérifiez qu'elle apparaît dans Supabase

### 3. Téléchargement du Moteur
- Téléchargez `AvatarEngine.py`
- Vérifiez que le fichier est correct

### 4. Guide d'Installation
- Consultez le guide d'installation
- Téléchargez `install_engine.bat`
- Vérifiez que les liens fonctionnent

---

## 🐛 Problèmes Courants

### "Build failed" sur Vercel

**Solution** :
```powershell
npm run build
```
Si ça échoue localement, corrigez les erreurs TypeScript/ESLint avant de redéployer.

---

### Supabase ne fonctionne pas

**Vérifications** :
1. Variables d'environnement bien configurées sur Vercel
2. URL Vercel ajoutée dans Supabase (Authentication → URL Configuration)
3. Les clés Supabase sont correctes

---

### Les fichiers `.bat` ne se téléchargent pas

**Cause** : Les fichiers dans `/public` sont automatiquement servis par Next.js.

**Test** : Visitez `https://votre-site.vercel.app/install_engine.bat`

Si ça ne fonctionne pas :
1. Vérifiez que les fichiers sont bien dans `/public`
2. Redéployez avec `vercel --prod`

---

## 📊 Surveiller Votre Site

### Dashboard Vercel

1. Allez sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Consultez :
   - **Deployments** : Historique des déploiements
   - **Analytics** : Visites et performance
   - **Settings** : Configuration

### Logs en Temps Réel

```powershell
vercel logs
```

---

## 🎨 Domaine Personnalisé (Optionnel)

### Sous-domaine Vercel (Gratuit)

1. Dashboard Vercel → Votre projet
2. **Settings** → **Domains**
3. Ajoutez : `mon-bot-echecs.vercel.app`

### Votre Propre Domaine

Si vous avez acheté un domaine (ex: `monbot.com`) :
1. Dashboard Vercel → Votre projet
2. **Settings** → **Domains**
3. Ajoutez votre domaine
4. Suivez les instructions DNS

---

## 🚀 Commandes Utiles

```powershell
# Déploiement en production
vercel --prod

# Voir les logs
vercel logs

# Voir les variables d'environnement
vercel env ls

# Ouvrir le dashboard
vercel

# Voir l'aide
vercel --help
```

---

## 📝 Checklist Avant Publication

- [ ] `npm run build` fonctionne sans erreurs
- [ ] Supabase configuré (URL + clé)
- [ ] Test local réussi (`npm run dev`)
- [ ] Variables d'environnement ajoutées sur Vercel
- [ ] URL Vercel ajoutée dans Supabase
- [ ] Test de toutes les fonctionnalités sur le site déployé
- [ ] Fichiers `.bat` téléchargeables

---

## 🎉 Félicitations !

Votre site **Chess Avatar** est maintenant **en ligne** ! 🌍♟️

Partagez l'URL avec vos amis et profitez-en ! 🚀

---

**Dernière mise à jour** : 2025-12-12
**Support** : Si vous rencontrez un problème, consultez les [Vercel Docs](https://vercel.com/docs)
