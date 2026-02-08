# 🚀 Guide de Déploiement - Chess Avatar

## 📋 Préparation

### 1. Vérifier que le Build Fonctionne

```bash
npm run build
```

Si des erreurs apparaissent, corrigez-les avant de continuer.

---

## 🌐 Méthode 1 : Déploiement avec Git + Vercel (Recommandé)

Cette méthode permet des **déploiements automatiques** à chaque modification.

### Étape 1 : Initialiser Git

```bash
git init
git add .
git commit -m "Initial commit - Chess Avatar"
```

### Étape 2 : Créer un Dépôt GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur **"New repository"**
3. Nom : `chess-persona` (ou autre)
4. **Public** ou **Private** (au choix)
5. **Ne cochez rien** (pas de README, .gitignore, etc.)
6. Cliquez sur **"Create repository"**

### Étape 3 : Pousser le Code vers GitHub

Remplacez `VOTRE-USERNAME` par votre nom d'utilisateur GitHub :

```bash
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/chess-persona.git
git push -u origin main
```

### Étape 4 : Créer un Compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec **GitHub**
4. Autorisez Vercel à accéder à vos dépôts

### Étape 5 : Importer le Projet

1. Sur le dashboard Vercel, cliquez sur **"Add New Project"**
2. Sélectionnez **"Import Git Repository"**
3. Trouvez votre dépôt `chess-persona`
4. Cliquez sur **"Import"**

### Étape 6 : Configurer les Variables d'Environnement

⚠️ **IMPORTANT : Configurer Supabase**

Dans la section **"Environment Variables"** :

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://votre-projet.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `votre-clé-anonyme-supabase` |

**Où trouver ces valeurs ?**
1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. **Settings** → **API**
4. Copiez `Project URL` et `anon` key

### Étape 7 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 2-3 minutes
3. 🎉 **Votre site est en ligne !**

Vous recevrez une URL du type : `https://chess-persona-xxx.vercel.app`

---

## ⚡ Méthode 2 : Déploiement Rapide avec Vercel CLI (Sans Git)

Si vous ne voulez pas utiliser Git pour l'instant.

### Étape 1 : Installer Vercel CLI

```bash
npm install -g vercel
```

### Étape 2 : Se Connecter à Vercel

```bash
vercel login
```

Suivez les instructions pour vous connecter (email ou GitHub).

### Étape 3 : Déployer

```bash
cd "c:\Users\marco\Cursor Workplace\chess-persona"
vercel
```

**Répondez aux questions** :
- **Set up and deploy?** → `Y` (Yes)
- **Which scope?** → Sélectionnez votre compte
- **Link to existing project?** → `N` (No)
- **What's your project's name?** → `chess-persona`
- **In which directory is your code located?** → `.` (laisser par défaut)
- **Want to override settings?** → `N` (No)

### Étape 4 : Configurer Supabase

Après le premier déploiement :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
```
Entrez : `https://votre-projet.supabase.co`

```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Entrez : `votre-clé-anonyme-supabase`

### Étape 5 : Redéployer avec les Variables

```bash
vercel --prod
```

🎉 **Votre site est en ligne !**

---

## 🔒 Configurer Supabase pour la Production

### 1. Autoriser le Domaine Vercel

1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. **Authentication** → **URL Configuration**
4. Ajoutez votre URL Vercel dans **"Site URL"** :
   ```
   https://chess-persona-xxx.vercel.app
   ```
5. Ajoutez aussi dans **"Redirect URLs"** :
   ```
   https://chess-persona-xxx.vercel.app/*
   ```

### 2. Tester la Connexion

1. Visitez votre site déployé
2. Essayez de sauvegarder une partie
3. Vérifiez que les données apparaissent dans Supabase

---

## 📝 Fichiers à Vérifier Avant Déploiement

### 1. `.gitignore` (si vous utilisez Git)

Vérifiez que ces fichiers sont ignorés :

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### 2. `.env.local` (Local uniquement)

⚠️ **NE JAMAIS COMMITER CE FICHIER**

Ce fichier reste sur votre machine locale. Les variables d'environnement pour la production sont configurées sur Vercel.

---

## 🎨 Domaine Personnalisé (Optionnel)

### Avec Vercel (Gratuit)

1. Sur le dashboard Vercel, sélectionnez votre projet
2. **Settings** → **Domains**
3. Ajoutez un domaine personnalisé :
   - Sous-domaine Vercel gratuit : `mon-bot-echecs.vercel.app`
   - Votre propre domaine : `monbot.com` (nécessite d'acheter un domaine)

---

## 🔄 Mises à Jour Automatiques

### Avec Git + Vercel (Méthode 1)

Chaque fois que vous modifiez votre code :

```bash
git add .
git commit -m "Description des modifications"
git push
```

→ **Vercel déploie automatiquement** en 2-3 minutes ! 🚀

### Avec Vercel CLI (Méthode 2)

```bash
vercel --prod
```

---

## 📊 Surveillance et Analytics

### 1. Analytics Vercel (Gratuit)

1. Dashboard Vercel → Votre projet
2. **Analytics** → Voir les visites, performance, etc.

### 2. Web Vitals

Vercel surveille automatiquement :
- Temps de chargement
- Interactivité
- Stabilité visuelle

---

## 🐛 Dépannage

### Erreur : "Build Failed"

**Causes possibles** :
- Erreurs TypeScript
- Import manquant
- Variables d'environnement manquantes

**Solution** :
1. Testez localement : `npm run build`
2. Corrigez les erreurs
3. Redéployez

---

### Erreur : "Supabase not working"

**Causes possibles** :
- Variables d'environnement non définies
- URL Vercel non autorisée dans Supabase

**Solution** :
1. Vérifiez les variables sur Vercel : **Settings** → **Environment Variables**
2. Ajoutez l'URL dans Supabase : **Authentication** → **URL Configuration**

---

### Erreur : "API Routes not working"

**Solution** :
Vérifiez que vos routes API sont dans `app/api/` et non `pages/api/` (vous utilisez App Router).

---

## 🎯 Checklist de Déploiement

Avant de publier :

- [ ] `npm run build` fonctionne sans erreurs
- [ ] Variables d'environnement Supabase configurées sur Vercel
- [ ] URL Vercel ajoutée dans Supabase
- [ ] Test de sauvegarde de partie fonctionnel
- [ ] Test de l'analyse de profil Chess.com/Lichess
- [ ] Test du téléchargement de `AvatarEngine.py`
- [ ] `.env.local` n'est PAS commité (seulement pour Git)

---

## 🚀 Commandes Rapides

### Déploiement Initial (Git)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/chess-persona.git
git push -u origin main
```
Puis importer sur Vercel.

### Déploiement Initial (CLI)
```bash
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Mise à Jour (Git)
```bash
git add .
git commit -m "Update"
git push
```

### Mise à Jour (CLI)
```bash
vercel --prod
```

---

## 🎉 Félicitations !

Votre site **Chess Avatar** est maintenant en ligne et accessible au monde entier ! 🌍♟️

**URL de votre site** : `https://votre-projet.vercel.app`

Partagez-le avec vos amis, testez-le, et profitez-en ! 🎮

---

**Dernière mise à jour** : 2025-12-12
