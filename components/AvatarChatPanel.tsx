"use client";

import { useCallback, useRef, useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AvatarChatPanelProps {
  stats: PersonaStats;
  config: EngineConfig;
}

export default function AvatarChatPanel({ stats, config }: AvatarChatPanelProps) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
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
          history: [...messages, userMsg].slice(-8),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "QUOTA_EXCEEDED") toast.error(t.avatarChat.quotaExceeded);
        else toast.error(t.errors.genericError);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, stats, config, lang, t]);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-purple-400" />
          {t.avatarChat.title}
        </CardTitle>
        <p className="text-xs text-slate-500">{t.avatarChat.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-2 text-sm"
        >
          {messages.length === 0 ? (
            <p className="text-slate-600 text-center py-6">{stats.username}…</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto bg-cyan-900/50 text-cyan-100"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.avatarChat.thinking}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.avatarChat.placeholder}
            className="bg-slate-950 border-slate-700"
            onKeyDown={(e) => e.key === "Enter" && void send()}
            disabled={loading}
          />
          <Button onClick={() => void send()} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
