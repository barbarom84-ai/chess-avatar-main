import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "./rate-limit";

function fakeRequest(ip = "203.0.113.1"): NextRequest {
  return new NextRequest("http://localhost/api/test", {
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
});
