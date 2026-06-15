"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chess } from "chess.js";
import { toast } from "sonner";
import OnlineChessboard from "@/components/OnlineChessboard";
import EvaluationBar from "@/components/EvaluationBar";
import OnlinePvpPlayerBar from "@/components/pvp/OnlinePvpPlayerBar";
import OnlinePvpSidebar from "@/components/pvp/OnlinePvpSidebar";
import { useStockfish } from "@/hooks/useStockfish";
import { usePvpChat } from "@/hooks/usePvpChat";
import { stmEvalToWhitePov } from "@/lib/arena-chess";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { whiteBlackDisplayNames } from "@/lib/pvp-utils";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import type { Language } from "@/lib/i18n";

const PVP_EVAL_BAR_STORAGE_KEY = "chess-avatar.pvp.showEvalBar";
const LIVE_EVAL_DEPTH = 12;

type OnlinePvpGameLayoutProps = {
  game: PvpGameRow;
  chess: Chess;
  moves: PvpMoveRow[];
  role: "white" | "black" | null;
  canJoin: boolean;
  userId: string | null;
  gameId: string;
  lang: Language;
  orientation: "white" | "black";
  lastMove: { from: string; to: string } | null;
  canMove: boolean;
  onSubmitUci: (uci: string) => Promise<void>;
  joining: boolean;
  inviteUrl: string;
  presetLabel: string | null;
  waitingOpponent: boolean;
  gameOver: boolean;
  onJoin: () => void;
  onCopyInvite: () => void;
  onCancelLobby: () => void;
  onOpenAuth: () => void;
  onResign: () => Promise<void>;
  onDrawAction: (action: "offer" | "accept" | "decline" | "cancel") => Promise<void>;
  oppInfo: { oppId: string; oppLabel: string; oppColor: "white" | "black" } | null;
  opponentProfile: AccountProfile | null;
  friends: AccountFriend[];
  onFriendsChange: (friends: AccountFriend[]) => void;
  whiteAvatarUrl?: string | null;
  blackAvatarUrl?: string | null;
  isSpectator?: boolean;
};

export default function OnlinePvpGameLayout({
  game: g,
  chess,
  moves,
  role,
  canJoin,
  userId,
  gameId,
  lang,
  orientation,
  lastMove,
  canMove,
  onSubmitUci,
  joining,
  inviteUrl,
  presetLabel,
  waitingOpponent,
  gameOver,
  onJoin,
  onCopyInvite,
  onCancelLobby,
  onOpenAuth,
  onResign,
  onDrawAction,
  oppInfo,
  opponentProfile,
  friends,
  onFriendsChange,
  whiteAvatarUrl,
  blackAvatarUrl,
  isSpectator = false,
}: OnlinePvpGameLayoutProps) {
  const isParticipant = Boolean(role);
  const canShowEvalBar = isSpectator && !isParticipant;
  const [showEvalBar, setShowEvalBar] = useState(false);
  const [liveEval, setLiveEval] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState("game");
  const liveEvalRequestRef = useRef(0);

  const { isReady, getPositionEvaluation } = useStockfish();

  const chatEnabled = Boolean(userId && role);
  const chat = usePvpChat(gameId, userId, chatEnabled);
  const chatDisabled =
    !userId ||
    !role ||
    g.status === "finished" ||
    g.status === "aborted";

  useEffect(() => {
    if (!canShowEvalBar) {
      setShowEvalBar(false);
      return;
    }
    try {
      if (localStorage.getItem(PVP_EVAL_BAR_STORAGE_KEY) === "1") {
        setShowEvalBar(true);
      }
    } catch {
      /* ignore */
    }
  }, [canShowEvalBar]);

  useEffect(() => {
    if (!canShowEvalBar || !showEvalBar || gameOver || !isReady) {
      setLiveEval(null);
      return;
    }
    const fen = chess.fen();
    const id = ++liveEvalRequestRef.current;
    let cancelled = false;
    const timer = setTimeout(() => {
      getPositionEvaluation(fen, LIVE_EVAL_DEPTH)
        .then((v) => {
          if (cancelled || id !== liveEvalRequestRef.current) return;
          setLiveEval(stmEvalToWhitePov(fen, v));
        })
        .catch(() => {
          if (cancelled || id !== liveEvalRequestRef.current) return;
          setLiveEval(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canShowEvalBar, showEvalBar, gameOver, isReady, chess, getPositionEvaluation, moves.length]);

  const wb = useMemo(() => whiteBlackDisplayNames(g), [g]);

  const topSide: "white" | "black" = orientation === "white" ? "black" : "white";
  const bottomSide: "white" | "black" = orientation === "white" ? "white" : "black";

  const topName = topSide === "white" ? wb.white : wb.black;
  const bottomName = bottomSide === "white" ? wb.white : wb.black;
  const topAvatar = topSide === "white" ? whiteAvatarUrl : blackAvatarUrl;
  const bottomAvatar = bottomSide === "white" ? whiteAvatarUrl : blackAvatarUrl;

  return (
    <div className="pvp-game-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] gap-3 xl:gap-4 items-start max-w-7xl mx-auto">
      <div className="space-y-1.5 min-w-0">
        <OnlinePvpPlayerBar
          side={topSide}
          displayName={topName}
          avatarUrl={topAvatar}
          game={g}
          chess={chess}
          myRole={role}
          lang={lang}
        />

        {canShowEvalBar && showEvalBar && (
          <EvaluationBar evaluation={liveEval} compact />
        )}

        <div className="w-full aspect-square max-h-[min(72dvh,calc(100vw-1rem))] xl:max-h-[min(78dvh,100%)]">
          <OnlineChessboard
            fen={chess.fen()}
            orientation={orientation}
            lastMove={lastMove}
            canMove={canMove}
            onSubmitUci={onSubmitUci}
            onMoveError={(msg) => toast.error(msg)}
          />
        </div>

        <OnlinePvpPlayerBar
          side={bottomSide}
          displayName={bottomName}
          avatarUrl={bottomAvatar}
          game={g}
          chess={chess}
          myRole={role}
          lang={lang}
        />
      </div>

      <OnlinePvpSidebar
        game={g}
        moves={moves}
        userId={userId}
        role={role}
        canJoin={canJoin}
        joining={joining}
        inviteUrl={inviteUrl}
        presetLabel={presetLabel}
        waitingOpponent={waitingOpponent}
        onJoin={onJoin}
        onCopyInvite={onCopyInvite}
        onCancelLobby={onCancelLobby}
        onOpenAuth={onOpenAuth}
        onResign={onResign}
        onDrawAction={onDrawAction}
        oppInfo={oppInfo}
        opponentProfile={opponentProfile}
        friends={friends}
        onFriendsChange={onFriendsChange}
        chatMessages={chat.messages}
        chatLoading={chat.loading}
        chatDisabled={chatDisabled}
        onSendChat={chat.sendMessage}
        chatUnreadCount={chat.unreadCount}
        onChatTabVisible={chat.markChatVisible}
        canShowEvalBar={canShowEvalBar}
        showEvalBar={showEvalBar}
        onShowEvalBarChange={(v) => {
          setShowEvalBar(v);
          try {
            localStorage.setItem(PVP_EVAL_BAR_STORAGE_KEY, v ? "1" : "0");
          } catch {
            /* ignore */
          }
        }}
        sidebarTab={sidebarTab}
        onSidebarTabChange={setSidebarTab}
      />
    </div>
  );
}
