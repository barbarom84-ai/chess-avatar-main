import { describe, expect, it, vi } from "vitest";
import { findExistingOpenPvpLobby } from "@/lib/pvp-new-game-dedup";

describe("findExistingOpenPvpLobby", () => {
  it("queries waiting public lobbies for the host", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "g1", status: "waiting" },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const eqPreset = vi.fn().mockReturnValue({ order });
    const isRematch = vi.fn().mockReturnValue({ eq: eqPreset });
    const isInvite = vi.fn().mockReturnValue({ is: isRematch });
    const isBlack = vi.fn().mockReturnValue({ is: isInvite });
    const eqStatus = vi.fn().mockReturnValue({ is: isBlack });
    const eqWhite = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqWhite });
    const from = vi.fn().mockReturnValue({ select });

    const sb = { from } as unknown as Parameters<typeof findExistingOpenPvpLobby>[0];
    const result = await findExistingOpenPvpLobby(sb, "user-1", "blitz_3_0");

    expect(from).toHaveBeenCalledWith("pvp_games");
    expect(eqWhite).toHaveBeenCalledWith("white_user_id", "user-1");
    expect(eqPreset).toHaveBeenCalledWith("time_preset", "blitz_3_0");
    expect(result).toEqual({ id: "g1", status: "waiting" });
  });
});
