"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { PvpActiveGameSummary } from "@/lib/api-contract";
import { pickBannerGames } from "@/lib/pvp-active-games";

const POLL_MS = 10_000;

/** Floating reminder of the user's live PvP games on every page except the game being viewed. */
export default function PvpActiveGameBanner() {
  const { t } = useLanguage();
  const m = t.playOnline.multiGame;
  const anonymous = t.playOnline.anonymousHost;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewedGameId = pathname === "/online" ? searchParams.get("game") : null;
  const [token, setToken] = useState<string | null>(null);
  const [games, setGames] = useState<PvpActiveGameSummary[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    void client.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setGames([]);
      return;
    }
    try {
      const res = await fetch("/api/pvp/games?scope=active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json().catch(() => null)) as { activeGames?: unknown } | null;
      setGames(Array.isArray(json?.activeGames) ? (json.activeGames as PvpActiveGameSummary[]) : []);
    } catch {
      // Keep the last known list on network errors.
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname, viewedGameId]);

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, refresh]);

  const shown = useMemo(() => pickBannerGames(games, viewedGameId), [games, viewedGameId]);
  const game = shown[0];
  if (!game) return null;

  const name = game.opponent_display_name?.trim() || anonymous;
  const others = shown.length - 1;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-40 md:inset-x-auto md:bottom-5 md:left-[calc(50%+1.75rem)] md:-translate-x-1/2"
    >
      <div
        className={`flex items-center gap-3 rounded-xl border px-3 py-2 shadow-lg backdrop-blur ${
          game.is_my_turn
            ? "border-cyan-400/60 bg-cyan-950/90 shadow-cyan-500/20"
            : "border-slate-700 bg-slate-900/90"
        }`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800">
          <Gamepad2 className="h-4 w-4 text-cyan-300" aria-hidden />
          {game.is_my_turn && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">
            {m.bannerTitle.replace("{name}", name)}
          </p>
          <p className={`text-xs ${game.is_my_turn ? "text-cyan-300" : "text-slate-400"}`}>
            {game.is_my_turn ? m.yourTurn : m.bannerWaiting.replace("{name}", name)}
            {others > 0 && (
              <span className="text-slate-500"> · {m.bannerMore.replace("{count}", String(others))}</span>
            )}
          </p>
        </div>
        <Link
          href={`/online?game=${game.id}`}
          className="shrink-0 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          {m.bannerResume}
        </Link>
      </div>
    </div>
  );
}
