"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Radio,
  Swords,
  Users,
} from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuperUser } from "@/hooks/useSuperUser";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PvpGameRow } from "@/lib/pvp-chess";

type Snapshot = {
  pvpPlaying: number;
  pvpWaiting: number;
  gamesBot24h: number;
  pvpFinished24h: number;
  activityEvents24h: number;
  subscriptionsActive: Record<string, number>;
  eventCounts24h: Record<string, number>;
  integrations: { sentry: boolean; posthog: boolean };
  generatedAt: string;
};

type ActivityRow = {
  id: number;
  created_at: string;
  user_id: string | null;
  event_name: string;
  path: string | null;
  props: Record<string, unknown>;
};

type PresenceState = {
  user_id: string;
  page: string;
  last_seen: string;
};

async function fetchWithAuth(path: string) {
  if (!supabase) throw new Error("Supabase unavailable");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: HeadersInit = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(path, { headers });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : res.statusText;
    throw new Error(err);
  }
  return json;
}

export default function AdminOpsPage() {
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [pvpLive, setPvpLive] = useState<PvpGameRow[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(
    null
  );

  const refresh = useCallback(async () => {
    if (!isSuperUser) return;
    setLoading(true);
    setError(null);
    try {
      const [snap, ev] = await Promise.all([
        fetchWithAuth("/api/admin/ops/snapshot") as Promise<Snapshot>,
        fetchWithAuth("/api/admin/ops/events?limit=40") as Promise<{ events: ActivityRow[] }>,
      ]);
      setSnapshot(snap);
      setEvents(ev.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [isSuperUser]);

  useEffect(() => {
    if (!isSuperUser) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(id);
  }, [isSuperUser, refresh]);

  useEffect(() => {
    if (!isSuperUser || !isSupabaseConfigured || !supabase) return;

    const client = supabase;

    const loadPvp = async () => {
      const { data } = await client
        .from("pvp_games")
        .select(
          "id, status, white_user_id, black_user_id, white_display_name, created_at, updated_at"
        )
        .in("status", ["playing", "waiting"])
        .order("updated_at", { ascending: false })
        .limit(30);
      setPvpLive((data as PvpGameRow[]) ?? []);
    };

    void loadPvp();

    const ch = client
      .channel("admin:ops:pvp")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pvp_games" },
        () => {
          void loadPvp();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const row = payload.new as ActivityRow | null;
          if (!row?.id) return;
          setEvents((prev) => [row, ...prev].slice(0, 40));
        }
      )
      .subscribe();

    channelRef.current = ch;

    const presenceCh = client.channel("presence:app", {
      config: { presence: { key: "admin-observer" } },
    });

    presenceCh
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState<PresenceState>();
        const all: PresenceState[] = [];
        for (const key of Object.keys(state)) {
          const entries = state[key];
          if (!entries?.length) continue;
          const last = entries[entries.length - 1] as PresenceState;
          if (last?.user_id) all.push(last);
        }
        const byUser = new Map<string, PresenceState>();
        for (const p of all) {
          const prev = byUser.get(p.user_id);
          if (!prev || p.last_seen > prev.last_seen) byUser.set(p.user_id, p);
        }
        setPresenceList(
          [...byUser.values()].sort((a, b) => b.last_seen.localeCompare(a.last_seen))
        );
      })
      .subscribe();

    return () => {
      void client.removeChannel(ch);
      void client.removeChannel(presenceCh);
      channelRef.current = null;
    };
  }, [isSuperUser]);

  const topEvents = useMemo(() => {
    if (!snapshot?.eventCounts24h) return [];
    return Object.entries(snapshot.eventCounts24h)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [snapshot]);

  if (superLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </main>
    );
  }

  if (!isSuperUser) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">Accès réservé aux comptes super (ops).</p>
        <Button asChild variant="outline">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-cyan-400">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rafraîchir"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Sentry <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold neon-cyan flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Ops — temps réel
          </h1>
          <p className="text-slate-400 mt-2">
            Présence, PvP live, événements produit (voir MONITORING.md dans le repo).
          </p>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5 text-cyan-400" />}
            label="En ligne"
            value={presenceList.length}
          />
          <MetricCard
            icon={<Swords className="h-5 w-5 text-amber-400" />}
            label="PvP en cours"
            value={snapshot?.pvpPlaying ?? "—"}
          />
          <MetricCard
            icon={<Radio className="h-5 w-5 text-green-400" />}
            label="Lobbies"
            value={snapshot?.pvpWaiting ?? "—"}
          />
          <MetricCard
            icon={<Activity className="h-5 w-5 text-violet-400" />}
            label="Events 24h"
            value={snapshot?.activityEvents24h ?? "—"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-200">Présence</CardTitle>
              <CardDescription className="theme-text-secondary">
                Channel <code className="text-xs">presence:app</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto text-sm space-y-2">
              {presenceList.length === 0 ? (
                <p className="text-slate-500">Aucun utilisateur tracké.</p>
              ) : (
                presenceList.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex justify-between gap-2 border-b border-slate-800 pb-1"
                  >
                    <span className="font-mono text-xs text-slate-400 truncate max-w-[140px]">
                      {p.user_id.slice(0, 8)}…
                    </span>
                    <span className="text-slate-300 truncate">{p.page}</span>
                    <span className="text-slate-500 text-xs shrink-0">
                      {new Date(p.last_seen).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-200">PvP live</CardTitle>
              <CardDescription className="theme-text-secondary">
                Realtime + SQL
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto text-sm space-y-2">
              {pvpLive.length === 0 ? (
                <p className="text-slate-500">Aucune partie active.</p>
              ) : (
                pvpLive.map((g) => (
                  <div key={g.id} className="flex justify-between gap-2 border-b border-slate-800 pb-1">
                    <span className="text-amber-300">{g.status}</span>
                    <span className="text-slate-400 truncate">
                      {g.white_display_name ?? g.id.slice(0, 8)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="theme-bg-secondary theme-border">
          <CardHeader>
            <CardTitle className="text-lg text-cyan-200">Agrégats 24 h</CardTitle>
            <CardDescription className="theme-text-secondary">
              {snapshot?.generatedAt
                ? `Mis à jour ${new Date(snapshot.generatedAt).toLocaleString()}`
                : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Parties bot</p>
              <p className="text-2xl font-semibold text-white">{snapshot?.gamesBot24h ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">PvP terminées</p>
              <p className="text-2xl font-semibold text-white">{snapshot?.pvpFinished24h ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Abonnements actifs</p>
              <p className="text-slate-300 font-mono text-xs mt-1">
                {snapshot
                  ? JSON.stringify(snapshot.subscriptionsActive)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Intégrations</p>
              <p className="text-slate-300 text-xs mt-1">
                Sentry: {snapshot?.integrations.sentry ? "oui" : "non"} · PostHog:{" "}
                {snapshot?.integrations.posthog ? "oui" : "non"}
              </p>
            </div>
          </CardContent>
        </Card>

        {topEvents.length > 0 && (
          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-200">Top événements (24 h)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topEvents.map(([name, count]) => (
                <span
                  key={name}
                  className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300"
                >
                  {name}: {count}
                </span>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="theme-bg-secondary theme-border">
          <CardHeader>
            <CardTitle className="text-lg text-cyan-200">Flux événements</CardTitle>
            <CardDescription className="theme-text-secondary">
              Derniers enregistrements `activity_events`
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-3">Heure</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2">User</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/80">
                    <td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 pr-3 text-cyan-200">{e.event_name}</td>
                    <td className="py-1.5 pr-3 text-slate-400 truncate max-w-[200px]">
                      {e.path ?? "—"}
                    </td>
                    <td className="py-1.5 font-mono text-xs text-slate-500">
                      {e.user_id ? `${e.user_id.slice(0, 8)}…` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="theme-bg-secondary theme-border">
      <CardContent className="pt-6 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
