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
