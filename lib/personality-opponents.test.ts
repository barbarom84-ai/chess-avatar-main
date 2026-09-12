import { describe, expect, it } from "vitest";
import { getOpeningById } from "@/lib/openings-library";
import {
  PERSONALITY_OPPONENTS,
  getPersonalityOpponent,
  listPersonalityOpponents,
} from "@/lib/personality-opponents";
import {
  buildOpeningBookFromRepertoire,
  humanBlunderIntervalFromRisk,
  parsePersonalityQuery,
  personalityPlayHref,
  personalityToArenaOption,
  personalityToEngineConfig,
  playStyleFromPositional,
  playingStyleFromPersonality,
} from "@/lib/personality-to-engine";
import {
  multiPvCountForPlay,
  personaLineBias,
} from "@/lib/persona-engine-params";

describe("personality opponents seed", () => {
  it("includes at least 6 legends and 3 named styles", () => {
    expect(listPersonalityOpponents("legend").length).toBeGreaterThanOrEqual(6);
    expect(listPersonalityOpponents("archetype").length).toBeGreaterThanOrEqual(3);
  });

  it("gives every legend a cartoon portrait path", () => {
    for (const p of listPersonalityOpponents("legend")) {
      expect(p.portraitUrl, p.id).toMatch(/^\/personalities\/[a-z-]+\.webp$/);
      expect(p.difficulty).toBe(5);
    }
  });

  it("uses opening ids that exist in the core library", () => {
    for (const p of PERSONALITY_OPPONENTS) {
      expect(getOpeningById(p.favoriteOpeningId), p.favoriteOpeningId).toBeTruthy();
      for (const ref of [...p.whiteOpenings, ...p.blackOpenings]) {
        expect(getOpeningById(ref.id), `${p.id}:${ref.id}`).toBeTruthy();
      }
    }
  });

  it("gives Tal and Capablanca different white opening tendencies", () => {
    const tal = getPersonalityOpponent("tal")!;
    const capa = getPersonalityOpponent("capablanca")!;
    const talWhite = tal.whiteOpenings[0]!.id;
    const capaWhite = capa.whiteOpenings[0]!.id;
    expect(talWhite).not.toBe(capaWhite);
    const talCfg = personalityToEngineConfig(tal);
    const capaCfg = personalityToEngineConfig(capa);
    expect(talCfg.forcedLineWhite?.[0]).not.toBe(capaCfg.forcedLineWhite?.[0]);
    expect(talCfg.aggressiveness).toBeGreaterThan(capaCfg.aggressiveness);
    expect(talCfg.playStyle).toBe("tactique");
    expect(capaCfg.playStyle).toBe("positionnel");
    const startFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(talCfg.openings[startFen]).toBe("e2e4");
    expect(capaCfg.openings[startFen]).toBe("d2d4");
  });
});

describe("personality → EngineConfig mapping", () => {
  it("stamps personalityId and opening repertoire / forced lines", () => {
    const fischer = getPersonalityOpponent("fischer")!;
    const cfg = personalityToEngineConfig(fischer, {}, "en");
    expect(cfg.personalityId).toBe("fischer");
    expect(cfg.name).toBe("Bobby Fischer");
    expect(cfg.forcedLineSource).toBe("openings");
    expect(cfg.openingRepertoire?.whiteOpenings[0]?.id).toBe("spanish-opening");
    expect(cfg.forcedLineWhite?.[0]).toBe("e2e4");
    expect(cfg.openings && Object.keys(cfg.openings).length).toBeGreaterThan(0);
  });

  it("applies aggression / risk / positional sliders", () => {
    const karpov = getPersonalityOpponent("karpov")!;
    const cfg = personalityToEngineConfig(karpov, {
      aggression: 90,
      risk: 95,
      positional: 20,
    });
    expect(cfg.aggressiveness).toBe(90);
    expect(cfg.playStyle).toBe("tactique");
    expect(cfg.humanBlunderInterval).toBe(0);
    expect(cfg.avatarUrl).toBe("/personalities/karpov.webp");
  });

  it("maps very low risk to disabled human blunders", () => {
    expect(humanBlunderIntervalFromRisk(0)).toBe(0);
    expect(humanBlunderIntervalFromRisk(50)).toBe(14);
    expect(humanBlunderIntervalFromRisk(100)).toBe(4);
  });

  it("maps positional slider to playStyle categories", () => {
    expect(playStyleFromPositional(80, "équilibré")).toBe("positionnel");
    expect(playStyleFromPositional(10, "équilibré")).toBe("tactique");
    expect(playStyleFromPositional(50, "solide")).toBe("solide");
  });

  it("plays GM legends on a single PV (opening book keeps their style)", () => {
    const tal = personalityToEngineConfig(getPersonalityOpponent("tal")!);
    const capa = personalityToEngineConfig(getPersonalityOpponent("capablanca")!);
    const romantic = personalityToEngineConfig(getPersonalityOpponent("romantic")!);
    expect(multiPvCountForPlay(tal)).toBe(1);
    expect(multiPvCountForPlay(capa)).toBe(1);
    expect(tal.humanBlunderInterval).toBe(0);
    expect(capa.humanBlunderInterval).toBe(0);
    expect(multiPvCountForPlay(romantic)).toBeGreaterThanOrEqual(2);
    expect(personaLineBias(tal)).toBeGreaterThan(personaLineBias(capa));
  });

  it("builds a FEN book that prefers higher-weight openings", () => {
    const book = buildOpeningBookFromRepertoire(
      [
        { id: "kings-gambit", weight: 80 },
        { id: "italian-game", weight: 10 },
      ],
      []
    );
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(book[startFen]).toBe("e2e4");
  });

  it("exposes arena options with stable keys", () => {
    const opt = personalityToArenaOption(getPersonalityOpponent("morphy")!, "en");
    expect(opt.key).toBe("personality:morphy");
    expect(opt.config.personalityId).toBe("morphy");
  });

  it("parses / serializes play query params", () => {
    const href = personalityPlayHref("tal", { aggression: 40 }, getPersonalityOpponent("tal"));
    expect(href).toContain("personality=tal");
    expect(href).toContain("agg=40");
    const parsed = parsePersonalityQuery(new URLSearchParams(href.split("?")[1]));
    expect(parsed).toEqual({
      id: "tal",
      overrides: { aggression: 40 },
    });
    expect(parsePersonalityQuery(new URLSearchParams("personality=nope"))).toBeNull();
  });

  it("mirrors slider overrides onto the radar playing style", () => {
    const style = playingStyleFromPersonality(getPersonalityOpponent("tal")!, {
      positional: 80,
      aggression: 30,
    });
    expect(style.positional).toBe(80);
    expect(style.tactical).toBe(20);
    expect(style.aggression).toBe(30);
  });
});
