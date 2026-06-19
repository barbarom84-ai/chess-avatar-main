"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ActivePvpGame } from "@/hooks/useOpenPvpLobbies";
import { playChessMoveSound } from "@/lib/chess-sound";

type GameSnapshot = {
  moveCount: number;
  isMyTurn: boolean;
  opponentName: string | null;
};

export type PvpMultiGameNotificationLabels = {
  opponentMoved: string;
  gameEnded: string;
  switch: string;
  anonymousPlayer: string;
};

type UsePvpMultiGameNotificationsOptions = {
  userId: string | null;
  currentGameId: string | null;
  activeGames: ActivePvpGame[];
  labels: PvpMultiGameNotificationLabels;
  onSwitchGame: (gameId: string) => void;
  soundEnabled?: boolean;
};

async function fetchGameStatus(gameId: string): Promise<{
  status: string;
  opponentName: string | null;
} | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`/api/pvp/games/${gameId}`, { headers });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    game?: { status?: string; white_display_name?: string | null; black_display_name?: string | null };
    role?: "white" | "black";
  } | null;
  if (!json?.game?.status) return null;
  const role = json.role;
  const g = json.game;
  const status = g.status as string;
  const opponentName =
    role === "white"
      ? g.black_display_name?.trim() || null
      : role === "black"
        ? g.white_display_name?.trim() || null
        : null;
  return { status, opponentName };
}

/**
 * Toasts non bloquants pour les autres parties en cours (coup adverse, fin de partie).
 * La partie affichée gère sa propre modale de résultat.
 */
export function usePvpMultiGameNotifications({
  userId,
  currentGameId,
  activeGames,
  labels,
  onSwitchGame,
  soundEnabled = true,
}: UsePvpMultiGameNotificationsOptions) {
  const snapshotsRef = useRef<Map<string, GameSnapshot>>(new Map());
  const notifiedEndedRef = useRef<Set<string>>(new Set());
  const notifiedMoveRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      snapshotsRef.current.clear();
      return;
    }

    const prev = snapshotsRef.current;
    const currentIds = new Set(activeGames.map((g) => g.id));

    for (const [id, snap] of [...prev.entries()]) {
      if (id === currentGameId) continue;
      if (currentIds.has(id)) continue;
      if (notifiedEndedRef.current.has(id)) continue;
      notifiedEndedRef.current.add(id);

      void (async () => {
        const info = await fetchGameStatus(id);
        if (!info) return;
        if (info.status !== "finished" && info.status !== "aborted") return;
        const name = info.opponentName ?? snap.opponentName ?? labels.anonymousPlayer;
        toast.info(labels.gameEnded.replace("{name}", name), {
          duration: 14_000,
          action: {
            label: labels.switch,
            onClick: () => onSwitchGame(id),
          },
        });
      })();
    }

    for (const ag of activeGames) {
      const moveCount = ag.move_count ?? 0;
      const isMyTurn = ag.is_my_turn ?? false;
      const opponentName = ag.opponent_display_name;
      const prevSnap = prev.get(ag.id);

      if (ag.id !== currentGameId && prevSnap) {
        const opponentJustMoved =
          moveCount > prevSnap.moveCount && isMyTurn && !prevSnap.isMyTurn;
        const notifyKey = `${ag.id}:${moveCount}`;
        if (opponentJustMoved && !notifiedMoveRef.current.has(notifyKey)) {
          notifiedMoveRef.current.add(notifyKey);
          const name = opponentName ?? labels.anonymousPlayer;
          if (soundEnabled) playChessMoveSound();
          toast.info(labels.opponentMoved.replace("{name}", name), {
            duration: 12_000,
            action: {
              label: labels.switch,
              onClick: () => onSwitchGame(ag.id),
            },
          });
        }
      }

      prev.set(ag.id, { moveCount, isMyTurn, opponentName });
    }

    for (const id of [...prev.keys()]) {
      if (!currentIds.has(id) && id !== currentGameId) {
        prev.delete(id);
      }
    }
  }, [
    userId,
    currentGameId,
    activeGames,
    labels,
    onSwitchGame,
    soundEnabled,
  ]);
}
