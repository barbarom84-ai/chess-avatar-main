# Guide de Dépannage Supabase 🔧

Ce document vous aide à résoudre les problèmes courants avec Supabase.

---

## 🚨 Problème : "Erreur lors de la sauvegarde: {}"

### Symptômes
Quand vous cliquez sur le bouton "Cloud", vous voyez :
```
❌ Erreur lors de la sauvegarde
Console: Erreur lors de la sauvegarde: {}
```

### Causes Possibles

#### 1. 🔑 Variables d'Environnement Non Configurées

**Vérification** :
```bash
# Dans le terminal, vérifiez que le fichier .env.local existe
ls -la .env.local
```

**Solution** :
Créez un fichier `.env.local` à la racine du projet avec :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anonyme
```

**Obtenir vos clés** :
1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Settings → API
4. Copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**⚠️ IMPORTANT** : Après avoir créé `.env.local`, **REDÉMARREZ** le serveur Next.js :
```bash
# Arrêter (Ctrl+C)
# Puis relancer
npm run dev
```

---

#### 2. 🗄️ Table `profiles` Non Créée

**Vérification** :
1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Table Editor → Vérifiez si la table `profiles` existe

**Solution** :
Si la table n'existe pas, créez-la avec ce SQL :

```sql
-- Créer la table profiles
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('lichess', 'chesscom')) NOT NULL,
  config JSONB NOT NULL,
  stats JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_is_public ON profiles(is_public);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres profils
CREATE POLICY "Users can view own profiles"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent insérer leurs propres profils
CREATE POLICY "Users can insert own profiles"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent modifier leurs propres profils
CREATE POLICY "Users can update own profiles"
ON profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres profils
CREATE POLICY "Users can delete own profiles"
ON profiles FOR DELETE
USING (auth.uid() = user_id);

-- Politique: Tout le monde peut voir les profils publics
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (is_public = true);

-- Trigger pour mettre à jour updated_at
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
```

**Exécution** :
1. Dashboard Supabase → SQL Editor
2. Collez le SQL ci-dessus
3. Cliquez sur "Run"

---

#### 3. 🔐 Problème d'Authentification

**Vérification** :
Dans la console du navigateur (F12), vérifiez :
```javascript
// L'utilisateur est-il connecté ?
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

**Solution** :
Si `user` est `null` :
1. Cliquez sur "Mon Profil"
2. Cliquez sur "Se Connecter"
3. Créez un compte ou connectez-vous
4. Réessayez de sauvegarder

---

#### 4. 🚫 Politique RLS Trop Restrictive

**Vérification** :
Dashboard Supabase → Authentication → Policies → Table `profiles`

**Solution** :
Assurez-vous que les politiques suivantes existent :
- ✅ "Users can insert own profiles" (INSERT)
- ✅ "Users can view own profiles" (SELECT)
- ✅ "Users can update own profiles" (UPDATE)
- ✅ "Users can delete own profiles" (DELETE)

Si elles manquent, ajoutez-les avec le SQL ci-dessus (section 2).

---

#### 5. 📧 Email Non Confirmé

**Vérification** :
Dashboard Supabase → Authentication → Users → Vérifiez la colonne "Email Confirmed"

**Solution** :
Si l'email n'est pas confirmé :

**Option 1 - En développement** :
1. Dashboard Supabase
2. Authentication → Users
3. Cliquez sur l'utilisateur
4. Cochez "Email Confirmed"
5. Sauvegardez

**Option 2 - En production** :
1. L'utilisateur doit cliquer sur le lien dans l'email de confirmation
2. Si l'email n'est pas arrivé, renvoyer l'email :
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: 'user@example.com'
});
```

---

#### 6. 🌐 CORS ou Politique de Domaine

**Vérification** :
Dashboard Supabase → Settings → API → Site URL

**Solution** :
Ajoutez votre URL de développement :
- `http://localhost:3000`
- `http://127.0.0.1:3000`

Et pour la production :
- `https://votre-domaine.com`

---

## 🔍 Diagnostic Étape par Étape

### Étape 1 : Vérifier la Configuration

```bash
# Vérifier que .env.local existe
cat .env.local

# Devrait afficher :
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Si le fichier n'existe pas ou est vide → **Voir section 1**

### Étape 2 : Vérifier la Connexion

Ouvrez la console du navigateur (F12) et tapez :
```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

Si `undefined` → Redémarrez le serveur Next.js

### Étape 3 : Vérifier l'Authentification

Dans la console :
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Authenticated user:', user);
```

Si `null` → **Voir section 3**

### Étape 4 : Tester Manuellement l'Insertion

Dans la console :
```javascript
const { data, error } = await supabase
  .from('profiles')
  .insert({
    user_id: user.id,
    username: 'test',
    platform: 'lichess',
    config: {},
    stats: {},
    is_public: false
  })
  .select();

console.log('Insert result:', { data, error });
```

Si `error` n'est pas `null`, lisez le message d'erreur :
- **"table does not exist"** → **Voir section 2**
- **"new row violates row-level security"** → **Voir section 4**
- **"permission denied"** → **Voir section 4**

### Étape 5 : Vérifier les Logs Supabase

Dashboard Supabase → Logs → Explorer

Regardez les erreurs récentes (dernières minutes)

---

## 🛠️ Outils de Diagnostic

### Script de Test

Créez un fichier `test-supabase.ts` :

```typescript
import { supabase, isSupabaseConfigured } from './lib/supabase';

async function testSupabase() {
  console.log('=== Test Supabase ===');
  
  // 1. Configuration
  console.log('1. Configured:', isSupabaseConfigured);
  
  if (!isSupabaseConfigured) {
    console.error('❌ Supabase non configuré');
    return;
  }
  
  // 2. Authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('2. User:', user?.id, authError ? `Error: ${authError.message}` : '✅');
  
  if (!user) {
    console.error('❌ Non authentifié');
    return;
  }
  
  // 3. Test de lecture
  const { data: profiles, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id);
  
  console.log('3. Select:', selectError ? `Error: ${selectError.message}` : `✅ ${profiles?.length} profils`);
  
  // 4. Test d'insertion
  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      username: 'test_' + Date.now(),
      platform: 'lichess',
      config: { test: true },
      stats: { test: true },
      is_public: false
    })
    .select();
  
  console.log('4. Insert:', insertError ? `Error: ${insertError.message}` : `✅ ID: ${inserted?.[0]?.id}`);
  
  // 5. Nettoyage
  if (inserted?.[0]?.id) {
    await supabase.from('profiles').delete().eq('id', inserted[0].id);
    console.log('5. Cleanup: ✅');
  }
}

testSupabase();
```

Exécutez :
```bash
npx tsx test-supabase.ts
```

---

## 📋 Checklist Complète

- [ ] Variables d'environnement configurées dans `.env.local`
- [ ] Serveur Next.js redémarré après la configuration
- [ ] Table `profiles` créée dans Supabase
- [ ] Politiques RLS configurées correctement
- [ ] Utilisateur connecté via l'interface
- [ ] Email confirmé (si requis)
- [ ] URLs autorisées dans les paramètres Supabase
- [ ] Console du navigateur sans erreur CORS
- [ ] Test manuel d'insertion réussi

---

## 💡 Messages d'Erreur Courants

### "table does not exist"
→ **Solution** : Créez la table (voir section 2)

### "new row violates row-level security"
→ **Solution** : Vérifiez les politiques RLS (voir section 4)

### "Utilisateur non authentifié"
→ **Solution** : Connectez-vous via "Mon Profil" (voir section 3)

### "Supabase non configuré"
→ **Solution** : Ajoutez les variables d'environnement (voir section 1)

### "permission denied for table profiles"
→ **Solution** : Vérifiez les politiques RLS (voir section 4)

### "invalid input syntax for type json"
→ **Solution** : Vérifiez que `config` et `stats` sont des objets JSON valides

---

## 🆘 Besoin d'Aide ?

1. **Logs détaillés activés** : Les nouvelles erreurs affichent plus de détails
2. **Console du navigateur** : F12 → Console → Regardez les messages
3. **Logs Supabase** : Dashboard → Logs
4. **Documentation** : Consultez `SUPABASE_SETUP.md` et `SUPABASE_CLOUD.md`

---

## ✅ Après Résolution

Une fois le problème résolu, vous devriez voir :
```
✅ Profil sauvegardé dans le cloud avec succès !
```

Et dans votre Dashboard Supabase :
- Table Editor → `profiles` → Nouvelle ligne ajoutée

---

**Dernière mise à jour** : 12 Décembre 2025  
**Version** : 1.4.1
