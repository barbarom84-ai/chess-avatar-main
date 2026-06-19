"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSuperUser } from "@/hooks/useSuperUser";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { useOpenPvpLobbies } from "@/hooks/useOpenPvpLobbies";
import { usePvpMatchmaking } from "@/hooks/usePvpMatchmaking";
import { usePvpMultiGameNotifications } from "@/hooks/usePvpMultiGameNotifications";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import OnlinePvpResultModal from "@/components/OnlinePvpResultModal";
import OnlinePvpLobbyLayout from "@/components/pvp/OnlinePvpLobbyLayout";
import OnlinePvpGameLayout from "@/components/pvp/OnlinePvpGameLayout";
import OnlinePvpActiveGamesDock from "@/components/pvp/OnlinePvpActiveGamesDock";
import AuthModal from "@/components/AuthModal";
import { buildPgnFromUcis } from "@/lib/pvp-chess";
import {
  fetchAccountFriends,
  migrateLocalFriendsOnce,
} from "@/lib/account-friends";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import { fetchPublicAccountProfile } from "@/lib/account-profile";
import { saveGameToCloud } from "@/lib/supabase-storage";
import { formatPvpGameTimeControlLabel } from "@/lib/pvp-time-controls";
import { pvpGameStatsFromUcis, formatDurationSec } from "@/lib/pvp-result-stats";
import { fetchPvpHeadToHead } from "@/lib/pvp-head-to-head-client";
import type { PvpHeadToHeadRecord } from "@/lib/pvp-head-to-head";
import {
  opponentFromGame,
  pvpResultForPlayer,
  whiteBlackDisplayNames,
} from "@/lib/pvp-utils";
import { mapPvpErrorMessage, pvpErrorFromUnknown } from "@/lib/pvp-errors";

export default function OnlinePvpPage() {
  const { t, lang } = useLanguage();
  const o = t.playOnline;
  const errorLabels = o.errors as Record<string, string>;
  const presetLabels = o.presets as Record<string, string>;
  const connectionStripLabels = o.connectionStrip as {
    offline: string;
    poor: string;
    retry: string;
  };

  const pvpToastError = useCallback(
    (err: unknown, fallback: string) => {
      toast.error(
        mapPvpErrorMessage(pvpErrorFromUnknown(err, fallback), errorLabels)
      );
    },
    [errorLabels]
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("game");
  const { userId, loading: authLoading } = useSuperUser();
  const { settings } = useChessboardSettings();
  const online = useOnlineGame(gameId, userId);
  const matchmaking = usePvpMatchmaking(userId);
  const matchedGameId = matchmaking.matchedGameId;
  const clearMatchmakingMatched = matchmaking.clearMatched;
  const {
    lobbies: openLobbiesList,
    activeGames,
    pendingRematches,
    pendingInvites,
    loading: lobbiesLoading,
    error: lobbiesError,
    refresh: refreshOpenLobbies,
    cancelLobby,
    acceptRematch,
    acceptInvite,
    joinOpenLobby,
  } = useOpenPvpLobbies(userId, gameId ? 5_000 : 12_000);
  const [authOpen, setAuthOpen] = useState(false);
  const [joiningOpenLobbyId, setJoiningOpenLobbyId] = useState<string | null>(null);
  const [friends, setFriends] = useState<AccountFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const refreshFriends = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      return;
    }
    setFriendsLoading(true);
    try {
      await migrateLocalFriendsOnce();
      const list = await fetchAccountFriends();
      setFriends(list);
    } finally {
      setFriendsLoading(false);
    }
  }, [userId]);
  const [timePreset, setTimePreset] = useState("blitz_3_0");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [endedDurationSec, setEndedDurationSec] = useState<number | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<AccountProfile | null>(null);
  const [myProfile, setMyProfile] = useState<AccountProfile | null>(null);
  const [resultHeadToHead, setResultHeadToHead] = useState<PvpHeadToHeadRecord | null>(null);
  const [resultHeadToHeadLoading, setResultHeadToHeadLoading] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [acceptingRematchId, setAcceptingRematchId] = useState<string | null>(null);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [cancellingRematchId, setCancellingRematchId] = useState<string | null>(null);
  const startMsRef = useRef<number | null>(null);
  const resultModalShownForGameId = useRef<string | null>(null);
  const rematchToastShownRef = useRef<Set<string>>(new Set());
  const inviteToastShownRef = useRef<Set<string>>(new Set());
  const autoRematchJoinRef = useRef<Set<string>>(new Set());
  const newGameInFlightRef = useRef(false);
  const prevGameSnapRef = useRef<{
    status?: string;
    black_user_id?: string | null;
  } | null>(null);

  const handleSwitchGame = useCallback(
    (targetGameId: string) => {
      router.push(`/online?game=${targetGameId}`);
    },
    [router]
  );

  const multiGameLabels = useMemo(
    () => ({
      opponentMoved: o.multiGame.opponentMoved,
      gameEnded: o.multiGame.gameEnded,
      switch: o.multiGame.switch,
      anonymousPlayer: o.anonymousPlayer,
    }),
    [o]
  );

  usePvpMultiGameNotifications({
    userId,
    currentGameId: gameId,
    activeGames,
    labels: multiGameLabels,
    onSwitchGame: handleSwitchGame,
    soundEnabled: settings.soundEnabled,
  });

  const opponentUserId = useMemo(() => {
    const g = online.game;
    if (!g || !userId || !g.black_user_id) return null;
    return g.white_user_id === userId ? g.black_user_id : g.white_user_id;
  }, [online.game, userId]);

  useEffect(() => {
    if (!opponentUserId) {
      setOpponentProfile(null);
      return;
    }
    void fetchPublicAccountProfile(opponentUserId).then(setOpponentProfile);
  }, [opponentUserId]);

  useEffect(() => {
    if (!userId) {
      setMyProfile(null);
      return;
    }
    void fetchPublicAccountProfile(userId).then(setMyProfile);
  }, [userId]);

  useEffect(() => {
    void refreshFriends();
  }, [refreshFriends]);

  useEffect(() => {
    if (!matchedGameId) return;
    toast.success(o.matchmakingMatched);
    router.push(`/online?game=${matchedGameId}`);
    clearMatchmakingMatched();
  }, [matchedGameId, clearMatchmakingMatched, o.matchmakingMatched, router]);

  const handleAcceptRematch = useCallback(
    async (targetGameId: string) => {
      if (!userId) {
        setAuthOpen(true);
        return;
      }
      setAcceptingRematchId(targetGameId);
      try {
        await acceptRematch(targetGameId);
        rematchToastShownRef.current.add(targetGameId);
        toast.success(o.acceptRematch);
        router.push(`/online?game=${targetGameId}`);
      } catch (e) {
        pvpToastError(e, o.joinFailed);
      } finally {
        setAcceptingRematchId(null);
      }
    },
    [userId, acceptRematch, o, router, pvpToastError]
  );

  const handleJoinOpenLobby = useCallback(
    async (targetGameId: string) => {
      if (!userId) {
        setAuthOpen(true);
        return;
      }
      setJoiningOpenLobbyId(targetGameId);
      try {
        await joinOpenLobby(targetGameId);
        toast.success(o.joinedAsBlack);
        router.push(`/online?game=${targetGameId}`);
      } catch (e) {
        pvpToastError(e, o.joinFailed);
      } finally {
        setJoiningOpenLobbyId(null);
      }
    },
    [userId, joinOpenLobby, o, router, pvpToastError]
  );

  useEffect(() => {
    if (!userId || pendingRematches.length === 0) return;
    for (const rm of pendingRematches) {
      if (rm.direction !== "incoming") continue;
      if (rematchToastShownRef.current.has(rm.id)) continue;
      rematchToastShownRef.current.add(rm.id);
      const name = rm.opponent_display_name ?? o.opponentName;
      toast.info(o.pendingRematchIncoming.replace("{name}", name), {
        duration: 12_000,
        action: {
          label: o.acceptRematch,
          onClick: () => void handleAcceptRematch(rm.id),
        },
      });
    }
  }, [pendingRematches, userId, o, handleAcceptRematch]);

  useEffect(() => {
    setSavedToCloud(false);
    setShowResultModal(false);
    setEndedDurationSec(null);
    resultModalShownForGameId.current = null;
    rematchToastShownRef.current = new Set();
    prevGameSnapRef.current = null;
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !online.game) return;
    const g = online.game;
    const prev = prevGameSnapRef.current;
    if (
      prev &&
      prev.status === "waiting" &&
      !prev.black_user_id &&
      g.status === "playing" &&
      g.black_user_id
    ) {
      toast.success(o.multiGame.gameStarted);
    }
    prevGameSnapRef.current = {
      status: g.status,
      black_user_id: g.black_user_id,
    };
  }, [gameId, online.game, o.multiGame.gameStarted]);

  useEffect(() => {
    if (
      online.game?.status === "playing" &&
      online.game.black_user_id &&
      startMsRef.current === null
    ) {
      startMsRef.current = Date.now();
    }
  }, [online.game?.status, online.game?.black_user_id]);

  const inviteUrl =
    typeof window !== "undefined" && gameId
      ? `${window.location.origin}/online?game=${gameId}`
      : "";

  const handleNewGame = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    if (
      newGameInFlightRef.current ||
      creating ||
      matchmaking.joining ||
      matchmaking.inQueue
    ) {
      return;
    }
    newGameInFlightRef.current = true;
    try {
      if (matchmaking.canQuickPlay(timePreset)) {
        const matchedId = await matchmaking.joinQueue(timePreset);
        if (matchedId) {
          toast.success(o.matchmakingMatched);
          router.push(`/online?game=${matchedId}`);
          matchmaking.clearMatched();
        }
        return;
      }
      setCreating(true);
      try {
        const id = await online.createLobby(timePreset);
        if (id) router.push(`/online?game=${id}`);
      } catch (e) {
        pvpToastError(e, o.createFailed);
      } finally {
        setCreating(false);
      }
    } catch (e) {
      pvpToastError(e, o.matchmakingFailed);
    } finally {
      newGameInFlightRef.current = false;
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      await matchmaking.leaveQueue();
    } catch (e) {
      pvpToastError(e, o.matchmakingFailed);
    }
  };

  const handleInviteFriend = useCallback(
    async (friendUserId: string, friendName: string) => {
      if (!userId) {
        setAuthOpen(true);
        return;
      }
      setCreating(true);
      try {
        const id = await online.createLobby(timePreset, friendUserId);
        if (!id) return;
        toast.success(o.friendInviteSent.replace("{name}", friendName));
        router.push(`/online?game=${id}`);
      } catch (e) {
        pvpToastError(e, o.createFailed);
      } finally {
        setCreating(false);
      }
    },
    [userId, online, timePreset, o, router, pvpToastError]
  );

  const handleJoin = useCallback(async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setJoining(true);
    try {
      const acceptingRematch = online.canAcceptRematch;
      await online.joinLobby();
      toast.success(acceptingRematch ? o.acceptRematch : o.joinedAsBlack);
    } catch (e) {
      pvpToastError(e, o.joinFailed);
    } finally {
      setJoining(false);
    }
  }, [userId, online, o, pvpToastError]);

  useEffect(() => {
    if (!gameId || !userId || online.loading || joining || acceptingRematchId) return;
    if (!online.canAcceptRematch) return;
    if (autoRematchJoinRef.current.has(gameId)) return;
    autoRematchJoinRef.current.add(gameId);
    void handleJoin();
  }, [
    gameId,
    userId,
    online.loading,
    online.canAcceptRematch,
    joining,
    acceptingRematchId,
    handleJoin,
  ]);

  const handleCancelRematch = useCallback(
    async (targetGameId: string) => {
      setCancellingRematchId(targetGameId);
      try {
        await cancelLobby(targetGameId);
        toast.success(o.rematchCancelled);
        if (gameId === targetGameId) {
          router.push("/online");
        }
      } catch (e) {
        pvpToastError(e, o.rematchFailed);
      } finally {
        setCancellingRematchId(null);
      }
    },
    [cancelLobby, o, gameId, router, pvpToastError]
  );

  const handleCancelLobby = async () => {
    if (!gameId) return;
    try {
      await online.deleteWaitingLobby();
      const wasRematch = Boolean(online.game?.rematch_source_game_id);
      toast.success(wasRematch ? o.rematchCancelled : o.lobbyRemoved);
      router.push("/online");
    } catch (e) {
      pvpToastError(e, o.openLobbiesError);
    }
  };

  const handleAcceptInvite = useCallback(
    async (targetGameId: string) => {
      if (!userId) {
        setAuthOpen(true);
        return;
      }
      setAcceptingInviteId(targetGameId);
      try {
        await acceptInvite(targetGameId);
        inviteToastShownRef.current.add(targetGameId);
        toast.success(o.joinedAsBlack);
        router.push(`/online?game=${targetGameId}`);
      } catch (e) {
        pvpToastError(e, o.joinFailed);
      } finally {
        setAcceptingInviteId(null);
      }
    },
    [userId, acceptInvite, o, router, pvpToastError]
  );

  useEffect(() => {
    if (!userId || pendingInvites.length === 0) return;
    for (const inv of pendingInvites) {
      if (inviteToastShownRef.current.has(inv.id)) continue;
      inviteToastShownRef.current.add(inv.id);
      const name = inv.host_display_name ?? o.anonymousPlayer;
      toast.info(o.pendingInviteIncoming.replace("{name}", name), {
        duration: 14_000,
        action: {
          label: o.acceptInvite,
          onClick: () => void handleAcceptInvite(inv.id),
        },
      });
    }
  }, [pendingInvites, userId, o, handleAcceptInvite]);

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(o.linkCopied);
    } catch {
      toast.error(o.copyFailed);
    }
  };

  const handleSaveCloud = useCallback(async () => {
    if (!online.game || !userId || savedToCloud || !online.role) return;
    const r = online.game.result;
    if (!r) return;
    setSaving(true);
    try {
      const { white, black } = whiteBlackDisplayNames(online.game);
      const pgn = buildPgnFromUcis(online.moves.map((m) => m.uci), {
        white,
        black,
        result: r,
      });
      const playerResult = pvpResultForPlayer(r, online.role);
      const oppName =
        online.role === "white"
          ? black === "…"
            ? o.opponentName
            : black
          : white;
      await saveGameToCloud({
        opponentName: oppName,
        result: playerResult,
        resultType: online.game.result_reason ?? "pvp_online",
        resultMessage: online.game.result_reason ?? undefined,
        playerColor: online.role,
        pgn,
        finalFen: online.chess.fen(),
        movesCount: online.moves.length,
        durationSeconds:
          startMsRef.current != null
            ? Math.max(0, Math.round((Date.now() - startMsRef.current) / 1000))
            : undefined,
        gameKind: "pvp_human_vs_human",
      });
      setSavedToCloud(true);
      toast.success(o.savedCloud);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.saveFailed);
    } finally {
      setSaving(false);
    }
  }, [online, userId, o, savedToCloud]);

  useEffect(() => {
    if (
      online.game?.status === "finished" &&
      online.game?.result &&
      startMsRef.current != null
    ) {
      setEndedDurationSec((prev) => {
        if (prev != null) return prev;
        return Math.max(0, Math.round((Date.now() - startMsRef.current!) / 1000));
      });
    }
  }, [online.game?.status, online.game?.result]);

  const resultOpponentUserId = useMemo(() => {
    const g = online.game;
    if (!g || !userId || !online.role || !g.black_user_id) return null;
    return online.role === "white" ? g.black_user_id : g.white_user_id;
  }, [online.game, online.role, userId]);

  useEffect(() => {
    if (!gameId || !online.game) return;
    const fin =
      online.game.status === "finished" || online.game.status === "aborted";
    if (!fin || !online.game.result || !online.role || !userId) return;
    if (resultModalShownForGameId.current === gameId) return;
    resultModalShownForGameId.current = gameId;
    setShowResultModal(true);
  }, [gameId, online.game, online.role, userId]);

  useEffect(() => {
    if (!showResultModal || !resultOpponentUserId) {
      setResultHeadToHead(null);
      setResultHeadToHeadLoading(false);
      return;
    }
    setResultHeadToHeadLoading(true);
    void (async () => {
      const [h2h, profile] = await Promise.all([
        fetchPvpHeadToHead(resultOpponentUserId),
        fetchPublicAccountProfile(resultOpponentUserId),
      ]);
      setResultHeadToHead(h2h?.record ?? null);
      if (profile) {
        setOpponentProfile(profile);
      } else if (h2h?.opponent) {
        setOpponentProfile((prev) =>
          prev ?? {
            userId: h2h.opponent.userId,
            displayName: h2h.opponent.displayName,
            avatarUrl: h2h.opponent.avatarUrl,
            bio: null,
            memberSince: null,
          }
        );
      }
      setResultHeadToHeadLoading(false);
    })();
  }, [showResultModal, resultOpponentUserId]);

  const pgnStringForDownload = useMemo(() => {
    if (!online.game?.result) return "";
    const { white, black } = whiteBlackDisplayNames(online.game);
    return buildPgnFromUcis(online.moves.map((m) => m.uci), {
      white,
      black,
      result: online.game.result,
    });
  }, [online.game, online.moves]);

  const handleResign = async () => {
    try {
      await online.resign();
    } catch (e) {
      pvpToastError(e, errorLabels.updateFailed ?? errorLabels.generic);
    }
  };

  const handleDrawAction = async (
    action: "offer" | "accept" | "decline" | "cancel"
  ) => {
    try {
      await online.drawAction(action);
    } catch (e) {
      pvpToastError(e, errorLabels.updateFailed ?? errorLabels.generic);
    }
  };

  const handleTakebackAction = async (
    action: "offer" | "accept" | "decline" | "cancel"
  ) => {
    try {
      await online.takebackAction(action);
    } catch (e) {
      pvpToastError(e, errorLabels.updateFailed ?? errorLabels.generic);
    }
  };

  const boardStats = useMemo(
    () => pvpGameStatsFromUcis(online.moves.map((m) => m.uci)),
    [online.moves]
  );

  const outcomeForModal = useMemo((): "win" | "loss" | "draw" => {
    if (!online.game?.result || !online.role) return "draw";
    return pvpResultForPlayer(online.game.result, online.role);
  }, [online.game?.result, online.role]);

  const resultLineMessage = useMemo(() => {
    if (!online.game?.result) return "";
    const rm = o.resultModal;
    const r = online.game.result;
    const rr = online.game.result_reason ?? "";
    let detail: string = rm.reasonGeneric;
    switch (rr) {
      case "checkmate":
        detail = rm.reasonCheckmate;
        break;
      case "stalemate":
        detail = rm.reasonStalemate;
        break;
      case "timeout":
        detail = rm.reasonTimeout;
        break;
      case "resignation":
        detail = rm.reasonResignation;
        break;
      case "draw_agreed":
        detail = rm.reasonDrawAgreed;
        break;
      case "threefold_repetition":
        detail = rm.reasonThreefold;
        break;
      case "insufficient_material":
        detail = rm.reasonInsufficient;
        break;
      case "fifty_move_rule":
        detail = rm.reasonFifty;
        break;
      default:
        break;
    }
    return `${r} — ${detail}`;
  }, [online.game?.result, online.game?.result_reason, o.resultModal]);

  const durationLabelForModal = useMemo(
    () => formatDurationSec(endedDurationSec ?? undefined),
    [endedDurationSec]
  );

  const handleDownloadPgn = useCallback(() => {
    if (!pgnStringForDownload) return;
    const blob = new Blob([pgnStringForDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-avatar-pvp-${gameId ?? "game"}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pgnStringForDownload, gameId]);

  const handleRematch = useCallback(async () => {
    if (!gameId || !userId) return;
    setRematchLoading(true);
    try {
      const { gameId: newId, started } = await online.requestRematch(true);
      toast.success(started ? o.matchmakingMatched : o.rematchCreated);
      setShowResultModal(false);
      router.push(`/online?game=${newId}`);
    } catch (e) {
      pvpToastError(e, o.rematchFailed);
    } finally {
      setRematchLoading(false);
    }
  }, [gameId, userId, online, o, router]);

  const gameOver = Boolean(
    online.game &&
      (online.game.status === "finished" || online.game.status === "aborted")
  );

  const orientation = online.role === "black" ? "black" : ("white" as const);

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-cyan-500/20">
          <CardContent className="pt-6">
            <p className="text-slate-300">{o.needsSupabase}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
      </main>
    );
  }

  if (!gameId) {
    const locale = lang === "fr" ? "fr-FR" : "en-US";
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
        <OnlinePvpLobbyLayout
          userId={userId}
          timePreset={timePreset}
          onTimePresetChange={setTimePreset}
          creating={creating}
          onNewGame={() => void handleNewGame()}
          onOpenAuth={() => setAuthOpen(true)}
          onInviteFriend={(friendUserId, friendName) =>
            void handleInviteFriend(friendUserId, friendName)
          }
          activeGames={activeGames}
          pendingRematches={pendingRematches}
          openLobbiesList={openLobbiesList}
          lobbiesLoading={lobbiesLoading}
          lobbiesError={lobbiesError}
          onRefreshLobbies={() => void refreshOpenLobbies()}
          onCancelLobby={cancelLobby}
          friends={friends}
          friendsLoading={friendsLoading}
          onFriendsChange={setFriends}
          locale={locale}
          presetLabels={presetLabels}
          canQuickPlay={matchmaking.canQuickPlay(timePreset)}
          matchmakingInQueue={matchmaking.inQueue}
          matchmakingJoining={matchmaking.joining}
          matchmakingQueueSize={matchmaking.queueSize}
          onCancelMatchmaking={() => void handleCancelMatchmaking()}
          onAcceptRematch={handleAcceptRematch}
          acceptingRematchId={acceptingRematchId}
          onCancelRematch={handleCancelRematch}
          cancellingRematchId={cancellingRematchId}
          onJoinOpenLobby={handleJoinOpenLobby}
          joiningOpenLobbyId={joiningOpenLobbyId}
        />
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </main>
    );
  }

  if (online.loading && !online.game) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
      </main>
    );
  }

  if (online.error || !online.game) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-red-500/30">
          <CardContent className="pt-6 space-y-4">
            <p className="text-red-200">
              {mapPvpErrorMessage(online.error ?? o.gameNotFound, errorLabels)}
            </p>
            <Button variant="outline" asChild>
              <Link href="/online">{o.backLobby}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const g = online.game;
  const wb = whiteBlackDisplayNames(g);
  const oppInfo = opponentFromGame(g, userId);
  const waitingOpponent = g.status === "waiting" && !g.black_user_id;
  const canMove =
    g.status === "playing" &&
    Boolean(online.role) &&
    online.isMyTurn &&
    !online.isSideToMoveTimedOut &&
    !gameOver;

  const isSpectator = online.isSpectator;

  const whiteAvatarUrl =
    g.white_user_id === userId
      ? myProfile?.avatarUrl ?? null
      : opponentProfile?.userId === g.white_user_id
        ? opponentProfile.avatarUrl
        : null;
  const blackAvatarUrl =
    g.black_user_id && g.black_user_id === userId
      ? myProfile?.avatarUrl ?? null
      : g.black_user_id && opponentProfile?.userId === g.black_user_id
        ? opponentProfile.avatarUrl
        : null;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-2 md:p-4 lg:p-6">
      <OnlinePvpGameLayout
        game={g}
        chess={online.chess}
        moves={online.moves}
        role={online.role}
        canJoin={online.canJoin}
        canAcceptRematch={online.canAcceptRematch}
        userId={userId}
        gameId={gameId}
        lang={lang}
        orientation={orientation}
        lastMove={online.lastMove}
        canMove={Boolean(userId) && canMove}
        onSubmitUci={online.submitMove}
        joining={joining}
        inviteUrl={inviteUrl}
        presetLabel={formatPvpGameTimeControlLabel(g, presetLabels)}
        waitingOpponent={waitingOpponent}
        canCancelLobby={online.canCancelLobby}
        gameOver={gameOver}
        isSpectator={isSpectator}
        onJoin={() => void handleJoin()}
        onCopyInvite={() => void copyInvite()}
        onCancelLobby={() => void handleCancelLobby()}
        onOpenAuth={() => setAuthOpen(true)}
        onResign={handleResign}
        onDrawAction={handleDrawAction}
        onTakebackAction={handleTakebackAction}
        allowPremove={Boolean(online.role) && g.status === "playing"}
        canPremove={online.canPremove}
        canOfferTakeback={online.canOfferTakeback}
        premoveUci={online.premoveUci}
        onPremoveChange={online.setPremoveUci}
        oppInfo={oppInfo}
        opponentProfile={opponentProfile}
        friends={friends}
        onFriendsChange={setFriends}
        whiteAvatarUrl={whiteAvatarUrl}
        blackAvatarUrl={blackAvatarUrl}
        syncedClockNow={online.syncedClockNow}
        whiteConnection={online.whiteConnection}
        blackConnection={online.blackConnection}
        localConnection={online.localConnection}
        connectionLabels={o.connection as Record<string, string>}
        requestBannerLabels={o.requestBanner}
        resignBannerLabels={o.resignBanner}
        connectionStripLabels={connectionStripLabels}
        onResync={() => void online.refreshSilent()}
        errorLabels={errorLabels}
      />

      <OnlinePvpActiveGamesDock
        activeGames={activeGames}
        currentGameId={gameId}
        presetLabels={presetLabels}
        labels={{
          title: o.multiGame.dockTitle,
          yourTurn: o.multiGame.yourTurn,
          anonymousPlayer: o.anonymousPlayer,
          currentGame: o.multiGame.currentGame,
        }}
      />

      <OnlinePvpResultModal
        open={
          showResultModal &&
          gameOver &&
          Boolean(g.result) &&
          Boolean(online.role) &&
          Boolean(userId)
        }
        onOpenChange={setShowResultModal}
        result={outcomeForModal}
        resultMessage={resultLineMessage}
        totalMoves={boardStats.totalMoves}
        captures={boardStats.captures}
        checks={boardStats.checks}
        durationLabel={durationLabelForModal}
        opponentUserId={resultOpponentUserId}
        opponentDisplayName={
          opponentProfile?.displayName ??
          (online.role === "white" ? wb.black : wb.white)
        }
        opponentAvatarUrl={opponentProfile?.avatarUrl ?? null}
        opponentBio={opponentProfile?.bio ?? null}
        timeControlLabel={
          g.time_preset ? (presetLabels[g.time_preset] ?? g.time_preset) : null
        }
        headToHead={resultHeadToHead}
        headToHeadLoading={resultHeadToHeadLoading}
        onNewGame={() => router.push("/online")}
        onRematch={() => void handleRematch()}
        rematchLoading={rematchLoading}
        onDownloadPgn={handleDownloadPgn}
        onSaveCloud={handleSaveCloud}
        canSave={Boolean(userId) && !savedToCloud}
        saving={saving}
      />

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => void online.refresh()}
      />
    </main>
  );
}
