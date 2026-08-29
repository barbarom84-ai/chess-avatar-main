"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPieceImagePath,
  useChessboardSettings,
  type PieceSet,
} from "@/contexts/ChessboardSettingsContext";
import {
  PIECE_EMOJI_IDS,
  STANDARD_CHAT_EMOJIS,
  STICKER_EMOJI_IDS,
  chatEmojiShortcode,
  isPieceEmojiId,
  parseChatWithEmojis,
  type PieceEmojiId,
  type StickerEmojiId,
} from "@/lib/chat-emojis";
import { ChessAvatarSticker } from "@/components/chat/chess-avatar-stickers";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AvatarChatPanelProps {
  stats: PersonaStats;
  config: EngineConfig;
  avatarUrl?: string | null;
  variant?: "card" | "page" | "review";
  houseCoach?: boolean;
  reviewContext?: {
    fen?: string;
    lastMove?: string;
    classification?: string;
  };
}

function pieceLetter(id: PieceEmojiId): "K" | "Q" | "R" | "B" | "N" | "P" {
  return id.slice(1) as "K" | "Q" | "R" | "B" | "N" | "P";
}

function PieceEmojiImg({
  id,
  pieceSet,
  title,
  className,
}: {
  id: PieceEmojiId;
  pieceSet: PieceSet;
  title: string;
  className?: string;
}) {
  return (
    <Image
      src={getPieceImagePath(pieceSet, id[0], pieceLetter(id))}
      alt={title}
      width={28}
      height={28}
      title={title}
      className={cn("object-contain", className)}
      unoptimized
    />
  );
}

function CoachFace({
  src,
  name,
  size,
}: {
  src?: string | null;
  name: string;
  size: number;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 shadow-[0_0_12px_rgba(0,255,255,0.35)] bg-slate-950"
      style={{ width: size, height: size }}
    >
      <Image
        src={src || "/knight-logo.png"}
        alt={name}
        width={size}
        height={size}
        className="object-cover"
        unoptimized={Boolean(src)}
      />
    </div>
  );
}

function ChatRichText({
  text,
  pieceSet,
  markTitle,
}: {
  text: string;
  pieceSet: PieceSet;
  markTitle: (id: PieceEmojiId | StickerEmojiId) => string;
}) {
  const parts = parseChatWithEmojis(text);
  if (parts.length === 1 && parts[0].type === "text") {
    return <>{text}</>;
  }
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") return <span key={i}>{part.value}</span>;
        if (isPieceEmojiId(part.id)) {
          return (
            <PieceEmojiImg
              key={i}
              id={part.id}
              pieceSet={pieceSet}
              title={markTitle(part.id)}
              className="mx-0.5 inline-block h-5 w-5 align-text-bottom"
            />
          );
        }
        return (
          <ChessAvatarSticker
            key={i}
            id={part.id}
            title={markTitle(part.id)}
            className="mx-0.5 inline-block h-5 w-5 align-text-bottom"
          />
        );
      })}
    </>
  );
}

export default function AvatarChatPanel({
  stats,
  config,
  avatarUrl,
  variant = "card",
  houseCoach = false,
  reviewContext,
}: AvatarChatPanelProps) {
  const { t, lang } = useLanguage();
  const { settings } = useChessboardSettings();
  const pieceSet = settings.pieceSet;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const photo = avatarUrl || config.avatarUrl || stats.avatarUrl;
  const welcome = houseCoach
    ? t.avatarChat.welcomeHouse
    : t.avatarChat.welcome.replace("{name}", stats.username);
  const title = t.avatarChat.titleWithName.replace("{name}", stats.username);
  const quotaLabel =
    remaining != null && limit != null
      ? t.avatarChat.quotaLeft
          .replace("{remaining}", String(remaining))
          .replace("{limit}", String(limit))
      : t.avatarChat.subtitle;

  const markTitle = useCallback(
    (id: PieceEmojiId | StickerEmojiId) => {
      const pieceNames: Record<string, string> = {
        K: t.avatarChat.emojiKing,
        Q: t.avatarChat.emojiQueen,
        R: t.avatarChat.emojiRook,
        B: t.avatarChat.emojiBishop,
        N: t.avatarChat.emojiKnight,
        P: t.avatarChat.emojiPawn,
      };
      if (isPieceEmojiId(id)) {
        const color = id.startsWith("w") ? t.avatarChat.emojiWhite : t.avatarChat.emojiBlack;
        return `${color} ${pieceNames[id.slice(1)]}`;
      }
      const stickers: Record<StickerEmojiId, string> = {
        check: t.avatarChat.emojiCheck,
        brilliancy: t.avatarChat.emojiBrilliancy,
        blunder: t.avatarChat.emojiBlunder,
        trophy: t.avatarChat.emojiTrophy,
        fire: t.avatarChat.emojiFire,
        think: t.avatarChat.emojiThink,
      };
      return stickers[id];
    },
    [t]
  );

  const suggestions = useMemo(() => {
    if (variant === "review") {
      return [...t.avatarChat.reviewSuggestions].slice(0, 4);
    }
    const base = [...t.avatarChat.suggestions];
    if (config.favoriteOpening) {
      base.unshift(
        t.avatarChat.suggestionOpening.replace("{opening}", config.favoriteOpening)
      );
    }
    return base.slice(0, 4);
  }, [
    t.avatarChat.suggestions,
    t.avatarChat.reviewSuggestions,
    t.avatarChat.suggestionOpening,
    config.favoriteOpening,
    variant,
  ]);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      if (!isSupabaseConfigured || !supabase) {
        toast.error(t.avatarChat.notAuthenticated);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t.avatarChat.notAuthenticated);
        return;
      }

      setInput("");
      setPickerOpen(false);
      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/coach/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: text,
            lang,
            stats: {
              username: stats.username,
              style: stats.style,
              winRate: stats.winRate,
              topOpenings: stats.topOpenings,
            },
            config: {
              playStyle: config.playStyle,
              elo: config.elo,
              favoriteOpening: config.favoriteOpening,
            },
            role: houseCoach ? "house" : "persona",
            review: reviewContext,
            history: [...messages, userMsg].slice(-8),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error === "QUOTA_EXCEEDED") toast.error(t.avatarChat.quotaExceeded);
          else toast.error(t.errors.genericError);
          return;
        }

        if (typeof data.remaining === "number") setRemaining(data.remaining);
        if (typeof data.limit === "number") setLimit(data.limit);

        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setTimeout(
          () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
          50
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, stats, config, lang, t, houseCoach, reviewContext]
  );

  const insertToken = (token: string) => {
    setInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${token} `);
    inputRef.current?.focus();
  };

  const identity = (
    <div className="flex items-center gap-3 min-w-0">
      <CoachFace src={photo} name={stats.username} size={variant === "page" ? 48 : 40} />
      <div className="min-w-0">
        <div className="font-semibold text-cyan-100 truncate">{title}</div>
        <p className="text-xs text-slate-500 truncate">{quotaLabel}</p>
      </div>
    </div>
  );

  const thread = (
    <>
      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-auto rounded-xl bg-slate-950/80 border border-cyan-500/20 p-3 space-y-3 text-sm",
          variant === "page" ? "flex-1 min-h-[46vh]" : variant === "review" ? "h-40" : "h-52"
        )}
      >
        <div className="flex items-start gap-2 py-1">
          <CoachFace src={photo} name={stats.username} size={32} />
          <div className="rounded-2xl rounded-tl-sm bg-slate-800/90 border border-slate-700 px-3 py-2 text-slate-200">
            {welcome}
          </div>
        </div>
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && <CoachFace src={photo} name={stats.username} size={28} />}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2",
                m.role === "user"
                  ? "rounded-br-sm bg-cyan-500 text-slate-950"
                  : "rounded-bl-sm bg-slate-800 text-slate-200 border border-slate-700"
              )}
            >
              <ChatRichText text={m.content} pieceSet={pieceSet} markTitle={markTitle} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 pl-10">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.avatarChat.thinking}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
          {t.avatarChat.suggestionsLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void sendText(q)}
              className="text-left text-xs rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-100 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex gap-2 items-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 h-10 w-10"
          aria-label={t.avatarChat.emojisLabel}
          onClick={() => setPickerOpen((o) => !o)}
        >
          <span className="text-lg leading-none">♟️</span>
        </Button>
        {pickerOpen && (
          <div className="absolute bottom-12 left-0 z-20 w-[18.5rem] rounded-xl border border-cyan-500/30 bg-slate-950 p-3 shadow-xl space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                {t.avatarChat.emojiPieces}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {PIECE_EMOJI_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    title={markTitle(id)}
                    onClick={() => insertToken(chatEmojiShortcode(id))}
                    className="h-9 w-9 rounded-lg p-1 hover:bg-cyan-500/15"
                  >
                    <PieceEmojiImg id={id} pieceSet={pieceSet} title={markTitle(id)} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                {t.avatarChat.emojiStickers}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {STICKER_EMOJI_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    title={markTitle(id)}
                    onClick={() => insertToken(chatEmojiShortcode(id))}
                    className="h-9 w-9 rounded-lg p-1.5 hover:bg-cyan-500/15"
                  >
                    <ChessAvatarSticker id={id} title={markTitle(id)} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                {t.avatarChat.emojiStandard}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {STANDARD_CHAT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertToken(emoji)}
                    className="h-8 w-8 rounded-lg text-lg hover:bg-cyan-500/15"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.avatarChat.placeholder}
          className="bg-slate-950 border-slate-700 h-10"
          onKeyDown={(e) => e.key === "Enter" && void sendText(input)}
          disabled={loading}
        />
        <Button
          onClick={() => void sendText(input)}
          disabled={loading || !input.trim()}
          className="h-10 bg-cyan-500 hover:bg-cyan-400 text-slate-950"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  if (variant === "page") {
    return (
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {identity}
        {thread}
      </div>
    );
  }

  return (
    <Card className="bg-slate-900 border-cyan-500/20">
      <CardHeader className="pb-3">{identity}</CardHeader>
      <CardContent className="space-y-3">{thread}</CardContent>
    </Card>
  );
}
