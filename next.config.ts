import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Defense-in-depth; tuned for Next.js, Supabase, Stripe redirect, Lichess/Chess.com fetches, Stockfish WASM. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://va.vercel-scripts.com https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co https://api.stripe.com https://r.stripe.com https://lichess.org https://lichess1.org https://api.chess.com https://www.chess.com https://images.chesscomfiles.com https://api.resend.com https://*.ingest.sentry.io https://eu.i.posthog.com https://eu-assets.i.posthog.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  /** Avoid inferring workspace root from a parent-folder package-lock.json (e.g. under the user profile). */
  outputFileTracingRoot: projectRoot,
  webpack(config) {
    config.module.rules.push({
      test: /\.pgn$/i,
      type: "asset/source",
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.chesscomfiles.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lichess1.org',
        pathname: '/**',
      },
    ],
  },
  headers: async () => {
    return [
      {
        // Headers pour les fichiers WASM
        source: '/:path*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
      {
        // Headers de sécurité pour toutes les routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
