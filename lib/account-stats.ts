import type {
  AccountActivityDay,
  AccountRecentGame,
  AccountStats,
  AccountStreak,
  ColorRecord,
  GameOutcome,
  PvpCategory,
  TimeOfDay,
} from "@/lib/account-types";
import { computeAchievements } from "@/lib/account-achievements";
import { countToNextTier, nextTierAfter, TIER_ORDER } from "@/lib/ascension/tiers";
import type { ChampionTier } from "@/lib/ascension/types";
import { pvpOutcomeForUser } from "@/lib/pvp-head-to-head";

export const ACTIVITY_WINDOW_DAYS = 84;
export const RECENT_GAMES_LIMIT = 5;

export type StatsGameRow = {
  id: string;
  result: string | null;
  player_color: string | null;
  opponent_name: string | null;
  duration_seconds: number | null;
  moves_count: number | null;
  created_at: string;
  game_kind?: string | null;
  result_type?: string | null;
};

export type StatsPvpRow = {
  id: string;
  white_user_id: string | null;
  black_user_id: string | null;
  result: string | null;
  time_preset: string | null;
  white_display_name: string | null;
  black_display_name: string | null;
  created_at: string;
  updated_at: string | null;
};

export type StatsAscensionInput = {
  tier: string | null;
  elo: number | null;
  xp: number | null;
  puzzlesSolved: number;
};

export type StatsLeagueInput = {
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
};

export type StatsInput = {
  userId: string;
  games: StatsGameRow[];
  pvpGames: StatsPvpRow[];
  avatars: number;
  ascension: StatsAscensionInput | null;
  league: StatsLeagueInput | null;
  now: Date;
  /** Same sign convention as `Date#getTimezoneOffset()` (UTC minus local, in minutes). */
  tzOffsetMinutes: number;
};

type TimedOutcome = { at: number; outcome: GameOutcome };

const DAY_MS = 86_400_000;

function toTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function localShift(time: number, tzOffsetMinutes: number): Date {
  return new Date(time - tzOffsetMinutes * 60_000);
}

export function localDateKey(time: number, tzOffsetMinutes: number): string {
  return localShift(time, tzOffsetMinutes).toISOString().slice(0, 10);
}

export function localHour(time: number, tzOffsetMinutes: number): number {
  return localShift(time, tzOffsetMinutes).getUTCHours();
}

export function timeOfDayForHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

function normalizeOutcome(result: string | null): GameOutcome | null {
  return result === "win" || result === "loss" || result === "draw" ? result : null;
}

export function isBotGame(row: Pick<StatsGameRow, "game_kind" | "result_type">): boolean {
  const kind = row.game_kind ?? "human_vs_bot";
  return kind === "human_vs_bot" && row.result_type !== "pgn_archive";
}

export function pvpCategoryFromPreset(preset: string | null | undefined): PvpCategory | null {
  if (!preset) return null;
  const prefix = preset.split("_")[0];
  return prefix === "bullet" ||
    prefix === "blitz" ||
    prefix === "rapid" ||
    prefix === "classical" ||
    prefix === "correspondence"
    ? prefix
    : null;
}

function winRate(wins: number, total: number): number {
  return total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
}

function emptyColorRecord(): ColorRecord {
  return { wins: 0, losses: 0, draws: 0, total: 0 };
}

function addToRecord(record: ColorRecord, outcome: GameOutcome) {
  record.total += 1;
  if (outcome === "win") record.wins += 1;
  else if (outcome === "loss") record.losses += 1;
  else record.draws += 1;
}

/** Streak of identical outcomes ending with the most recent game. */
export function currentStreak(outcomes: TimedOutcome[]): AccountStreak {
  const sorted = [...outcomes].sort((a, b) => b.at - a.at);
  const first = sorted[0];
  if (!first) return { outcome: null, count: 0 };
  let count = 0;
  for (const o of sorted) {
    if (o.outcome !== first.outcome) break;
    count += 1;
  }
  return { outcome: first.outcome, count };
}

export function bestWinStreak(outcomes: TimedOutcome[]): number {
  const sorted = [...outcomes].sort((a, b) => a.at - b.at);
  let best = 0;
  let run = 0;
  for (const o of sorted) {
    run = o.outcome === "win" ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

function previousDateKey(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** Consecutive active days ending today (or yesterday, so an unplayed today does not break it). */
export function dayStreaks(
  activeDates: Set<string>,
  todayKey: string
): { current: number; best: number } {
  let current = 0;
  let cursor = activeDates.has(todayKey) ? todayKey : previousDateKey(todayKey);
  while (activeDates.has(cursor)) {
    current += 1;
    cursor = previousDateKey(cursor);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of [...activeDates].sort()) {
    run = prev !== null && previousDateKey(key) === prev ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }
  return { current, best };
}

export function buildActivityDays(
  counts: Map<string, number>,
  todayKey: string,
  windowDays = ACTIVITY_WINDOW_DAYS
): AccountActivityDay[] {
  const days: AccountActivityDay[] = [];
  let cursor = todayKey;
  for (let i = 0; i < windowDays; i += 1) {
    days.push({ date: cursor, count: counts.get(cursor) ?? 0 });
    cursor = previousDateKey(cursor);
  }
  return days.reverse();
}

function mostFrequent<K>(counts: Map<K, number>): [K, number] | null {
  let best: [K, number] | null = null;
  for (const entry of counts) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  return best;
}

function normalizeTier(tier: string | null): ChampionTier {
  return TIER_ORDER.includes(tier as ChampionTier) ? (tier as ChampionTier) : "stone";
}

export function computeAccountStats(input: StatsInput): AccountStats {
  const { userId, tzOffsetMinutes } = input;
  const todayKey = localDateKey(input.now.getTime(), tzOffsetMinutes);

  const outcomes: TimedOutcome[] = [];
  const dayCounts = new Map<string, number>();
  const hourBuckets = new Map<TimeOfDay, number>();
  let playedAtNight = false;
  let lastPlayedAt: number | null = null;
  const recent: (AccountRecentGame & { at: number })[] = [];

  const trackTime = (at: number) => {
    const key = localDateKey(at, tzOffsetMinutes);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    const hour = localHour(at, tzOffsetMinutes);
    const slot = timeOfDayForHour(hour);
    hourBuckets.set(slot, (hourBuckets.get(slot) ?? 0) + 1);
    if (hour < 5) playedAtNight = true;
    if (lastPlayedAt === null || at > lastPlayedAt) lastPlayedAt = at;
  };

  const asWhite = emptyColorRecord();
  const asBlack = emptyColorRecord();
  const botRecord = emptyColorRecord();
  const opponentCounts = new Map<string, number>();
  let totalPlaySeconds = 0;
  let movesSum = 0;
  let movesSamples = 0;

  for (const row of input.games) {
    if (!row || !isBotGame(row)) continue;
    const at = toTime(row.created_at);
    if (at === null) continue;
    const outcome = normalizeOutcome(row.result);
    trackTime(at);

    if (typeof row.duration_seconds === "number" && row.duration_seconds > 0) {
      totalPlaySeconds += row.duration_seconds;
    }
    if (typeof row.moves_count === "number" && row.moves_count > 0) {
      movesSum += row.moves_count;
      movesSamples += 1;
    }
    const opponent = row.opponent_name?.trim();
    if (opponent) opponentCounts.set(opponent, (opponentCounts.get(opponent) ?? 0) + 1);

    const color = row.player_color === "white" || row.player_color === "black" ? row.player_color : null;
    if (outcome) {
      outcomes.push({ at, outcome });
      addToRecord(botRecord, outcome);
      if (color === "white") addToRecord(asWhite, outcome);
      else if (color === "black") addToRecord(asBlack, outcome);
    }
    recent.push({
      id: row.id,
      kind: "bot",
      opponent: opponent || "?",
      result: outcome,
      playerColor: color,
      createdAt: row.created_at,
      movesCount: row.moves_count ?? null,
      at,
    });
  }

  const pvpRecord = emptyColorRecord();
  const pvpOpponents = new Map<string, { name: string; count: number }>();
  const categoryCounts = new Map<PvpCategory, number>();

  for (const row of input.pvpGames) {
    if (!row?.white_user_id) continue;
    const outcome = pvpOutcomeForUser({ ...row, white_user_id: row.white_user_id }, userId);
    const at = toTime(row.updated_at) ?? toTime(row.created_at);
    if (!outcome || at === null) continue;
    const isWhite = row.white_user_id === userId;
    trackTime(at);
    outcomes.push({ at, outcome });
    addToRecord(pvpRecord, outcome);

    const opponentId = isWhite ? row.black_user_id : row.white_user_id;
    const opponentName = (isWhite ? row.black_display_name : row.white_display_name)?.trim() || "?";
    if (opponentId) {
      const entry = pvpOpponents.get(opponentId) ?? { name: opponentName, count: 0 };
      entry.count += 1;
      pvpOpponents.set(opponentId, entry);
    }
    const category = pvpCategoryFromPreset(row.time_preset);
    if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    recent.push({
      id: row.id,
      kind: "pvp",
      opponent: opponentName,
      result: outcome,
      playerColor: isWhite ? "white" : "black",
      createdAt: new Date(at).toISOString(),
      movesCount: null,
      at,
    });
  }

  const totalWins = botRecord.wins + pvpRecord.wins;
  const totalGames = botRecord.total + pvpRecord.total;
  const streaks = dayStreaks(new Set(dayCounts.keys()), todayKey);
  const favoriteOpponent = mostFrequent(opponentCounts);
  const favoriteSlot = mostFrequent(hourBuckets);
  let favoritePvp: { userId: string; name: string; count: number } | null = null;
  for (const [id, entry] of pvpOpponents) {
    if (!favoritePvp || entry.count > favoritePvp.count) favoritePvp = { userId: id, ...entry };
  }

  let ascension: AccountStats["ascension"] = null;
  if (input.ascension) {
    const tier = normalizeTier(input.ascension.tier);
    ascension = {
      tier,
      elo: Math.max(0, input.ascension.elo ?? 0),
      xp: Math.max(0, input.ascension.xp ?? 0),
      puzzlesSolved: input.ascension.puzzlesSolved,
      nextTier: nextTierAfter(tier),
      toNextTier: countToNextTier(input.ascension.puzzlesSolved),
    };
  }

  const recentGames = recent
    .sort((a, b) => b.at - a.at)
    .slice(0, RECENT_GAMES_LIMIT)
    .map(({ at: _at, ...game }) => game);

  const lastPlayed = lastPlayedAt as number | null;
  const base: Omit<AccountStats, "achievements"> = {
    overview: {
      totalGames,
      wins: totalWins,
      losses: botRecord.losses + pvpRecord.losses,
      draws: botRecord.draws + pvpRecord.draws,
      winRate: winRate(totalWins, totalGames),
      currentStreak: currentStreak(outcomes),
      bestWinStreak: bestWinStreak(outcomes),
      lastPlayedAt: lastPlayed === null ? null : new Date(lastPlayed).toISOString(),
    },
    bots: {
      total: botRecord.total,
      wins: botRecord.wins,
      losses: botRecord.losses,
      draws: botRecord.draws,
      winRate: winRate(botRecord.wins, botRecord.total),
      totalPlaySeconds,
      avgMoves: movesSamples > 0 ? Math.round(movesSum / movesSamples) : null,
      asWhite,
      asBlack,
      favoriteOpponent: favoriteOpponent ? { name: favoriteOpponent[0], count: favoriteOpponent[1] } : null,
    },
    activity: {
      days: buildActivityDays(dayCounts, todayKey),
      activeDays: dayCounts.size,
      currentDayStreak: streaks.current,
      bestDayStreak: streaks.best,
      favoriteTimeOfDay: favoriteSlot?.[0] ?? null,
      playedAtNight,
    },
    pvp: {
      total: pvpRecord.total,
      wins: pvpRecord.wins,
      losses: pvpRecord.losses,
      draws: pvpRecord.draws,
      winRate: winRate(pvpRecord.wins, pvpRecord.total),
      favoriteOpponent: favoritePvp,
      favoriteCategory: mostFrequent(categoryCounts)?.[0] ?? null,
      league: input.league,
    },
    ascension,
    avatars: Math.max(0, input.avatars),
    recentGames,
  };

  return { ...base, achievements: computeAchievements(base) };
}
