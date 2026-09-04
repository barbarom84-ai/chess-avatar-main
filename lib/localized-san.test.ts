import { describe, expect, it } from "vitest";
import {
  frenchNotationSystemHint,
  localizeFrenchCoachText,
  localizeSan,
} from "@/lib/localized-san";

describe("localizeSan", () => {
  it("leaves English SAN unchanged", () => {
    expect(localizeSan("Re1", "en")).toBe("Re1");
    expect(localizeSan("Ne7+", "en")).toBe("Ne7+");
  });

  it("maps English piece letters to French", () => {
    expect(localizeSan("Re1", "fr")).toBe("Te1");
    expect(localizeSan("Ne7+", "fr")).toBe("Ce7+");
    expect(localizeSan("O-O", "fr")).toBe("O-O");
    expect(localizeSan("exd8=Q+", "fr")).toBe("exd8=D+");
    expect(localizeSan("Rae1", "fr")).toBe("Tae1");
    expect(localizeSan("Ke2", "fr")).toBe("Re2");
  });
});

describe("localizeFrenchCoachText", () => {
  it("rewrites the known rook move Re1 to Te1 without touching a French king Re2", () => {
    const text =
      "Re1 ne crée pas de menace. Les Blancs pouvaient jouer Ne7+. Un roi en Re2 serait autre chose.";
    expect(localizeFrenchCoachText(text, ["Re1", "Ne7+"])).toBe(
      "Te1 ne crée pas de menace. Les Blancs pouvaient jouer Ce7+. Un roi en Re2 serait autre chose."
    );
  });

  it("still converts unique English letters N/B/Q/K even if not in knownSans", () => {
    expect(localizeFrenchCoachText("Le cavalier en Nf3 est solide.", [])).toBe(
      "Le cavalier en Cf3 est solide."
    );
  });

  it("exposes a French notation hint", () => {
    expect(frenchNotationSystemHint()).toContain("Te1");
  });
});
