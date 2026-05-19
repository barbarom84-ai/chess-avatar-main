import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const buckets = new Map<string, Bucket>();
const CLEANUP_EVERY = 500;

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimitInMemory(
  key: string,
  options: { windowMs: number; max: number }
): RateLimitResult {
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

async function upstashCommand(command: (string | number)[]): Promise<unknown | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: unknown = await res.json().catch(() => null);
    if (data && typeof data === "object" && "result" in data) {
      return (data as { result: unknown }).result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Optional global rate limit via Upstash Redis REST (set UPSTASH_REDIS_REST_* in Vercel).
 * Falls back to per-instance memory when unset or on error.
 */
async function rateLimitDistributed(
  clientId: string,
  options: { windowMs: number; max: number }
): Promise<RateLimitResult | null> {
  const now = Date.now();
  const bucketKey = `chess-avatar:rl:${clientId}:${options.windowMs}:${options.max}:${Math.floor(now / options.windowMs)}`;

  const count = await upstashCommand(["INCR", bucketKey]);
  if (typeof count !== "number") return null;

  if (count === 1) {
    await upstashCommand(["PEXPIRE", bucketKey, options.windowMs]);
  }

  if (count > options.max) {
    const retryAfterSec = Math.max(1, Math.ceil(options.windowMs / 1000));
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}

/**
 * Sliding-window rate limit (per instance, or global with Upstash).
 */
export async function rateLimit(
  req: NextRequest,
  options: { windowMs: number; max: number }
): Promise<RateLimitResult> {
  const key = clientKey(req);
  const distributed = await rateLimitDistributed(key, options);
  if (distributed) return distributed;
  return rateLimitInMemory(`${key}:${options.windowMs}:${options.max}`, options);
}
