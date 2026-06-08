import { describe, expect, it } from "vitest";
import { normalizeProfilePatch } from "./account-server";

describe("normalizeProfilePatch preferences", () => {
  it("accepts botEngine preference", () => {
    const patch = normalizeProfilePatch({
      preferences: { botEngine: "chessavatar" },
    });
    expect(patch.preferences?.botEngine).toBe("chessavatar");
  });

  it("rejects invalid botEngine values", () => {
    const patch = normalizeProfilePatch({
      preferences: { botEngine: "komodo" },
    });
    expect(patch.preferences).toBeUndefined();
  });
});
