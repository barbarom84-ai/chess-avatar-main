import { describe, expect, it } from "vitest";
import { parseChatWithEmojis } from "./chat-emojis";

describe("parseChatWithEmojis", () => {
  it("splits text, piece marks and sticker shortcodes", () => {
    const parts = parseChatWithEmojis("Nice :ca_wN: :ca_trophy: game");
    expect(parts).toEqual([
      { type: "text", value: "Nice " },
      { type: "mark", id: "wN" },
      { type: "text", value: " " },
      { type: "mark", id: "trophy" },
      { type: "text", value: " game" },
    ]);
  });
});
