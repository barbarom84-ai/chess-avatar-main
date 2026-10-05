import { describe, expect, it } from "vitest";
import { PVP_CHAT_POST_GAME_WINDOW_MS, pvpChatOpenRemainingMs, pvpChatSenderName } from "@/lib/pvp-chat";

const WHITE = "11111111-1111-1111-1111-111111111111";
const BLACK = "22222222-2222-2222-2222-222222222222";

const game = {
  white_user_id: WHITE,
  black_user_id: BLACK,
  white_display_name: "LabBot C",
  black_display_name: "LabBot A",
};

describe("pvpChatSenderName", () => {
  it("names a realtime insert, which carries no name, from the game", () => {
    expect(pvpChatSenderName({ user_id: BLACK }, game)).toBe("LabBot A");
    expect(pvpChatSenderName({ user_id: WHITE, display_name: null }, game)).toBe("LabBot C");
  });

  it("prefers the game's name over the account name, like the player cards", () => {
    expect(pvpChatSenderName({ user_id: WHITE, display_name: "Account name" }, game)).toBe("LabBot C");
  });

  it("falls back to the account name when the game has none", () => {
    const unnamed = { ...game, white_display_name: "  " };
    expect(pvpChatSenderName({ user_id: WHITE, display_name: "Account name" }, unnamed)).toBe("Account name");
  });

  it("returns null when nothing names the sender", () => {
    expect(pvpChatSenderName({ user_id: "someone-else" }, game)).toBeNull();
    expect(pvpChatSenderName({ user_id: WHITE }, null)).toBeNull();
  });
});

describe("pvpChatOpenRemainingMs", () => {
  const endedAt = "2026-10-05T18:00:00.000Z";
  const ended = Date.parse(endedAt);

  it("stays open while the game is waiting or playing", () => {
    expect(pvpChatOpenRemainingMs({ status: "playing", updated_at: endedAt }, ended + 86_400_000)).toBe(
      Number.POSITIVE_INFINITY
    );
    expect(pvpChatOpenRemainingMs({ status: "waiting", updated_at: endedAt }, ended)).toBe(Number.POSITIVE_INFINITY);
  });

  it("stays open for a while after a finished or aborted game", () => {
    expect(pvpChatOpenRemainingMs({ status: "finished", updated_at: endedAt }, ended + 60_000)).toBe(
      PVP_CHAT_POST_GAME_WINDOW_MS - 60_000
    );
    expect(pvpChatOpenRemainingMs({ status: "aborted", updated_at: endedAt }, ended)).toBe(PVP_CHAT_POST_GAME_WINDOW_MS);
  });

  it("closes once the post-game window has passed", () => {
    expect(
      pvpChatOpenRemainingMs({ status: "finished", updated_at: endedAt }, ended + PVP_CHAT_POST_GAME_WINDOW_MS)
    ).toBe(0);
    expect(pvpChatOpenRemainingMs({ status: "finished", updated_at: "not a date" }, ended)).toBe(0);
  });
});
