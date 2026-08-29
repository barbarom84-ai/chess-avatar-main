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

  it("uses the house-coach prompt for ChessAvatarPro", () => {
    const prompt = buildSystemPrompt({
      message: "why",
      lang: "en",
      role: "house",
      stats: { username: "ChessAvatarPro", style: "Équilibré", winRate: 55 },
      config: { playStyle: "équilibré", elo: 2400, favoriteOpening: "Italian" },
    });
    expect(prompt).toContain("ChessAvatarPro");
    expect(prompt).toContain("official ChessAvatar coach");
  });
});
