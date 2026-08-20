"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import AccountAvatar from "@/components/AccountAvatar";
import { accountProfileInitials } from "@/lib/account-profile";
import { useLanguage } from "@/lib/language-context";
import type { PvpChatMessage } from "@/lib/pvp-chat";

type OnlinePvpChatPanelProps = {
  messages: PvpChatMessage[];
  loading: boolean;
  disabled: boolean;
  userId: string | null;
  onSend: (body: string) => Promise<void>;
};

function formatRelativeTime(iso: string, lang: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return lang === "fr" ? "à l'instant" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return lang === "fr" ? `il y a ${min} min` : `${min}m ago`;
  const h = Math.floor(min / 60);
  return lang === "fr" ? `il y a ${h} h` : `${h}h ago`;
}

export default function OnlinePvpChatPanel({
  messages,
  loading,
  disabled,
  userId,
  onSend,
}: OnlinePvpChatPanelProps) {
  const { t, lang } = useLanguage();
  const c = t.playOnline.chat;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled || sending) return;
      setSending(true);
      try {
        await onSend(trimmed);
        setDraft("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : c.sendFailed);
      } finally {
        setSending(false);
      }
    },
    [disabled, sending, onSend, c.sendFailed]
  );

  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <ScrollArea className="flex-1 min-h-[160px] max-h-[min(280px,35dvh)] rounded-md border border-slate-800 bg-slate-950/40">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500 p-3">{c.empty}</p>
        ) : (
          <ul className="p-2 space-y-2">
            {messages.map((m) => {
              const mine = m.user_id === userId;
              const name = m.display_name ?? c.anonymous;
              return (
                <li
                  key={m.id}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-700">
                    <AccountAvatar
                      src={m.avatar_url}
                      alt={name}
                      initials={accountProfileInitials(name)}
                      sizes="28px"
                      className="text-[9px]"
                    />
                  </div>
                  <div className={`min-w-0 max-w-[85%] ${mine ? "text-right" : ""}`}>
                    <p className="text-[10px] text-slate-500 mb-0.5">
                      {name} · {formatRelativeTime(m.created_at, lang)}
                    </p>
                    <p
                      className={`text-sm rounded-lg px-2.5 py-1.5 break-words ${
                        mine
                          ? "bg-cyan-900/50 text-cyan-50"
                          : "bg-slate-800/80 text-slate-200"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
        )}
      </ScrollArea>

      {!disabled && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {c.quickMessages.map((msg) => (
              <Button
                key={msg}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] border-slate-700 px-2"
                disabled={sending}
                onClick={() => void submit(msg)}
              >
                {msg}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={c.placeholder}
              disabled={sending}
              maxLength={500}
              className="text-sm bg-slate-950 border-slate-700"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </form>
        </>
      )}
      {disabled && (
        <p className="text-xs text-slate-500 text-center py-2">{c.closed}</p>
      )}
    </div>
  );
}
