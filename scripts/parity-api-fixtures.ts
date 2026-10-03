/**
 * Sample success responses for every API route consumed by ChessAvatarAndroid, keyed by
 * "METHOD path" exactly as declared in the Android Retrofit interfaces.
 *
 * Each variant is type-checked against `lib/api-contract.ts` (the same types the routes
 * `satisfies`), and is built through the real mappers where the route uses one, so a change
 * to a response shape either fails `tsc` here or changes the exported fixtures.
 */
import type {
  AscensionCampaignPuzzle,
  AscensionCardResponse,
  AscensionCompleteResponse,
  AscensionInitResponse,
  AscensionPatchCardResponse,
  AscensionPuzzlesResponse,
  AscensionUnlockSkillResponse,
  ArenaChampionsResponse,
  CoachChatResponse,
  FriendsListResponse,
  OpeningCatalogResponse,
  PlatformGamesResponse,
  PuzzleResponse,
  PvpChatListResponse,
  PvpChatPostResponse,
  PvpCreateGameResponse,
  PvpDrawResponse,
  PvpGameDetailResponse,
  PvpGamesListResponse,
  PvpJoinResponse,
  PvpMatchmakingResponse,
  PvpMoveResponse,
  PvpOkResponse,
  PvpRematchResponse,
  PvpResignResponse,
  PvpTakebackResponse,
  StripeCheckoutResponse,
} from "../lib/api-contract";
import { ASCENSION_FREE_PUZZLES_PER_TRACK, ASCENSION_PREMIUM_PUZZLES_PER_TRACK } from "../lib/ascension/constants";
import { computePuzzleRewards } from "../lib/ascension/progression";
import { mapDbCampaignTrack } from "../lib/ascension/campaign-tracks";
import { mapDbCampaignPuzzle, mapDbChampionCard } from "../lib/ascension/server-auth";
import { normalizeLichessPuzzlePayload } from "../lib/lichess-puzzle";
import type { OpeningLesson } from "../lib/opening-lessons";
import { buildOpeningCatalog } from "../lib/openings-catalog-export";
import { PERSONALITY_OPPONENTS } from "../lib/personality-opponents";
import { personalityToEngineConfig } from "../lib/personality-to-engine";
import type { PvpChatMessage } from "../lib/pvp-chat";
import type { PvpGameRow, PvpMoveRow } from "../lib/pvp-chess";

const HOST = "11111111-1111-4111-8111-111111111111";
const GUEST = "22222222-2222-4222-8222-222222222222";
const GAME_ID = "33333333-3333-4333-8333-333333333333";
const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);
const ISO = new Date(NOW).toISOString();

const activeGame: PvpGameRow = {
  id: GAME_ID,
  created_at: ISO,
  updated_at: ISO,
  created_by: HOST,
  white_user_id: HOST,
  black_user_id: GUEST,
  status: "playing",
  result: null,
  result_reason: null,
  draw_offered_by: null,
  takeback_offered_by: null,
  clock_mode: "timed",
  clock_initial_sec: 300,
  clock_increment_sec: 3,
  time_preset: "blitz-5-3",
  white_remaining_ms: 298_000,
  black_remaining_ms: 300_000,
  clock_turn_started_at: ISO,
  white_display_name: "Alice",
  black_display_name: "Bob",
  white_draw_offers_count: 0,
  black_draw_offers_count: 1,
  invited_user_id: null,
  rematch_source_game_id: null,
};

/** Only the required columns: older rows and partial selects omit the optional ones. */
const minimalWaitingGame: PvpGameRow = {
  id: GAME_ID,
  created_at: ISO,
  updated_at: ISO,
  created_by: HOST,
  white_user_id: HOST,
  black_user_id: null,
  status: "waiting",
  result: null,
  result_reason: null,
  draw_offered_by: null,
};

/** `select("*")` of an open lobby (reused by POST /api/pvp/games). */
const fullWaitingGame: PvpGameRow = {
  ...activeGame,
  status: "waiting",
  black_user_id: null,
  black_display_name: null,
  white_remaining_ms: null,
  black_remaining_ms: null,
  clock_turn_started_at: null,
  white_draw_offers_count: 0,
  black_draw_offers_count: 0,
};

const finishedGame: PvpGameRow = {
  ...activeGame,
  status: "finished",
  result: "1-0",
  result_reason: "checkmate",
  clock_turn_started_at: null,
};

const correspondenceGame: PvpGameRow = {
  ...activeGame,
  clock_mode: "correspondence",
  clock_initial_sec: 3 * 86_400,
  clock_increment_sec: 0,
  time_preset: "corr-3d",
  white_remaining_ms: null,
  black_remaining_ms: null,
};

const moves: PvpMoveRow[] = [
  { id: 1, game_id: GAME_ID, ply: 1, uci: "e2e4", played_by: HOST, created_at: ISO, time_spent_ms: 2_000 },
  { id: 2, game_id: GAME_ID, ply: 2, uci: "e7e5", played_by: GUEST, created_at: ISO, time_spent_ms: null },
  { id: 3, game_id: GAME_ID, ply: 3, uci: "g1f3", played_by: HOST, created_at: ISO },
];

const chatMessages: PvpChatMessage[] = [
  { id: 10, game_id: GAME_ID, user_id: HOST, body: "Bonne partie !", created_at: ISO, display_name: "Alice", avatar_url: null },
  { id: 11, game_id: GAME_ID, user_id: GUEST, body: "gl hf", created_at: ISO },
];

const clock = { time_preset: "blitz-5-3", clock_mode: "timed", clock_initial_sec: 300, clock_increment_sec: 3 };

const championRow = {
  user_id: HOST,
  display_name: "Alice",
  avatar_url: "https://example.com/a.png",
  class_key: "tactique",
  element: "fire",
  elo: 1240,
  xp: 860,
  tier: "silver",
  customization: { frame: "gold", achievements: { elo_cap_3000: ISO } },
  created_at: ISO,
  updated_at: ISO,
};
const card = mapDbChampionCard(championRow);
const freshCard = mapDbChampionCard({ user_id: GUEST });

const tracks = [
  mapDbCampaignTrack({ slug: "main", label: { fr: "Campagne", en: "Campaign" }, sort_order: 0, layout: "main", unlock_rule: { type: "always" }, is_system: true }),
  mapDbCampaignTrack({ slug: "fantasy", label: { fr: "Fantasy", en: "Fantasy" }, sort_order: 1, layout: "sequential", unlock_rule: { type: "main_complete_or_elo", min_elo: 1500 }, is_system: true }),
  mapDbCampaignTrack({ slug: "endgames", sort_order: 2, layout: "sequential", unlock_rule: { type: "prerequisite_track", track: "main", require_complete: true }, is_system: false }),
];

const campaignPuzzle = (row: Record<string, unknown>, extra: { completed: boolean; attempts: number; locked: boolean; premiumLocked: boolean }) =>
  ({ ...mapDbCampaignPuzzle(row), ...extra }) as AscensionCampaignPuzzle;

const puzzles: AscensionCampaignPuzzle[] = [
  campaignPuzzle(
    {
      id: "p-1",
      slug: "fork-1",
      kind: "standard",
      min_elo: 800,
      max_elo: 1400,
      xp_reward: 20,
      elo_reward: 12,
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      solution_ucis: ["f1b5"],
      prompt: { fr: "Trouvez le meilleur coup", en: "Find the best move" },
      hints: [{ fr: "Clouage", en: "Pin" }],
      insight: { fr: "Le fou cloue le cavalier.", en: "The bishop pins the knight." },
      sort_order: 1,
      track: "main",
      is_published: true,
      updated_at: ISO,
    },
    { completed: true, attempts: 2, locked: false, premiumLocked: false }
  ),
  campaignPuzzle(
    {
      id: "p-2",
      slug: "fantasy-tunnel",
      kind: "fantasy",
      fen: "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1",
      solution_ucis: ["a4e4"],
      fantasy_rules: {
        enabledAbilities: ["rook_tunnel"],
        objective: "reach_square",
        objectiveSquare: "e6",
        specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }],
      },
      sort_order: 2,
      track: "fantasy",
      is_published: true,
    },
    { completed: false, attempts: 0, locked: true, premiumLocked: true }
  ),
];

const rawLichessPuzzle = {
  game: {
    id: "abcd1234",
    pgn: "e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7",
    players: [
      { color: "white", name: "Alice", rating: 1850 },
      { color: "black", name: "Bob" },
    ],
  },
  puzzle: {
    id: "K69di",
    rating: 1720,
    plays: 41234,
    initialPly: 9,
    solution: ["g5g2", "h1f1", "g2e4", "c4e2", "d4f3"],
    themes: ["mateIn3", "kingsideAttack"],
  },
};

function puzzleFixture(): PuzzleResponse {
  const puzzle = normalizeLichessPuzzlePayload(rawLichessPuzzle);
  if (!puzzle) throw new Error("api fixtures: sample Lichess puzzle failed to normalize");
  return puzzle;
}

const lichessGame = {
  id: "q7ZvsdUF",
  rated: true,
  variant: "standard",
  speed: "blitz",
  perf: "blitz",
  createdAt: NOW,
  lastMoveAt: NOW + 300_000,
  status: "mate",
  players: {
    white: { user: { name: "Alice", id: "alice" }, rating: 1850, ratingDiff: 6 },
    black: { user: { name: "Bob", id: "bob" }, rating: 1790, ratingDiff: -6 },
  },
  winner: "white",
  opening: { eco: "C50", name: "Italian Game", ply: 5 },
  moves: "e4 e5 Nf3 Nc6 Bc4 Bc5",
  pgn: '[Event "Rated blitz game"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0\n',
  clock: { initial: 300, increment: 3, totalTime: 420 },
};

const chesscomGame = {
  url: "https://www.chess.com/game/live/1234567890",
  pgn: '[Event "Live Chess"]\n[White "bob"]\n[Black "alice"]\n[Result "0-1"]\n[ECOUrl "https://www.chess.com/openings/Sicilian-Defense"]\n\n1. e4 c5 0-1\n',
  time_control: "180+2",
  end_time: Math.floor(NOW / 1000),
  rated: true,
  time_class: "blitz",
  rules: "chess",
  white: { rating: 1510, result: "resigned", username: "bob" },
  black: { rating: 1534, result: "win", username: "alice" },
};

function arenaOption(index: number, platform: "lichess" | "chesscom", leaderboardRating?: number) {
  const opponent = PERSONALITY_OPPONENTS[index % PERSONALITY_OPPONENTS.length];
  const config = personalityToEngineConfig(opponent, {}, "en");
  const seeded = leaderboardRating !== undefined;
  return {
    key: `${platform}:${opponent.id}`,
    label: config.name,
    config: {
      ...config,
      platform,
      ...(seeded ? { featuredSeed: true, forcedLine: ["e2e4", "e7e5"], avatarUrl: "https://example.com/c.png" } : {}),
    },
    stats: {
      username: config.name,
      ...(seeded ? { avatarUrl: "https://example.com/c.png" } : {}),
      platform,
      gameCount: 120,
      winRate: 54,
      drawRate: 18,
      lossRate: 28,
      style: "Agressif" as const,
      topOpenings: [{ name: "Sicilian Defense", count: 31 }],
      avgMoves: 41,
    },
    savedAt: NOW,
    platform,
    ...(leaderboardRating === undefined ? {} : { leaderboardRating }),
  };
}

type Variants = Record<string, unknown>;

export function buildApiFixtures(lessons: OpeningLesson[]): Record<string, Variants> {
  const matched = {
    matched: true,
    gameId: GAME_ID,
    role: "black",
    game: activeGame,
    serverNow: NOW,
  } as const;

  return {
    "GET api/pvp/matchmaking": {
      idle: { inQueue: false } satisfies PvpMatchmakingResponse,
      matched: { inQueue: false, ...matched } satisfies PvpMatchmakingResponse,
      queued: { inQueue: true, timePreset: "blitz-5-3", queueSize: 2 } satisfies PvpMatchmakingResponse,
    },
    "POST api/pvp/matchmaking": {
      matched: matched satisfies PvpMatchmakingResponse,
      reused: { ...matched, reused: true } satisfies PvpMatchmakingResponse,
      queued: { matched: false, inQueue: true, timePreset: "rapid-10-0", queueSize: 1 } satisfies PvpMatchmakingResponse,
    },
    "DELETE api/pvp/matchmaking": { ok: { ok: true } satisfies PvpOkResponse },

    "GET api/pvp/games": {
      empty: { games: [], activeGames: [], pendingRematches: [], pendingInvites: [] } satisfies PvpGamesListResponse,
      full: {
        games: [
          { id: GAME_ID, created_at: ISO, isHost: true, host_user_id: HOST, host_display_name: "Alice", host_avatar_url: null, ...clock },
        ],
        activeGames: [
          {
            id: GAME_ID,
            created_at: ISO,
            updated_at: ISO,
            role: "white",
            opponent_user_id: GUEST,
            opponent_display_name: null,
            opponent_avatar_url: "https://example.com/b.png",
            ...clock,
            move_count: 12,
            is_my_turn: true,
          },
        ],
        pendingRematches: [
          {
            id: GAME_ID,
            created_at: ISO,
            direction: "incoming",
            opponent_user_id: GUEST,
            opponent_display_name: "Bob",
            opponent_avatar_url: null,
            ...clock,
            can_cancel: false,
          },
        ],
        pendingInvites: [
          { id: GAME_ID, created_at: ISO, host_user_id: HOST, host_display_name: null, host_avatar_url: null, ...clock },
        ],
      } satisfies PvpGamesListResponse,
    },
    "POST api/pvp/games": {
      created: {
        game: {
          id: GAME_ID,
          status: "waiting",
          white_user_id: HOST,
          black_user_id: null,
          created_at: ISO,
          time_preset: "blitz-5-3",
          clock_mode: "timed",
          clock_initial_sec: 300,
          clock_increment_sec: 3,
          white_display_name: "Alice",
          black_display_name: null,
        },
      } satisfies PvpCreateGameResponse,
      reused: { game: fullWaitingGame, reused: true } satisfies PvpCreateGameResponse,
      reusedMinimal: { game: minimalWaitingGame, reused: true } satisfies PvpCreateGameResponse,
    },
    "GET api/pvp/games/{gameId}": {
      player: {
        game: activeGame,
        moves,
        role: "white",
        canJoin: false,
        canAcceptRematch: false,
        canCancelLobby: false,
        isSpectator: false,
        serverNow: NOW,
      } satisfies PvpGameDetailResponse,
      spectatorLobby: {
        game: minimalWaitingGame,
        moves: [],
        role: null,
        canJoin: true,
        canAcceptRematch: false,
        canCancelLobby: false,
        isSpectator: true,
        serverNow: NOW,
      } satisfies PvpGameDetailResponse,
      finished: {
        game: finishedGame,
        moves,
        role: "white",
        canJoin: false,
        canAcceptRematch: false,
        canCancelLobby: false,
        isSpectator: false,
        serverNow: NOW,
      } satisfies PvpGameDetailResponse,
      correspondence: {
        game: correspondenceGame,
        moves,
        role: "black",
        canJoin: false,
        canAcceptRematch: true,
        canCancelLobby: false,
        isSpectator: false,
        serverNow: NOW,
      } satisfies PvpGameDetailResponse,
    },
    "DELETE api/pvp/games/{gameId}": { ok: { ok: true } satisfies PvpOkResponse },
    "POST api/pvp/games/{gameId}/join": {
      joined: { game: activeGame, role: "black", serverNow: NOW } satisfies PvpJoinResponse,
    },
    "POST api/pvp/games/{gameId}/move": {
      ongoing: {
        ok: true,
        ply: 4,
        uci: "b8c6",
        move: { id: 4, game_id: GAME_ID, ply: 4, uci: "b8c6", played_by: GUEST, created_at: ISO, time_spent_ms: 1_500 },
        game: { updated_at: ISO, white_remaining_ms: 298_000, black_remaining_ms: 301_500, clock_turn_started_at: ISO, draw_offered_by: null },
        gameOver: false,
        result: null,
        resultReason: null,
        serverNow: NOW,
      } satisfies PvpMoveResponse,
      checkmate: {
        ok: true,
        ply: 7,
        uci: "h5f7",
        move: { id: 7, game_id: GAME_ID, ply: 7, uci: "h5f7", played_by: HOST, created_at: ISO },
        game: { status: "finished", result: "1-0", result_reason: "checkmate", updated_at: ISO },
        gameOver: true,
        result: "1-0",
        resultReason: "checkmate",
        serverNow: NOW,
      } satisfies PvpMoveResponse,
    },
    "POST api/pvp/games/{gameId}/resign": {
      resigned: { ok: true, result: "0-1", resultReason: "resignation", serverNow: NOW } satisfies PvpResignResponse,
    },
    "POST api/pvp/games/{gameId}/draw": {
      offered: { ok: true, drawOfferedBy: HOST, serverNow: NOW, drawOffersCount: 1 } satisfies PvpDrawResponse,
      declined: { ok: true, drawOfferedBy: null, serverNow: NOW } satisfies PvpDrawResponse,
      accepted: { ok: true, result: "1/2-1/2", resultReason: "draw_agreed", serverNow: NOW } satisfies PvpDrawResponse,
    },
    "POST api/pvp/games/{gameId}/takeback": {
      offered: { ok: true, takebackOfferedBy: GUEST, serverNow: NOW } satisfies PvpTakebackResponse,
      declined: { ok: true, takebackOfferedBy: null, serverNow: NOW } satisfies PvpTakebackResponse,
      accepted: {
        ok: true,
        removedPly: 3,
        game: {
          status: "playing",
          result: null,
          result_reason: null,
          takeback_offered_by: null,
          draw_offered_by: null,
          clock_turn_started_at: ISO,
        },
        serverNow: NOW,
      } satisfies PvpTakebackResponse,
    },
    "POST api/pvp/games/{gameId}/rematch": {
      invite: {
        gameId: GAME_ID,
        game: { ...minimalWaitingGame, rematch_source_game_id: GAME_ID, invited_user_id: GUEST },
        inviteUrl: `https://chessavatar.net/pvp/${GAME_ID}`,
        role: "black",
        serverNow: NOW,
      } satisfies PvpRematchResponse,
      started: {
        gameId: GAME_ID,
        game: activeGame,
        inviteUrl: null,
        role: "white",
        serverNow: NOW,
        started: true,
      } satisfies PvpRematchResponse,
    },
    "GET api/pvp/games/{gameId}/chat": {
      messages: { messages: chatMessages } satisfies PvpChatListResponse,
      empty: { messages: [] } satisfies PvpChatListResponse,
    },
    "POST api/pvp/games/{gameId}/chat": {
      posted: { ok: true, message: chatMessages[0] } satisfies PvpChatPostResponse,
    },
    "GET api/account/friends": {
      friends: {
        friends: [
          { friendUserId: GUEST, label: "Bob", addedAt: ISO, displayName: "Bob", avatarUrl: null },
          { friendUserId: HOST, label: "", addedAt: ISO, displayName: "Alice", avatarUrl: "https://example.com/a.png" },
        ],
      } satisfies FriendsListResponse,
    },
    "DELETE api/account/friends": { empty: { friends: [] } satisfies FriendsListResponse },

    "POST api/coach/chat": {
      free: { reply: "Développez vos pièces avant d'attaquer.", remaining: 4, limit: 10 } satisfies CoachChatResponse,
      premium: { reply: "Play for the d5 break.", remaining: null, limit: null } satisfies CoachChatResponse,
    },
    "GET api/lichess": {
      games: { games: [lichessGame], avatarUrl: null, platformRating: 1850 } satisfies PlatformGamesResponse,
      empty: { games: [], avatarUrl: null, platformRating: null } satisfies PlatformGamesResponse,
    },
    "GET api/chesscom": {
      games: { games: [chesscomGame], avatarUrl: "https://images.chesscomfiles.com/a.png", platformRating: 1534 } satisfies PlatformGamesResponse,
    },
    "GET api/puzzles/daily": { puzzle: puzzleFixture() satisfies PuzzleResponse },
    "GET api/puzzles/random": { puzzle: puzzleFixture() satisfies PuzzleResponse },
    "GET api/openings/catalog": {
      catalog: { catalog: buildOpeningCatalog(lessons).slice(0, 3), generatedAt: ISO } satisfies OpeningCatalogResponse,
    },
    "GET api/arena/champions": {
      champions: {
        success: true,
        count: 2,
        options: [arenaOption(0, "lichess", 3150), arenaOption(1, "chesscom")],
        canPersist: true,
        hasSeedOwner: false,
      } satisfies ArenaChampionsResponse,
    },
    "POST api/stripe/checkout": {
      url: { url: "https://checkout.stripe.com/c/pay/cs_test_123" } satisfies StripeCheckoutResponse,
    },

    "POST api/ascension/init": {
      card: { card } satisfies AscensionInitResponse,
      fresh: { card: freshCard } satisfies AscensionInitResponse,
    },
    "GET api/ascension/card": {
      card: { card, unlockedSkills: ["pawn_greedy", "rook_tunnel"], completedPuzzleIds: ["p-1"] } satisfies AscensionCardResponse,
    },
    "PATCH api/ascension/card": { card: { card } satisfies AscensionPatchCardResponse },
    "GET api/ascension/puzzles": {
      puzzles: {
        puzzles,
        tracks,
        playerElo: card.elo,
        isPremium: false,
        trackUnlock: { main: true, fantasy: false, endgames: false },
        mainCampaignComplete: false,
        fantasyTrackUnlocked: false,
        premiumPuzzlesPerTrack: ASCENSION_PREMIUM_PUZZLES_PER_TRACK,
        freePuzzlesPerTrack: ASCENSION_FREE_PUZZLES_PER_TRACK,
      } satisfies AscensionPuzzlesResponse,
    },
    "POST api/ascension/puzzles/complete": {
      failed: { solved: false } satisfies AscensionCompleteResponse,
      solved: {
        solved: true,
        rewards: computePuzzleRewards(card.elo, card.xp, {
          kind: "standard",
          xpReward: 20,
          eloReward: 12,
          isFirstCompletion: true,
          completedPuzzleCount: 5,
        }),
        achievement: undefined,
        card,
      } satisfies AscensionCompleteResponse,
      eloCap: {
        solved: true,
        rewards: computePuzzleRewards(2995, 9000, {
          kind: "fantasy",
          xpReward: 40,
          eloReward: 20,
          isFirstCompletion: true,
          completedPuzzleCount: 120,
        }),
        achievement: "elo_cap_3000",
        card: mapDbChampionCard({ ...championRow, elo: 3000 }),
      } satisfies AscensionCompleteResponse,
    },
    "POST api/ascension/skills/unlock": {
      unlocked: { card, unlockedSkillId: "rook_tunnel" } satisfies AscensionUnlockSkillResponse,
    },
  };
}
