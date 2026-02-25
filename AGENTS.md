# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Chess Avatar Creator is a Next.js 16 web app (TypeScript, React 18, Tailwind CSS 4) that lets chess players create an AI clone of their playing style. Core flow: analyze a Lichess/Chess.com profile, view stats/charts, configure a Stockfish engine to mimic the style, and play against the clone in-browser.

### Running the app

- **Dev server**: `npm run dev` (runs on `http://localhost:3000`)
- **Build**: `npm run build`
- **Lint**: `npm run lint` (ESLint 9 with `eslint-config-next`). Pre-existing lint errors exist in the codebase (mostly `no-explicit-any` and `no-unused-vars`); these are not regressions.
- **Tests**: No test framework is configured yet (README notes "Tests: coming soon").

### External services

All external services are **optional** for local development. The app gracefully degrades to localStorage-only mode when environment variables are not set:

- **Supabase** (auth + database): requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- **Stripe** (payments): requires `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.
- **Resend** (email): requires `RESEND_API_KEY`
- **Lichess / Chess.com APIs**: public, no keys needed. Proxied through `/api/lichess` and `/api/chesscom` routes.

See `.env.example` for the full list of environment variables.

### Key caveats

- The `public/stockfish-engine.js` file is a large minified JS file (~95KB lines). ESLint reports many warnings from it; these should be ignored. Consider adding it to the ESLint ignore list if lint noise is a concern.
- Stockfish WASM runs client-side in the browser via the `useStockfish` hook. No server-side chess engine process is needed.
- Node.js v22+ and npm 10+ are required (matches `package-lock.json`).
