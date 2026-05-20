import { describe, expect, it } from "vitest";
import { aggregateHeadToHead, pvpOutcomeForUser } from "@/lib/pvp-head-to-head";

describe("pvpOutcomeForUser", () => {
  it("counts win as white on 1-0", () => {
    expect(
      pvpOutcomeForUser(
        { result: "1-0", white_user_id: "a", black_user_id: "b" },
        "a"
      )
    ).toBe("win");
  });

  it("counts loss as black on 1-0", () => {
    expect(
      pvpOutcomeForUser(
        { result: "1-0", white_user_id: "a", black_user_id: "b" },
        "b"
      )
    ).toBe("loss");
  });
});

describe("aggregateHeadToHead", () => {
  it("sums wins losses draws", () => {
    const r = aggregateHeadToHead(
      [
        { result: "1-0", white_user_id: "me", black_user_id: "opp" },
        { result: "1-0", white_user_id: "opp", black_user_id: "me" },
        { result: "1/2-1/2", white_user_id: "me", black_user_id: "opp" },
      ],
      "me"
    );
    expect(r).toEqual({ wins: 1, losses: 1, draws: 1, total: 3 });
  });
});
