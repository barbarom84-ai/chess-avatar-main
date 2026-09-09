import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import type { PlayingStyle } from "@/types/chess";
import type { ProfileOption } from "@/lib/arena-types";
import { deriveForcedLinesFromOpenings } from "@/lib/forced-line-utils";
import { getOpeningById, getOpeningName } from "@/lib/openings-library";
import {
  personalityDisplayName,
  type PersonalityOpponent,
  type PersonalityStyleDimensions,
  getPersonalityOpponent,
} from "@/lib/personality-opponents";

export type PersonalityStyleOverrides = {
  aggression?: number;
  risk?: number;
  /** 0 = tactical, 100 = positional. */
  positional?: number;
};

export type ResolvedPersonalityStyle = {
  aggression: number;
  risk: number;
  positional: number;
};

export function clampStyleScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function resolvePersonalityStyle(
  opponent: PersonalityOpponent,
  overrides: PersonalityStyleOverrides = {}
): ResolvedPersonalityStyle {
  return {
    aggression: clampStyleScore(
      overrides.aggression ?? opponent.style.aggression
    ),
    risk: clampStyleScore(overrides.risk ?? opponent.style.risk),
    positional: clampStyleScore(
      overrides.positional ?? opponent.style.positional
    ),
  };
}

/**
 * High risk → more frequent MultiPV slips. Very low risk disables the interval.
 * Aligns with existing `humanBlunderInterval` (default 10).
 */
export function humanBlunderIntervalFromRisk(risk: number): number {
  const r = clampStyleScore(risk);
  if (r <= 8) return 0;
  return Math.max(4, Math.min(20, Math.round(24 - r * 0.2)));
}

export function playStyleFromPositional(
  positional: number,
  fallback: EngineConfig["playStyle"]
): EngineConfig["playStyle"] {
  const p = clampStyleScore(positional);
  if (p >= 66) return "positionnel";
  if (p <= 34) return "tactique";
  return fallback;
}

export function playingStyleFromPersonality(
  opponent: PersonalityOpponent,
  overrides: PersonalityStyleOverrides = {}
): PlayingStyle {
  const resolved = resolvePersonalityStyle(opponent, overrides);
  const tactical = clampStyleScore(100 - resolved.positional);
  return {
    aggression: resolved.aggression,
    tactical,
    positional: resolved.positional,
    endgame: opponent.style.endgame,
    openingTheory: opponent.style.openingTheory,
    timeManagement: opponent.style.timeManagement,
  };
}

function uciParts(uci: string): { from: string; to: string; promotion?: string } | null {
  const s = uci.trim().toLowerCase();
  if (s.length < 4) return null;
  return {
    from: s.slice(0, 2),
    to: s.slice(2, 4),
    promotion: s[4],
  };
}

/**
 * FEN → UCI book for the existing `config.openings` lookup (engine comparison,
 * AvatarEngine export). Higher-weight openings win overlapping keys.
 */
export function buildOpeningBookFromRepertoire(
  whiteOpenings: { id: string; weight: number }[],
  blackOpenings: { id: string; weight: number }[]
): Record<string, string> {
  const book: Record<string, string> = {};
  const apply = (
    refs: { id: string; weight: number }[],
    botIsWhite: boolean
  ) => {
    const sorted = [...refs].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
    for (const ref of sorted) {
      const opening = getOpeningById(ref.id);
      if (!opening?.uciMoves?.length) continue;
      const chess = new Chess();
      for (const raw of opening.uciMoves) {
        const parts = uciParts(raw);
        if (!parts) break;
        const fen = chess.fen();
        const botTurn = botIsWhite ? chess.turn() === "w" : chess.turn() === "b";
        if (botTurn && !book[fen]) book[fen] = raw.trim().toLowerCase();
        try {
          const moved = chess.move({
            from: parts.from,
            to: parts.to,
            promotion: parts.promotion,
          });
          if (!moved) break;
        } catch {
          break;
        }
      }
    }
  };
  apply(whiteOpenings, true);
  apply(blackOpenings, false);
  return book;
}

export function personalityToEngineConfig(
  opponent: PersonalityOpponent,
  overrides: PersonalityStyleOverrides = {},
  lang: string = "en"
): EngineConfig {
  const resolved = resolvePersonalityStyle(opponent, overrides);
  const playStyle = playStyleFromPositional(
    resolved.positional,
    opponent.playStyle
  );
  const opening = getOpeningById(opponent.favoriteOpeningId);
  const favoriteOpening = opening
    ? getOpeningName(opening, lang)
    : opponent.favoriteOpeningId;
  const whiteOpenings = opponent.whiteOpenings;
  const blackOpenings = opponent.blackOpenings;
  const { white, black } = deriveForcedLinesFromOpenings(
    whiteOpenings,
    blackOpenings
  );

  return {
    name: personalityDisplayName(opponent, lang),
    personalityId: opponent.id,
    elo: opponent.elo,
    difficulty: opponent.difficulty,
    aggressiveness: resolved.aggression,
    threads: Math.max(2, opponent.threads),
    depth: opponent.depth,
    timeControl: opponent.timeControl,
    favoriteOpening,
    playStyle,
    openings: buildOpeningBookFromRepertoire(whiteOpenings, blackOpenings),
    openingRepertoire: { whiteOpenings, blackOpenings },
    forcedLineSource: "openings",
    forcedLineWhite: white,
    forcedLineBlack: black,
    humanBlunderInterval: humanBlunderIntervalFromRisk(resolved.risk),
    creatorName: "Chess Avatar",
  };
}

export function personalityToArenaOption(
  opponent: PersonalityOpponent,
  lang: string = "en"
): ProfileOption {
  const config = personalityToEngineConfig(opponent, {}, lang);
  return {
    key: `personality:${opponent.id}`,
    label: config.name,
    config,
    savedAt: 0,
  };
}

export function parseStyleInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return undefined;
  return clampStyleScore(n);
}

export function parsePersonalityQuery(search: {
  get(name: string): string | null;
}): {
  id: string;
  overrides: PersonalityStyleOverrides;
} | null {
  const id = search.get("personality")?.trim();
  if (!id || !getPersonalityOpponent(id)) return null;
  const overrides: PersonalityStyleOverrides = {};
  const aggression = parseStyleInt(search.get("agg"));
  const risk = parseStyleInt(search.get("risk"));
  const positional = parseStyleInt(search.get("pos"));
  if (aggression !== undefined) overrides.aggression = aggression;
  if (risk !== undefined) overrides.risk = risk;
  if (positional !== undefined) overrides.positional = positional;
  return { id, overrides };
}

export function personalityPlayHref(
  id: string,
  overrides: PersonalityStyleOverrides = {},
  opponent?: PersonalityOpponent
): string {
  const seed = opponent?.style;
  const params = new URLSearchParams();
  params.set("personality", id);
  if (
    overrides.aggression !== undefined &&
    seed &&
    clampStyleScore(overrides.aggression) !== seed.aggression
  ) {
    params.set("agg", String(clampStyleScore(overrides.aggression)));
  } else if (overrides.aggression !== undefined && !seed) {
    params.set("agg", String(clampStyleScore(overrides.aggression)));
  }
  if (
    overrides.risk !== undefined &&
    seed &&
    clampStyleScore(overrides.risk) !== seed.risk
  ) {
    params.set("risk", String(clampStyleScore(overrides.risk)));
  } else if (overrides.risk !== undefined && !seed) {
    params.set("risk", String(clampStyleScore(overrides.risk)));
  }
  if (
    overrides.positional !== undefined &&
    seed &&
    clampStyleScore(overrides.positional) !== seed.positional
  ) {
    params.set("pos", String(clampStyleScore(overrides.positional)));
  } else if (overrides.positional !== undefined && !seed) {
    params.set("pos", String(clampStyleScore(overrides.positional)));
  }
  const qs = params.toString();
  return qs ? `/play?${qs}` : `/play?personality=${encodeURIComponent(id)}`;
}

export function styleDimensionsFromResolved(
  opponent: PersonalityOpponent,
  resolved: ResolvedPersonalityStyle
): PersonalityStyleDimensions {
  return {
    ...opponent.style,
    aggression: resolved.aggression,
    risk: resolved.risk,
    positional: resolved.positional,
    tactical: clampStyleScore(100 - resolved.positional),
  };
}
