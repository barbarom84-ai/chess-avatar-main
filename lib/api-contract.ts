/**
 * Success response shapes of the API routes consumed by the Android app.
 *
 * Routes return `{ ... } satisfies <Type>`, and `scripts/parity-api-fixtures.ts` builds sample
 * responses with the same types; `npm run parity:export` writes them to `parity/api-fixtures/`
 * where Android decodes them with its production models (ApiFixturesParityTest).
 */
import type { AccountFriend } from "@/lib/account-types";
import type { ArenaFeaturedOption } from "@/lib/arena-featured-profiles";
import type { DbCampaignTrack } from "@/lib/ascension/campaign-tracks";
import type { PuzzleRewardResult } from "@/lib/ascension/progression";
import type { mapDbChampionCard } from "@/lib/ascension/server-auth";
import type { DbCampaignPuzzle } from "@/lib/ascension/types";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import type { OpeningCatalogEntry } from "@/lib/openings-catalog-export";
import type { PvpChatMessage } from "@/lib/pvp-chat";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";

type Role = "white" | "black";

// --- PvP ---------------------------------------------------------------------

export type PvpOkResponse = { ok: true };

export type PvpMatchedResponse = {
  matched: true;
  gameId: string;
  role: Role;
  game: PvpGameRow;
  serverNow: number;
  inQueue?: false;
  reused?: true;
};

export type PvpQueuedResponse = {
  inQueue: true;
  matched?: false;
  timePreset: string;
  queueSize: number;
};

export type PvpMatchmakingResponse = { inQueue: false } | PvpMatchedResponse | PvpQueuedResponse;

type PvpClockSummary = {
  time_preset: string;
  clock_mode: string;
  clock_initial_sec: number;
  clock_increment_sec: number;
};

export type PvpLobbySummary = PvpClockSummary & {
  id: string;
  created_at: string;
  isHost: boolean;
  host_user_id: string;
  host_display_name: string | null;
  host_avatar_url: string | null;
};

export type PvpActiveGameSummary = PvpClockSummary & {
  id: string;
  created_at: string;
  updated_at: string;
  role: Role;
  opponent_user_id: string;
  opponent_display_name: string | null;
  opponent_avatar_url: string | null;
  move_count: number;
  is_my_turn: boolean;
};

export type PvpPendingRematchSummary = PvpClockSummary & {
  id: string;
  created_at: string;
  direction: "incoming" | "outgoing";
  opponent_user_id: string;
  opponent_display_name: string | null;
  opponent_avatar_url: string | null;
  can_cancel: boolean;
};

export type PvpPendingInviteSummary = PvpClockSummary & {
  id: string;
  created_at: string;
  host_user_id: string;
  host_display_name: string | null;
  host_avatar_url: string | null;
};

export type PvpGamesListResponse = {
  games: PvpLobbySummary[];
  activeGames: PvpActiveGameSummary[];
  pendingRematches: PvpPendingRematchSummary[];
  pendingInvites: PvpPendingInviteSummary[];
};

/** Columns selected by POST /api/pvp/games right after inserting a new lobby. */
export type PvpCreatedLobbyGame = Pick<
  PvpGameRow,
  | "id"
  | "status"
  | "white_user_id"
  | "black_user_id"
  | "created_at"
  | "time_preset"
  | "clock_mode"
  | "clock_initial_sec"
  | "clock_increment_sec"
  | "white_display_name"
  | "black_display_name"
>;

export type PvpCreateGameResponse =
  | { game: PvpCreatedLobbyGame }
  | { game: PvpGameRow; reused: true };

export type PvpGameDetailResponse = {
  game: PvpGameRow;
  moves: PvpMoveRow[];
  role: Role | null;
  canJoin: boolean;
  canAcceptRematch: boolean;
  canCancelLobby: boolean;
  isSpectator: boolean;
  serverNow: number;
};

export type PvpJoinResponse = { game: PvpGameRow; role: Role; serverNow: number };

export type PvpMoveResponse = {
  ok: true;
  ply: number;
  uci: string;
  move: PvpMoveRow;
  game: Partial<PvpGameRow>;
  gameOver: boolean;
  result: string | null;
  resultReason: string | null;
  serverNow: number;
};

export type PvpResignResponse = { ok: true; result: string; resultReason: "resignation"; serverNow: number };

export type PvpDrawResponse =
  | { ok: true; drawOfferedBy: string | null; serverNow: number; drawOffersCount?: number }
  | { ok: true; result: "1/2-1/2"; resultReason: "draw_agreed"; serverNow: number };

export type PvpTakebackResponse =
  | { ok: true; takebackOfferedBy: string | null; serverNow: number }
  | { ok: true; removedPly: number; game: Partial<PvpGameRow>; serverNow: number };

export type PvpRematchResponse = {
  gameId: string;
  game: PvpGameRow;
  inviteUrl: string | null;
  role: Role;
  serverNow: number;
  started?: boolean;
};

export type PvpChatListResponse = { messages: PvpChatMessage[] };
export type PvpChatPostResponse = { ok: true; message: PvpChatMessage };

export type FriendsListResponse = { friends: AccountFriend[] };

// --- Coach, platforms, puzzles, openings, arena, billing ----------------------

export type CoachChatResponse = { reply: string; remaining: number | null; limit: number | null };

export type PlatformGamesResponse = {
  games: unknown[];
  avatarUrl: string | null;
  platformRating: number | null;
};

export type PuzzleResponse = NormalizedLichessPuzzle;

export type OpeningCatalogResponse = { catalog: OpeningCatalogEntry[]; generatedAt: string };

export type ArenaChampionsResponse = {
  success: true;
  count: number;
  options: ArenaFeaturedOption[];
  canPersist: boolean;
  hasSeedOwner: boolean;
};

export type StripeCheckoutResponse = { url: string | null };

// --- Ascension -----------------------------------------------------------------

export type AscensionChampionCard = ReturnType<typeof mapDbChampionCard>;
export type AscensionCampaignPuzzle = DbCampaignPuzzle & {
  completed: boolean;
  attempts: number;
  locked: boolean;
  premiumLocked: boolean;
};

export type AscensionInitResponse = { card: AscensionChampionCard };

export type AscensionCardResponse = {
  card: AscensionChampionCard;
  unlockedSkills: string[];
  completedPuzzleIds: string[];
};

export type AscensionPatchCardResponse = { card: AscensionChampionCard };

export type AscensionPuzzlesResponse = {
  puzzles: AscensionCampaignPuzzle[];
  tracks: DbCampaignTrack[];
  playerElo: number;
  isPremium: boolean;
  trackUnlock: Record<string, boolean>;
  mainCampaignComplete: boolean;
  fantasyTrackUnlocked: boolean;
  premiumPuzzlesPerTrack: number;
  freePuzzlesPerTrack: number;
};

export type AscensionCompleteResponse =
  | { solved: false }
  | {
      solved: true;
      rewards: PuzzleRewardResult;
      achievement: "elo_cap_3000" | undefined;
      card: AscensionChampionCard | null;
    };

export type AscensionUnlockSkillResponse = { card: AscensionChampionCard | null; unlockedSkillId: string };
