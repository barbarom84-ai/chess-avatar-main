# Stockfish in the browser — security notes

Chess Avatar runs Stockfish as a **Web Worker** (`/stockfish.js` + WASM), not as a child process on the server.

## Content Security Policy

`next.config.ts` allows:

- `worker-src 'self' blob:` — required for `new Worker("/stockfish.js")`
- `script-src` includes `'unsafe-eval'` — required by the Stockfish WASM build loaded in the worker

Without `'unsafe-eval'`, the engine fails to initialize in production.

## Isolation

- Engine code runs **only in the user's browser**; no UCI over the network.
- A **singleton worker** (`lib/stockfish-client.ts`) serializes searches so concurrent pages do not spawn multiple WASM instances.

## Operational checklist

1. Serve `stockfish.js` / WASM only from your own origin (`public/`).
2. Do not inject user-controlled strings into UCI commands (FENs are validated via chess.js before `position fen`).
3. Keep Next.js and `stockfish.js` updated when security advisories apply to dependencies.
