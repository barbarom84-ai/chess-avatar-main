# Monitoring — Chess Avatar

Guide d’observabilité (ops, produit, live). Complète [DEPLOIEMENT_GUIDE.md](DEPLOIEMENT_GUIDE.md).

## Phase 0 — Dashboards sans code

### Vercel (projet chessavatar)

1. **Settings → Analytics** : activer **Web Analytics**.
2. **Settings → Speed Insights** : activer **Speed Insights**.
3. **Deployments → Logs** : filtrer `status:5xx` ou routes `/api/`.
4. *(Option Pro)* **Log Drains** → [Better Stack](https://betterstack.com) ou [Axiom](https://axiom.co) pour alertes sur logs.

Le code inclut `@vercel/analytics` et `@vercel/speed-insights` dans le layout ; les métriques apparaissent une fois activés sur le projet Vercel.

### Supabase — requêtes SQL utiles

Exécuter dans **SQL Editor** :

```sql
-- Parties PvP en cours
SELECT id, white_user_id, black_user_id, created_at, updated_at
FROM public.pvp_games
WHERE status = 'playing'
ORDER BY updated_at DESC;

-- Lobbies en attente (24 h)
SELECT id, white_display_name, time_preset, created_at
FROM public.pvp_games
WHERE status = 'waiting'
  AND black_user_id IS NULL
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Parties bot (arena) — dernières 24 h
SELECT count(*) AS games_24h
FROM public.games
WHERE created_at > now() - interval '24 hours';

-- PvP terminées — dernières 24 h
SELECT count(*) AS pvp_finished_24h
FROM public.pvp_games
WHERE status = 'finished'
  AND updated_at > now() - interval '24 hours';

-- Événements produit (après migration activity_events)
SELECT event_name, count(*) AS n
FROM public.activity_events
WHERE created_at > now() - interval '24 hours'
GROUP BY event_name
ORDER BY n DESC;

-- Abonnements actifs premium / super
SELECT plan, count(*) AS n
FROM public.subscriptions
WHERE status = 'active'
GROUP BY plan;
```

### Stripe

Dashboard → **Payments**, **Subscriptions**, **Webhooks** (échecs sur `checkout.session.completed`).

---

## Variables d’environnement

Voir [.env.example](.env.example). En production, définir sur **Vercel → Project → Environment Variables**.

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | Erreurs client + serveur |
| `SENTRY_AUTH_TOKEN` | Upload source maps (CI / build) |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Build Sentry |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics produit (EU) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` |

Sans clés, l’app fonctionne ; Sentry / PostHog restent désactivés.

---

## Dashboard admin live

- URL : **`/admin/ops`** (compte **super** actif, même rôle que `/learn/admin`).
- Lien **Ops** dans la barre de navigation (desktop, mobile et menu utilisateur) — visible uniquement pour les comptes super.
- Présence Realtime, PvP live, flux `activity_events`, agrégats 24 h.

---

## Phase 3 — Alertes recommandées

Configurer dans les dashboards (pas dans le repo) :

### Sentry

- Alerte **Issues** : nouvelle erreur sur `POST /api/coach/explain`, `/api/stripe/webhook`.
- Alerte **Spike** : taux 5xx > seuil sur 5 min.
- Projet : région **EU** si disponible ; `sendDefaultPii: false` (déjà dans la config).

### PostHog

- Insight : funnel `checkout_started` → `premium_activated`.
- Alerte : chute > 50 % des `game_started` sur 7 j vs baseline.

### Santé HTTP

- **Better Uptime** / **Checkly** : `GET https://chessavatar.net/api/health` toutes les 5 min (attendu `200`, `status: ok`).

### Supabase

- Alertes **Database** (connexions, CPU) et **Realtime** (connexions actives).

---

## Conformité

- PostHog : hébergement EU ; pas de PGN complet ni email dans les propriétés d’événements.
- `activity_events` : rétention recommandée 90 j (cron Supabase optionnel, voir migration).
- Consentement cookies si session replay PostHog activé en production.
