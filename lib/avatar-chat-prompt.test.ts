import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/avatar-chat-prompt";

describe("avatar-chat-prompt", () => {
  it("builds French system prompt with player name", () => {
    const prompt = buildSystemPrompt({
      message: "hello",
      lang: "fr",
      stats: {
        username: "MagnusClone",
        style: "Agressif",
        winRate: 55,
        topOpenings: [{ name: "Sicilian", count: 10 }],
      },
      config: {
        playStyle: "agressif",
        elo: 1800,
        favoriteOpening: "Sicilian",
      },
    });
    expect(prompt).toContain("MagnusClone");
    expect(prompt).toContain("français");
  });
});
