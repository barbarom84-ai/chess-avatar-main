import { describe, expect, it } from "vitest";
import { pvpChatSenderName } from "@/lib/pvp-chat";

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
