import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/coach/chat/route";
import { NextRequest } from "next/server";

describe("POST /api/coach/chat", () => {
  it("returns 401 without auth token", async () => {
    const req = new NextRequest("http://localhost/api/coach/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hi", lang: "en", stats: { username: "x", style: "Solid", winRate: 50 }, config: { playStyle: "solid", elo: 1200, favoriteOpening: "e4" } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
