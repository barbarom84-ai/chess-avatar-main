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
import OnlinePvpResultModal from "@/components/OnlinePvpResultModal";
import OnlinePvpLobbyLayout from "@/components/pvp/OnlinePvpLobbyLayout";
import OnlinePvpGameLayout from "@/components/pvp/OnlinePvpGameLayout";
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

export default function OnlinePvpPage() {
  const { t, lang } = useLanguage();
  const o = t.playOnline;
  const presetLabels = o.presets as Record<string, string>;
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("game");
  const { userId, loading: authLoading } = useSuperUser();
  const online = useOnlineGame(gameId, userId);
  const {
    lobbies: openLobbiesList,
    activeGames,
    loading: lobbiesLoading,
    error: lobbiesError,
    refresh: refreshOpenLobbies,
    cancelLobby,
  } = useOpenPvpLobbies(gameId ? null : userId);
  const [authOpen, setAuthOpen] = useState(false);
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
  const startMsRef = useRef<number | null>(null);
  const resultModalShownForGameId = useRef<string | null>(null);

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
    setSavedToCloud(false);
    setShowResultModal(false);
    setEndedDurationSec(null);
    resultModalShownForGameId.current = null;
  }, [gameId]);

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

  const handleCreate = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setCreating(true);
    try {
      const id = await online.createLobby(timePreset);
      if (id) router.push(`/online?game=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.createFailed);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setJoining(true);
    try {
      await online.joinLobby();
      toast.success(o.joinedAsBlack);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.joinFailed);
    } finally {
      setJoining(false);
    }
  };

  const handleCancelLobby = async () => {
    if (!gameId) return;
    try {
      await online.deleteWaitingLobby();
      toast.success(o.lobbyRemoved);
      router.push("/online");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.openLobbiesError);
    }
  };

  const handleInviteFriend = async () => {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setCreating(true);
    try {
      const id = await online.createLobby(timePreset);
      if (!id) return;
      const base =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "";
      const url = `${base}/online?game=${id}`;
      await navigator.clipboard.writeText(url);
      toast.success(o.inviteFriendCreated);
      router.push(`/online?game=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : o.createFailed);
    } finally {
      setCreating(false);
    }
  };

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
          onCreate={() => void handleCreate()}
          onOpenAuth={() => setAuthOpen(true)}
          onInviteFriend={() => void handleInviteFriend()}
          activeGames={activeGames}
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
            <p className="text-red-200">{online.error ?? o.gameNotFound}</p>
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

  const isSpectator = Boolean(
    userId && !online.role && !online.canJoin && g.status === "playing"
  );

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
        gameOver={gameOver}
        isSpectator={isSpectator}
        onJoin={() => void handleJoin()}
        onCopyInvite={() => void copyInvite()}
        onCancelLobby={() => void handleCancelLobby()}
        onOpenAuth={() => setAuthOpen(true)}
        onResign={() => online.resign()}
        onDrawAction={(action) => online.drawAction(action)}
        oppInfo={oppInfo}
        opponentProfile={opponentProfile}
        friends={friends}
        onFriendsChange={setFriends}
        whiteAvatarUrl={whiteAvatarUrl}
        blackAvatarUrl={blackAvatarUrl}
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
