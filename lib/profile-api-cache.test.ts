import { describe, expect, it } from "vitest";
import {
  getCachedProfileResponse,
  profileCacheKey,
  setCachedProfileResponse,
} from "./profile-api-cache";

describe("profile-api-cache", () => {
  it("stores and retrieves by platform username key", () => {
    const key = profileCacheKey("lichess", "TestUser");
    setCachedProfileResponse(key, { games: [], avatarUrl: "x" });
    const hit = getCachedProfileResponse(key);
    expect(hit).toEqual({ games: [], avatarUrl: "x" });
  });

  it("normalizes username case in cache key", () => {
    const a = profileCacheKey("chesscom", "Player");
    const b = profileCacheKey("chesscom", "player");
    expect(a).toBe(b);
  });
});
