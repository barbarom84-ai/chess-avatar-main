import { describe, expect, it } from "vitest";
import { resolveFriendDisplayName } from "@/lib/account-server";

describe("resolveFriendDisplayName", () => {
  it("prefers the friend's custom account name", () => {
    expect(resolveFriendDisplayName({ display_name: "Magnus" }, "LabBot B")).toBe("Magnus");
  });

  it("falls back to the name saved when adding the friend", () => {
    expect(resolveFriendDisplayName({ display_name: null }, "LabBot B")).toBe("LabBot B");
    expect(resolveFriendDisplayName(undefined, "  LabBot B ")).toBe("LabBot B");
  });

  it("uses the generic placeholder only when nothing else is known", () => {
    expect(resolveFriendDisplayName(null, "  ")).toBe("Player");
  });
});
