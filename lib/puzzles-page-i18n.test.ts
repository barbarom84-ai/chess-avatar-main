import { describe, expect, it } from "vitest";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  if (Array.isArray(value)) return [prefix];
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [prefix];
  return entries.flatMap(([k, v]) =>
    collectKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe("puzzlesPage i18n (refonte UI)", () => {
  const required = [
    "title",
    "subtitle",
    "brandLoadingLabel",
    "modeLabel",
    "modeDaily",
    "modeRandom",
    "modeCatalog",
    "modeCommunity",
    "challengesHeading",
    "pickAChallenge",
    "startRandom",
    "startCommunity",
    "dailyTitle",
    "dailyDesc",
    "dailyLoading",
    "dailyError",
    "retry",
    "randomTitle",
    "randomDesc",
    "newRandom",
    "randomLoading",
    "randomError",
    "historicalDesc",
    "pickGame",
    "emptyFeatured",
    "cloudPuzzleTitle",
    "cloudPuzzleDesc",
    "cloudPuzzleNew",
    "cloudPuzzleLoading",
    "cloudPuzzleError",
    "cloudPuzzleAuth",
    "openLearn",
    "lichess.openOnLichess",
    "lichess.rating",
    "lichess.themes",
    "lichess.plays",
  ] as const;

  it("keeps FR/EN puzzlesPage key trees in sync", () => {
    const enKeys = collectKeys(en.puzzlesPage).sort();
    const frKeys = collectKeys(fr.puzzlesPage).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("exposes mode and loader strings used by the Ascension-style layout", () => {
    for (const key of required) {
      const parts = key.split(".");
      let enVal: unknown = en.puzzlesPage;
      let frVal: unknown = fr.puzzlesPage;
      for (const part of parts) {
        enVal = (enVal as Record<string, unknown>)[part];
        frVal = (frVal as Record<string, unknown>)[part];
      }
      expect(typeof enVal, `en.${key}`).toBe("string");
      expect(typeof frVal, `fr.${key}`).toBe("string");
      expect((enVal as string).length, `en.${key}`).toBeGreaterThan(0);
      expect((frVal as string).length, `fr.${key}`).toBeGreaterThan(0);
    }
  });

  it("keeps the subtitle short (single-line UX)", () => {
    expect(en.puzzlesPage.subtitle.length).toBeLessThan(120);
    expect(fr.puzzlesPage.subtitle.length).toBeLessThan(120);
  });
});
