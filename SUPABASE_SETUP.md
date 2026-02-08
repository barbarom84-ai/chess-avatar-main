# 🔐 Configuration Supabase

## 📋 Étapes de Configuration

### 1. Créer un Compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Notez l'URL et la clé API

### 2. Configurer les Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

### 3. Créer les Tables

Exécutez ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Table des profils de moteurs
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

-- Index pour les recherches
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
-- Tout le monde peut voir les profils publics
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (is_public = true);

-- Les utilisateurs peuvent voir leurs propres profils
CREATE POLICY "Users can view own profiles" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs propres profils
CREATE POLICY "Users can insert own profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent modifier leurs propres profils
CREATE POLICY "Users can update own profiles" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres profils
CREATE POLICY "Users can delete own profiles" 
  ON profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 4. Configurer l'Authentification

Dans Supabase Dashboard > Authentication > Settings :

1. **Activer Email Auth** : ON
2. **Confirm email** : OFF (pour dev, ON en prod)
3. **Enable email confirmations** : OFF (pour dev)

### 5. Tester la Configuration

```typescript
import { supabase } from '@/lib/supabase';

// Test de connexion
const { data, error } = await supabase.auth.getSession();
console.log('Connected:', !error);
```

## 🔒 Sécurité (Row Level Security)

Les policies RLS garantissent :
- ✅ Utilisateurs peuvent voir/modifier UNIQUEMENT leurs propres profils
- ✅ Tout le monde peut voir les profils publics
- ✅ Profils privés restent privés
- ❌ Pas d'accès non autorisé

## 📊 Structure de la Base de Données

### Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `user_id` | UUID | Référence à auth.users |
| `username` | TEXT | Pseudo analysé |
| `platform` | TEXT | 'lichess' ou 'chesscom' |
| `config` | JSONB | Configuration moteur |
| `stats` | JSONB | Statistiques du joueur |
| `is_public` | BOOLEAN | Visible publiquement |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Dernière modification |

## 🚀 Utilisation

### Sauvegarder un Profil

```typescript
import { saveProfileToCloud } from '@/lib/supabase-storage';

const profile = await saveProfileToCloud(config, stats, true);
```

### Récupérer ses Profils

```typescript
import { getUserProfiles } from '@/lib/supabase-storage';

const profiles = await getUserProfiles();
```

### Profils Publics

```typescript
import { getPublicProfiles } from '@/lib/supabase-storage';

const publicProfiles = await getPublicProfiles(10);
```

## 🔄 Migration des Données Locales

Pour migrer vos profils localStorage vers Supabase :

```typescript
import { migrateLo calToCloud } from '@/lib/supabase-storage';

await migrateLocalToCloud();
```

## 🐛 Dépannage

### Erreur : "Invalid API key"
- Vérifiez `.env.local`
- Redémarrez le serveur dev

### Erreur : "Row Level Security"
- Vérifiez que les policies sont créées
- Vérifiez que l'utilisateur est authentifié

### Erreur : "relation does not exist"
- Exécutez le SQL de création des tables
- Vérifiez le nom de la table

## 📝 Notes

- **Gratuit** : 500 MB de stockage, 2 GB de bande passante/mois
- **Évolutif** : Passe automatiquement à l'échelle
- **Backup** : Sauvegardes automatiques quotidiennes
- **Real-time** : Support WebSocket pour mises à jour en temps réel

---

**Documentation Supabase** : https://supabase.com/docs
