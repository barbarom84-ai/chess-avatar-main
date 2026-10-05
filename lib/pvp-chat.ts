import type { PvpGameRow } from "@/lib/pvp-chess";

export interface PvpChatMessage {
  id: number;
  game_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export const PVP_CHAT_MAX_BODY_LENGTH = 500;
export const PVP_CHAT_RATE_LIMIT_MS = 2000;

type ChatGameNames = Pick<
  PvpGameRow,
  "white_user_id" | "black_user_id" | "white_display_name" | "black_display_name"
>;

/**
 * The game's stored name wins, like on the player cards. Realtime inserts carry no name,
 * and accounts without a `user_accounts` row have none either.
 */
export function pvpChatSenderName(
  message: Pick<PvpChatMessage, "user_id" | "display_name">,
  game: ChatGameNames | null | undefined
): string | null {
  const gameName =
    game && message.user_id === game.white_user_id
      ? game.white_display_name
      : game && message.user_id === game.black_user_id
        ? game.black_display_name
        : null;
  return gameName?.trim() || message.display_name?.trim() || null;
}
