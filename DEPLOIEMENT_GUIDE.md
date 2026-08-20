# Deployment Guide — Chess Avatar

> Quick reference for building, deploying, and maintaining **chessavatar.net**.

---

## 1. Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Type-check + production build
npm run build

# Run production build locally
npm start
```

**Always run `npm run build` before pushing.** It catches TypeScript errors that `npm run dev` may silently skip.

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in real values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (secret) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `STRIPE_PRICE_EUR` | Stripe Dashboard → Products → Price ID (EUR) |
| `STRIPE_PRICE_CHF` | Stripe Dashboard → Products → Price ID (CHF) |
| `STRIPE_PRICE_USD` | Stripe Dashboard → Products → Price ID (USD) |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |

> **Never commit `.env.local`.** It is already in `.gitignore`.

---

## 3. Git Workflow

```bash
# Check status
git status

# Stage & commit
git add .
git commit -m "describe your change"

# Push to GitHub (triggers Vercel auto-deploy)
git push
```

Vercel is connected to the `main` branch. Every push to `main` triggers a production deployment automatically (usually takes 1–2 minutes).

---

## 4. Vercel — Deployment

### First-time setup

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo.
2. Add all environment variables under **Settings → Environment Variables** (see Section 2).
3. Click **Deploy**.

### Environment Variables on Vercel

Add variables at the **Project level**, not Team level:

1. Go to **Vercel Dashboard → your project → Settings → Environment Variables**.
2. Add each variable with scope: **Production**, **Preview**, **Development** (check all three).
3. After adding/changing any variable → **redeploy** for it to take effect.

> **Common pitfall:** A variable added at the Team level is not automatically available to the project. Always add at the Project level.

### Redeploying

If you changed env vars or need a manual redeploy without pushing code:

1. Vercel Dashboard → your project → **Deployments** tab.
2. Click the three-dot menu on the latest deployment → **Redeploy**.

Or via CLI:

```bash
npx vercel --prod
```

**Prod routes are restored in this tree** from git commit `1c57977` (PvP, Ascension, Avatars, coach chat). Always run `npm run check:prod-parity` before a production deploy. On Vercel (`VERCEL=1`) the build still **fails** if those files disappear again.

### Custom Domain

The project uses `chessavatar.net` (purchased via Vercel):

1. Vercel Dashboard → your project → **Settings → Domains**.
2. DNS is managed automatically when the domain is purchased through Vercel.
3. Make sure the same domain is set in **Supabase → Authentication → URL Configuration → Site URL**.

### Checking Logs

When something fails in production (API routes, webhooks):

1. Vercel Dashboard → your project → **Logs** tab.
2. Filter by **Errors** or search for the route path (e.g. `/api/stripe/webhook`).
3. Alternatively via CLI: `npx vercel logs`

---

## 5. Supabase — Configuration

### URL Configuration (Auth redirects)

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL**: `https://chessavatar.net`
3. **Redirect URLs**: add `https://chessavatar.net/*`

### Database Migrations

Migration files are in `supabase/migrations/`. To apply a new migration:

1. Go to Supabase Dashboard → **SQL Editor**.
2. Paste the SQL and run.

### Manually Update a User (e.g. grant Premium)

```sql
INSERT INTO subscriptions (user_id, plan, status, stripe_session_id)
VALUES ('user-uuid-here', 'premium', 'active', 'manual_grant')
ON CONFLICT (user_id)
DO UPDATE SET plan = 'premium', status = 'active';
```

---

## 6. Stripe — Webhooks

The Stripe webhook endpoint is `/api/stripe/webhook`.

1. Stripe Dashboard → **Developers → Webhooks**.
2. Endpoint URL: `https://chessavatar.net/api/stripe/webhook`
3. Events to listen for: `checkout.session.completed`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` on Vercel.

> After changing the webhook secret, redeploy on Vercel.

---

## 7. Resend — Email (Contact Form)

The contact form sends emails via Resend through `/api/contact`.

1. Resend Dashboard → verify your sending domain (`contact.chessavatar.net`).
2. DNS records (TXT, MX, DMARC) must be configured on Vercel Domains.
3. The `RESEND_API_KEY` must be set at the **Project level** on Vercel.
4. Emails are sent **from** `contact@contact.chessavatar.net` **to** your personal inbox.

---

## 8. Pre-deploy Checklist

```
[ ] npm run build passes with no errors
[ ] All env vars are set on Vercel (Project level)
[ ] Site URL + redirect URLs are correct in Supabase
[ ] Stripe webhook points to production URL
[ ] Stripe webhook secret matches Vercel env var
[ ] Resend domain is verified
[ ] .env.local is NOT committed
```

---

## 9. Tips & Tricks

### Build errors after editing

Always run `npm run build` locally before pushing. Common causes of build failure:
- **Missing type property**: if you add a field to a config object, add it to the TypeScript interface too (e.g. `EngineConfig` in `lib/analysis.ts`).
- **Unused imports**: Next.js strict mode will flag these.
- **Wrong translation key**: accessing `t.something.key` that doesn't exist in `lib/translations.ts`.

### Lockfile warning

If you see *"detected multiple lockfiles"* during build, it means there's a `package-lock.json` in a parent directory. You can ignore it or remove the parent lockfile.

### Testing Stripe locally

Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This gives you a temporary webhook secret for local testing.

### Checking if a user is Premium

In the browser console (while logged in):

```js
const { data } = await supabase.from('subscriptions').select('*').eq('user_id', 'USER_ID');
console.log(data);
```

Or directly in Supabase Dashboard → **Table Editor → subscriptions**.

### Vercel preview deployments

Every push to a non-main branch creates a **preview deployment** with its own URL. Useful for testing changes before merging to main.

### Image domains

If you use external avatar images, add the domain to `next.config.ts` under `images.remotePatterns`. Otherwise Next.js `<Image>` will reject them (unless `unoptimized` is set).

### Clearing local state

The app uses `localStorage` for some settings. To reset:
- Open DevTools → Application → Local Storage → Clear.

---

## 10. Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build + type check |
| `npm start` | Serve production build locally |
| `git status` | See changed files |
| `git add . && git commit -m "msg" && git push` | Push changes (triggers deploy) |
| `npx vercel --prod` | Manual deploy via CLI |
| `npx vercel logs` | View production logs |
| `npx vercel env ls` | List env vars on Vercel |

---

*Last updated: 2026-02-14*
