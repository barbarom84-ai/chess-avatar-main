import { describe, expect, it } from "vitest";
import { hasActivePremiumAccess, isActiveSuperPlan } from "./subscription-access";

describe("subscription-access", () => {
  it("grants premium and super when active", () => {
    expect(hasActivePremiumAccess("premium", "active")).toBe(true);
    expect(hasActivePremiumAccess("super", "active")).toBe(true);
    expect(isActiveSuperPlan("super", "active")).toBe(true);
  });

  it("denies inactive or unknown plans", () => {
    expect(hasActivePremiumAccess("premium", "canceled")).toBe(false);
    expect(hasActivePremiumAccess("free", "active")).toBe(false);
    expect(isActiveSuperPlan("premium", "active")).toBe(false);
  });
});
