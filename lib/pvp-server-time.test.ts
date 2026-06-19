import { describe, expect, it } from "vitest";
import {
  computeServerOffsetMs,
  createServerTimeAnchor,
  nowFromServerAnchor,
} from "@/lib/pvp-server-time";

describe("pvp-server-time", () => {
  it("computes offset at RTT midpoint", () => {
    expect(computeServerOffsetMs(10_000, 0, 100)).toBe(9_950);
  });

  it("advances anchored server time with performance clock", () => {
    const anchor = createServerTimeAnchor(1_000_000, 100);
    const originalNow = performance.now;
    performance.now = () => 150;
    try {
      expect(nowFromServerAnchor(anchor)).toBe(1_000_050);
    } finally {
      performance.now = originalNow;
    }
  });
});
