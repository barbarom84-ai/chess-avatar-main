import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const CLEANUP_EVERY = 500;

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Simple sliding-window rate limit (per instance). Suitable for abuse reduction;
 * use Redis/Edge for strict global limits on multi-instance deploys.
 */
export function rateLimit(
  req: NextRequest,
  options: { windowMs: number; max: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = clientKey(req);
  const now = Date.now();
  const windowMs = options.windowMs;
  const max = options.max;

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (buckets.size > CLEANUP_EVERY) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }

  if (bucket.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}
