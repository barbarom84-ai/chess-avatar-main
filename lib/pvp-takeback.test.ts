import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { canOfferPvpTakeback, pvpGameJustStarted } from "@/lib/pvp-takeback";

describe("canOfferPvpTakeback", () => {
  const whiteId = "user-white";
  const blackId = "user-black";

  it("allows offer after own move while opponent thinks", () => {
    const chess = new Chess();
    chess.move("e4");
    expect(
      canOfferPvpTakeback(whiteId, "white", [{ played_by: whiteId }], chess)
    ).toBe(true);
  });

  it("denies when it is your turn", () => {
    const chess = new Chess();
    expect(canOfferPvpTakeback(whiteId, "white", [], chess)).toBe(false);
  });

  it("denies white after black replied to e4", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("e5");
    expect(
      canOfferPvpTakeback(
        whiteId,
        "white",
        [{ played_by: whiteId }, { played_by: blackId }],
        chess
      )
    ).toBe(false);
  });
});

describe("pvpGameJustStarted", () => {
  it("detects waiting to playing transition", () => {
    expect(
      pvpGameJustStarted(
        { status: "waiting", black_user_id: null },
        { status: "playing", black_user_id: "u2" }
      )
    ).toBe(true);
  });
});
