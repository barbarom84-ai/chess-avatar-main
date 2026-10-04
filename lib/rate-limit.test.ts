import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "./rate-limit";

function fakeRequest(ip = "203.0.113.1", path = "/api/test", method = "GET"): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimit", () => {
  it("allows requests under the max", async () => {
    const req = fakeRequest("rate-test-allow");
    const r1 = await rateLimit(req, { windowMs: 60_000, max: 5 });
    const r2 = await rateLimit(req, { windowMs: 60_000, max: 5 });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it("blocks when max exceeded", async () => {
    const req = fakeRequest("rate-test-block");
    const opts = { windowMs: 60_000, max: 2 };
    await rateLimit(req, opts);
    await rateLimit(req, opts);
    const third = await rateLimit(req, opts);
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("keeps a separate bucket per route", async () => {
    const ip = "rate-test-routes";
    const game = "/api/pvp/games/0b7c1a52-7d0f-4a59-9a43-1f0f5f2f6f11";
    for (let i = 0; i < 5; i++) {
      await rateLimit(fakeRequest(ip, game), { windowMs: 60_000, max: 180 });
    }
    const create = await rateLimit(fakeRequest(ip, "/api/pvp/games", "POST"), { windowMs: 60_000, max: 2 });
    expect(create.ok).toBe(true);
  });

  it("shares the bucket of a route across ids and keeps methods apart", async () => {
    const ip = "rate-test-ids";
    const opts = { windowMs: 60_000, max: 1 };
    const a = await rateLimit(fakeRequest(ip, "/api/pvp/games/0b7c1a52-7d0f-4a59-9a43-1f0f5f2f6f11/move", "POST"), opts);
    const b = await rateLimit(fakeRequest(ip, "/api/pvp/games/9f0e3c21-1d2b-4c3a-8e7f-6a5b4c3d2e1f/move", "POST"), opts);
    const get = await rateLimit(fakeRequest(ip, "/api/pvp/games/9f0e3c21-1d2b-4c3a-8e7f-6a5b4c3d2e1f/move"), opts);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(get.ok).toBe(true);
  });
});
