# ☁️ Sauvegarde Cloud avec Supabase

## 🎯 Vue d'Ensemble

La fonctionnalité **Sauvegarde Cloud** permet de :
- 🔐 S'authentifier avec email/mot de passe
- ☁️ Sauvegarder les profils dans le cloud
- 🔄 Synchroniser entre plusieurs appareils
- 📚 Accéder à une bibliothèque de profils publics
- 🤝 Partager ses configurations

## ✨ Fonctionnalités

### 1. 🔐 Authentification

#### Inscription
- Email + mot de passe (min 6 caractères)
- Compte créé instantanément
- Aucune confirmation email requise (dev mode)

#### Connexion
- Email + mot de passe
- Session maintenue automatiquement
- Déconnexion sécurisée

### 2. ☁️ Sauvegarde Cloud

#### Depuis PersonaCard
1. Après l'analyse d'un profil
2. Cliquez sur le bouton **"Cloud"** (cyan)
3. Connexion automatique si pas authentifié
4. Profil sauvegardé instantanément

#### Visibilité
- **Privé** par défaut
- **Public** : Visible dans la bibliothèque
- Modifiable à tout moment

### 3. 📚 Bibliothèque Publique

Accédez à `/profile` pour :
- Voir vos profils sauvegardés
- Explorer les profils publics
- Rechercher par nom d'utilisateur
- Jouer contre n'importe quel profil
- Télécharger les configurations

### 4. 🔄 Synchronisation

Vos profils sont automatiquement :
- ✅ Sauvegardés dans Supabase PostgreSQL
- ✅ Accessibles depuis n'importe quel appareil
- ✅ Sécurisés par Row Level Security (RLS)
- ✅ Sauvegardés quotidiennement par Supabase

## 🚀 Configuration

### Prérequis
1. Compte Supabase (gratuit)
2. Variables d'environnement configurées

### Étapes

#### 1. Créer un Projet Supabase

```bash
1. Allez sur https://supabase.com
2. Créez un compte
3. Créez un nouveau projet
4. Notez l'URL et la clé API
```

#### 2. Configurer `.env.local`

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_public
```

#### 3. Appliquer les migrations

Utilisez les migrations du dépôt ([`supabase/migrations/`](supabase/migrations/), guide [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md)) :

```bash
supabase db push
```

Chaque nouvelle table doit inclure des **GRANTs Data API** en plus du RLS (voir changelog [tables not exposed automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)). La migration [`20260616120000_data_api_grants.sql`](supabase/migrations/20260616120000_data_api_grants.sql) couvre toutes les tables actuelles.

#### 4. Créer les Tables (exemple minimal)

Dans Supabase Dashboard > SQL Editor, exécutez :

```sql
-- Table des profils
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('lichess', 'chesscom')),
  config JSONB NOT NULL,
  stats JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles viewable by everyone" 
  ON profiles FOR SELECT 
  USING (is_public = true);

CREATE POLICY "Users can view own profiles" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" 
  ON profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
```

#### 5. Redémarrer le Serveur

```bash
npm run dev
```

## 📱 Utilisation

### Sauvegarder un Profil

```typescript
// Option 1 : Bouton dans PersonaCard
// Cliquez sur "Cloud" après l'analyse

// Option 2 : Programmatique
import { saveProfileToCloud } from '@/lib/supabase-storage';

const result = await saveProfileToCloud(config, stats, isPublic);
```

### Récupérer ses Profils

```typescript
import { getUserProfiles } from '@/lib/supabase-storage';

const profiles = await getUserProfiles();
```

### Explorer les Profils Publics

```typescript
import { getPublicProfiles, searchPublicProfiles } from '@/lib/supabase-storage';

// Top 20 profils publics
const publicProfiles = await getPublicProfiles(20);

// Recherche
const results = await searchPublicProfiles('Magnus');
```

### Mettre à Jour un Profil

```typescript
import { updateProfile } from '@/lib/supabase-storage';

// Rendre public/privé
await updateProfile(profileId, { is_public: true });

// Mettre à jour la config
await updateProfile(profileId, { 
  config: newConfig,
  stats: newStats 
});
```

## 🎨 Composants

### AuthModal
Modal d'authentification avec onglets :
- **Connexion** : Email/Password
- **Inscription** : Création de compte
- Gestion des erreurs
- Messages de succès

### UserProfile
Affiche :
- Info utilisateur (email)
- Liste des profils sauvegardés
- Actions : Rendre public/privé, Supprimer
- Bouton de déconnexion

### PublicProfiles
Bibliothèque publique :
- Grille de profils publics
- Barre de recherche
- Actions : Jouer, Télécharger
- Pagination

## 🔒 Sécurité

### Data API grants + Row Level Security (RLS)

**GRANT** contrôle si `anon` / `authenticated` / `service_role` peuvent appeler une table via PostgREST et `supabase-js`. **RLS** contrôle ensuite quelles lignes sont visibles. Les deux sont requis.

Après déploiement, vérifiez **Dashboard → Advisors → Security Advisor** (tables exposées à l’API). Tables réservées au serveur (ex. `community_puzzles`) ne doivent pas avoir de grant `anon` / `authenticated`.

### Row Level Security (RLS)

Toutes les policies garantissent :

✅ **Lecture**
- Utilisateur peut voir SES profils
- Tout le monde peut voir les profils publics

✅ **Écriture**
- Utilisateur peut créer/modifier/supprimer UNIQUEMENT ses profils
- Impossible d'accéder aux profils d'autres utilisateurs

✅ **Isolation**
- Chaque utilisateur est isolé
- Pas d'accès cross-user

### Authentification

- **Tokens JWT** : Sécurisés, côté client
- **Sessions** : Gérées automatiquement
- **Expiration** : Token refresh automatique

## 📊 Structure de Données

### Table `profiles`

```typescript
interface DbProfile {
  id: string;                 // UUID
  user_id: string;           // Référence auth.users
  username: string;          // Pseudo analysé
  platform: 'lichess' | 'chesscom';
  config: EngineConfig;      // Configuration moteur (JSONB)
  stats: PersonaStats;       // Statistiques (JSONB)
  is_public: boolean;        // Visibilité
  created_at: string;        // Date création
  updated_at: string;        // Dernière modif
}
```

## 🎯 Cas d'Usage

### 1. Joueur Casual
```
1. Analyse son profil Lichess
2. Sauvegarde en privé
3. Accède depuis son téléphone
4. Joue contre son clone
```

### 2. Créateur de Contenu
```
1. Analyse plusieurs joueurs célèbres
2. Rend les profils publics
3. Partage le lien /profile
4. Communauté peut jouer contre
```

### 3. Club d'Échecs
```
1. Chaque membre analyse son profil
2. Rend public pour le club
3. Tournoi contre les clones
4. Comparaison des styles
```

## 🐛 Dépannage

### Erreur : "Supabase URL not configured"
```bash
# Vérifiez .env.local
# Redémarrez le serveur dev
npm run dev
```

### Erreur : "Row Level Security"
```sql
-- Vérifiez que RLS est activé
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Recréez les policies si nécessaire
```

### Erreur : `permission denied for table` (42501)
```sql
-- Appliquez la migration des grants ou ajoutez-les à votre CREATE TABLE
-- Voir supabase/migrations/20260616120000_data_api_grants.sql
```

### Erreur : "User not authenticated"
```typescript
// Vérifiez l'authentification
import { isAuthenticated } from '@/lib/supabase-storage';
const auth = await isAuthenticated();
console.log('Authenticated:', auth);
```

### Profils ne s'affichent pas
```typescript
// Vérifiez la connexion
import { supabase } from '@/lib/supabase';
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data, 'Error:', error);
```

## 📈 Limites & Quotas

### Plan Gratuit Supabase
- ✅ **500 MB** de stockage
- ✅ **2 GB** de bande passante/mois
- ✅ **50 000** requêtes/mois
- ✅ **Illimité** d'utilisateurs authentifiés
- ✅ **Sauvegardes** automatiques

### Optimisations
- Profils stockés en JSONB (compact)
- Index sur les recherches fréquentes
- Cache côté client (localStorage + cloud)

## 🔮 Évolutions Futures

### Court Terme
- [ ] Mode hors ligne avec sync
- [ ] Upload d'avatars personnalisés
- [ ] Tags et catégories
- [ ] Favoris/Bookmarks

### Long Terme
- [ ] Commentaires sur les profils
- [ ] Notation/Reviews
- [ ] Collections de profils
- [ ] API publique

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Auth Helpers](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Securing your API (GRANT + RLS)](https://supabase.com/docs/guides/api/securing-your-api)
- [Migrations checklist](supabase/MIGRATIONS.md)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

## 💡 Conseils

### Performance
- Utilisez `select('*')` avec parcimonie
- Préférez `select('id, username, config')`
- Limitez les résultats avec `.limit()`

### Sécurité
- Ne jamais exposer les clés service (côté serveur uniquement)
- Toujours utiliser la clé anon publique (côté client)
- RLS est votre première ligne de défense

### UX
- Feedback immédiat (toasts/alerts)
- Loading states clairs
- Gestion d'erreurs explicite

---

**Version** : 4.0  
**Date** : Décembre 2024  
**Auteur** : Chess Avatar Creator Team
