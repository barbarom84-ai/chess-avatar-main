export const PIECE_EMOJI_IDS = [
  "wK",
  "wQ",
  "wR",
  "wB",
  "wN",
  "wP",
  "bK",
  "bQ",
  "bR",
  "bB",
  "bN",
  "bP",
] as const;

export type PieceEmojiId = (typeof PIECE_EMOJI_IDS)[number];

export const STICKER_EMOJI_IDS = [
  "check",
  "brilliancy",
  "blunder",
  "trophy",
  "fire",
  "think",
] as const;

export type StickerEmojiId = (typeof STICKER_EMOJI_IDS)[number];

export const STANDARD_CHAT_EMOJIS = [
  "😂",
  "🔥",
  "👍",
  "❤️",
  "😎",
  "🤔",
  "👏",
  "🎯",
  "💪",
  "♟️",
  "👑",
  "⚡",
  "😅",
  "🏆",
] as const;

const MARK_BODY =
  "wK|wQ|wR|wB|wN|wP|bK|bQ|bR|bB|bN|bP|check|brilliancy|blunder|trophy|fire|think";

export const CHAT_EMOJI_MARK_RE = new RegExp(`:ca_(${MARK_BODY}):`, "g");

export function chatEmojiShortcode(id: PieceEmojiId | StickerEmojiId): string {
  return `:ca_${id}:`;
}

export function isPieceEmojiId(id: string): id is PieceEmojiId {
  return (PIECE_EMOJI_IDS as readonly string[]).includes(id);
}

export function isStickerEmojiId(id: string): id is StickerEmojiId {
  return (STICKER_EMOJI_IDS as readonly string[]).includes(id);
}

export type ChatEmojiPart =
  | { type: "text"; value: string }
  | { type: "mark"; id: PieceEmojiId | StickerEmojiId };

export function parseChatWithEmojis(text: string): ChatEmojiPart[] {
  const parts: ChatEmojiPart[] = [];
  let last = 0;
  const re = new RegExp(CHAT_EMOJI_MARK_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    const id = match[1];
    if (isPieceEmojiId(id) || isStickerEmojiId(id)) {
      parts.push({ type: "mark", id });
    } else {
      parts.push({ type: "text", value: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}
