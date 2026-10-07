export type AccountPreferences = {
  botEngine?: "chessavatar" | "stockfish" | "auto";
};

export type AccountProfile = {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  memberSince: string | null;
  email?: string;
  preferences?: AccountPreferences;
};

export type AccountFriend = {
  friendUserId: string;
  label: string;
  addedAt: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AccountProfilePatch = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  preferences?: AccountPreferences;
};

export type GameOutcome = "win" | "loss" | "draw";

export type ColorRecord = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type PvpCategory = "bullet" | "blitz" | "rapid" | "classical" | "correspondence";

export type AccountStreak = {
  outcome: GameOutcome | null;
  count: number;
};

export type AccountActivityDay = {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  count: number;
};

export type AccountRecentGame = {
  id: string;
  kind: "bot" | "pvp";
  opponent: string;
  result: GameOutcome | null;
  playerColor: "white" | "black" | null;
  createdAt: string;
  movesCount: number | null;
};

export type AchievementId =
  | "first_game"
  | "first_win"
  | "games_10"
  | "games_50"
  | "games_100"
  | "win_streak_5"
  | "collector"
  | "duelist"
  | "pvp_winner"
  | "ascension_bronze"
  | "ascension_gold"
  | "night_owl"
  | "regular";

export type Achievement = {
  id: AchievementId;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type AccountStats = {
  overview: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    currentStreak: AccountStreak;
    bestWinStreak: number;
    lastPlayedAt: string | null;
  };
  bots: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalPlaySeconds: number;
    avgMoves: number | null;
    asWhite: ColorRecord;
    asBlack: ColorRecord;
    favoriteOpponent: { name: string; count: number } | null;
  };
  activity: {
    days: AccountActivityDay[];
    activeDays: number;
    currentDayStreak: number;
    bestDayStreak: number;
    favoriteTimeOfDay: TimeOfDay | null;
    playedAtNight: boolean;
  };
  pvp: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    favoriteOpponent: { userId: string; name: string; count: number } | null;
    favoriteCategory: PvpCategory | null;
    league: { rating: number; rank: number; wins: number; losses: number; draws: number } | null;
  };
  ascension: {
    tier: string;
    elo: number;
    xp: number;
    puzzlesSolved: number;
    nextTier: string | null;
    toNextTier: number | null;
  } | null;
  avatars: number;
  recentGames: AccountRecentGame[];
  achievements: Achievement[];
};
