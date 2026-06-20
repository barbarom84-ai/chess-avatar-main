"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chess } from "chess.js";
import { toast } from "sonner";
import OnlineChessboard from "@/components/OnlineChessboard";
import EvaluationBar from "@/components/EvaluationBar";
import OnlinePvpPlayerBar from "@/components/pvp/OnlinePvpPlayerBar";
import OnlinePvpRequestBanner, {
  type PvpIncomingRequest,
} from "@/components/pvp/OnlinePvpRequestBanner";
import OnlinePvpCenterBanners from "@/components/pvp/OnlinePvpCenterBanners";
import OnlinePvpResignConfirmBanner from "@/components/pvp/OnlinePvpResignConfirmBanner";
import OnlinePvpConnectionStrip from "@/components/pvp/OnlinePvpConnectionStrip";
import OnlinePvpSidebar from "@/components/pvp/OnlinePvpSidebar";
import { useStockfish } from "@/hooks/useStockfish";
import { usePvpChat } from "@/hooks/usePvpChat";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { stmEvalToWhitePov } from "@/lib/arena-chess";
import { playPvpRequestSound } from "@/lib/chess-sound";
import type { PvpConnectionInfo } from "@/lib/pvp-connection";
import { mapPvpErrorMessage } from "@/lib/pvp-errors";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis, uciToLastMoveSquares } from "@/lib/pvp-chess";
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
  canAcceptRematch?: boolean;
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
  canCancelLobby?: boolean;
  gameOver: boolean;
  onJoin: () => void;
  onCopyInvite: () => void;
  onCancelLobby: () => void;
  onOpenAuth: () => void;
  onResign: () => Promise<void>;
  onDrawAction: (action: "offer" | "accept" | "decline" | "cancel") => Promise<void>;
  onTakebackAction?: (action: "offer" | "accept" | "decline" | "cancel") => Promise<void>;
  allowPremove?: boolean;
  canPremove?: boolean;
  canOfferTakeback?: boolean;
  premoveUci?: string | null;
  onPremoveChange?: (uci: string | null) => void;
  oppInfo: { oppId: string; oppLabel: string; oppColor: "white" | "black" } | null;
  opponentProfile: AccountProfile | null;
  friends: AccountFriend[];
  onFriendsChange: (friends: AccountFriend[]) => void;
  whiteAvatarUrl?: string | null;
  blackAvatarUrl?: string | null;
  isSpectator?: boolean;
  syncedClockNow?: number;
  whiteConnection?: PvpConnectionInfo;
  blackConnection?: PvpConnectionInfo;
  connectionLabels?: Record<string, string>;
  requestBannerLabels?: {
    drawTitle: string;
    takebackTitle: string;
    accept: string;
    decline: string;
    dismiss: string;
  };
  resignBannerLabels?: {
    title: string;
    message: string;
    confirm: string;
    cancel: string;
  };
  errorLabels?: Record<string, string>;
  localConnection?: PvpConnectionInfo;
  connectionStripLabels?: { offline: string; poor: string; retry: string };
  onResync?: () => void;
};

export default function OnlinePvpGameLayout({
  game: g,
  chess,
  moves,
  role,
  canJoin,
  canAcceptRematch = false,
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
  canCancelLobby = false,
  gameOver,
  onJoin,
  onCopyInvite,
  onCancelLobby,
  onOpenAuth,
  onResign,
  onDrawAction,
  onTakebackAction,
  allowPremove = false,
  canPremove = false,
  canOfferTakeback = false,
  premoveUci = null,
  onPremoveChange,
  oppInfo,
  opponentProfile,
  friends,
  onFriendsChange,
  whiteAvatarUrl,
  blackAvatarUrl,
  isSpectator = false,
  syncedClockNow,
  whiteConnection,
  blackConnection,
  connectionLabels = {},
  requestBannerLabels,
  resignBannerLabels,
  errorLabels = {},
  localConnection,
  connectionStripLabels,
  onResync,
}: OnlinePvpGameLayoutProps) {
  const { settings } = useChessboardSettings();
  const isParticipant = Boolean(role);
  const canShowEvalBar = isSpectator && !isParticipant;
  const [showEvalBar, setShowEvalBar] = useState(false);
  const [liveEval, setLiveEval] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState("game");
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [dismissedRequestKey, setDismissedRequestKey] = useState<string | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const lastRequestSoundKeyRef = useRef<string | null>(null);
  const liveEvalRequestRef = useRef(0);

  useEffect(() => {
    setPreviewPly(null);
  }, [moves.length]);

  const isLiveView = previewPly === null || previewPly >= moves.length;

  const displayChess = useMemo(() => {
    if (isLiveView) return chess;
    const ucis = moves.slice(0, previewPly).map((m) => m.uci);
    return replayGameFromUcis(ucis);
  }, [chess, isLiveView, moves, previewPly]);

  const displayLastMove = useMemo(() => {
    if (isLiveView) return lastMove;
    const ucis = moves.slice(0, previewPly).map((m) => m.uci);
    return uciToLastMoveSquares(ucis[ucis.length - 1]);
  }, [isLiveView, lastMove, moves, previewPly]);

  const boardCanMove = canMove && isLiveView;
  const boardAllowPremove = canPremove && isLiveView;

  const effectiveOrientation: "white" | "black" =
    boardFlipped && isSpectator
      ? orientation === "white"
        ? "black"
        : "white"
      : orientation;

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
    if (!canShowEvalBar || !showEvalBar || gameOver || !isReady || !isLiveView) {
      setLiveEval(null);
      return;
    }
    const fen = displayChess.fen();
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
  }, [canShowEvalBar, showEvalBar, gameOver, isReady, displayChess, getPositionEvaluation, moves.length, isLiveView]);

  const wb = useMemo(() => whiteBlackDisplayNames(g), [g]);

  const topSide: "white" | "black" = effectiveOrientation === "white" ? "black" : "white";
  const bottomSide: "white" | "black" = effectiveOrientation === "white" ? "white" : "black";

  const topName = topSide === "white" ? wb.white : wb.black;
  const bottomName = bottomSide === "white" ? wb.white : wb.black;
  const topAvatar = topSide === "white" ? whiteAvatarUrl : blackAvatarUrl;
  const bottomAvatar = bottomSide === "white" ? whiteAvatarUrl : blackAvatarUrl;

  const connectionTitle = (info: PvpConnectionInfo | undefined) => {
    if (!info) return "";
    return connectionLabels[info.labelKey] ?? info.labelKey;
  };

  const incomingRequest = useMemo((): PvpIncomingRequest | null => {
    if (!userId || g.status !== "playing" || isSpectator) return null;
    if (g.draw_offered_by && g.draw_offered_by !== userId) {
      const key = `draw-${g.draw_offered_by}`;
      if (dismissedRequestKey === key) return null;
      const oppName = role === "white" ? wb.black : wb.white;
      return { kind: "draw", fromLabel: oppName };
    }
    if (g.takeback_offered_by && g.takeback_offered_by !== userId) {
      const key = `takeback-${g.takeback_offered_by}`;
      if (dismissedRequestKey === key) return null;
      const oppName = role === "white" ? wb.black : wb.white;
      return { kind: "takeback", fromLabel: oppName };
    }
    return null;
  }, [userId, g, isSpectator, dismissedRequestKey, role, wb.black, wb.white]);

  useEffect(() => {
    if (!g.draw_offered_by && !g.takeback_offered_by) {
      setDismissedRequestKey(null);
      lastRequestSoundKeyRef.current = null;
    }
  }, [g.draw_offered_by, g.takeback_offered_by]);

  useEffect(() => {
    if (!incomingRequest) return;
    const key =
      incomingRequest.kind === "draw"
        ? `draw-${g.draw_offered_by}`
        : `takeback-${g.takeback_offered_by}`;
    if (!key || lastRequestSoundKeyRef.current === key) return;
    lastRequestSoundKeyRef.current = key;
    if (settings.soundEnabled) playPvpRequestSound();
  }, [
    incomingRequest,
    g.draw_offered_by,
    g.takeback_offered_by,
    settings.soundEnabled,
  ]);

  const bannerLabels = requestBannerLabels ?? {
    drawTitle: "Draw offer",
    takebackTitle: "Takeback request",
    accept: "Accept",
    decline: "Decline",
    dismiss: "Dismiss",
  };

  const resignLabels = resignBannerLabels ?? {
    title: "Confirm resignation",
    message: "Are you sure you want to resign this game?",
    confirm: "Resign",
    cancel: "Cancel",
  };

  const handleMoveError = (msg: string) => {
    toast.error(mapPvpErrorMessage(msg, errorLabels));
  };

  const showConnectionBanner =
    Boolean(localConnection && connectionStripLabels && role && g.status === "playing") &&
    (localConnection?.level === "poor" || localConnection?.level === "offline");

  return (
    <>
      <OnlinePvpCenterBanners dimBackdrop={Boolean(incomingRequest || showResignConfirm)}>
        {showConnectionBanner && localConnection && connectionStripLabels ? (
          <OnlinePvpConnectionStrip
            prominent
            connection={localConnection}
            message={
              localConnection.level === "offline"
                ? connectionStripLabels.offline
                : connectionStripLabels.poor
            }
            onRetry={onResync}
            retryLabel={connectionStripLabels.retry}
          />
        ) : null}
        {incomingRequest ? (
          <OnlinePvpRequestBanner
            request={incomingRequest}
            onAccept={() => {
              if (incomingRequest.kind === "draw") void onDrawAction("accept");
              else void onTakebackAction?.("accept");
            }}
            onDecline={() => {
              if (incomingRequest.kind === "draw") void onDrawAction("decline");
              else void onTakebackAction?.("decline");
            }}
            onDismiss={() => {
              const key =
                incomingRequest.kind === "draw"
                  ? `draw-${g.draw_offered_by}`
                  : `takeback-${g.takeback_offered_by}`;
              setDismissedRequestKey(key);
            }}
            labels={bannerLabels}
          />
        ) : null}
        {showResignConfirm ? (
          <OnlinePvpResignConfirmBanner
            labels={resignLabels}
            onConfirm={() => {
              setShowResignConfirm(false);
              void onResign();
            }}
            onCancel={() => setShowResignConfirm(false)}
          />
        ) : null}
      </OnlinePvpCenterBanners>

    <div className="pvp-game-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] gap-3 xl:gap-4 items-start max-w-7xl mx-auto">
      <div className="space-y-1.5 min-w-0">
        <OnlinePvpPlayerBar
          side={topSide}
          displayName={topName}
          avatarUrl={topAvatar}
          game={g}
          moves={moves}
          myRole={role}
          lang={lang}
          nowMs={syncedClockNow}
          connection={topSide === "white" ? whiteConnection : blackConnection}
          connectionTitle={connectionTitle(
            topSide === "white" ? whiteConnection : blackConnection
          )}
        />

        {canShowEvalBar && showEvalBar && (
          <EvaluationBar evaluation={liveEval} compact />
        )}

        <div className="chessboard-frame chessboard-frame--pvp w-full">
          <OnlineChessboard
            fen={displayChess.fen()}
            orientation={effectiveOrientation}
            lastMove={displayLastMove}
            canMove={boardCanMove}
            allowPremove={boardAllowPremove}
            playerRole={role}
            premoveUci={premoveUci}
            onPremoveChange={onPremoveChange}
            onSubmitUci={onSubmitUci}
            onMoveError={handleMoveError}
          />
        </div>

        <OnlinePvpPlayerBar
          side={bottomSide}
          displayName={bottomName}
          avatarUrl={bottomAvatar}
          game={g}
          moves={moves}
          myRole={role}
          lang={lang}
          nowMs={syncedClockNow}
          connection={bottomSide === "white" ? whiteConnection : blackConnection}
          connectionTitle={connectionTitle(
            bottomSide === "white" ? whiteConnection : blackConnection
          )}
        />
      </div>

      <OnlinePvpSidebar
        game={g}
        moves={moves}
        userId={userId}
        role={role}
        canJoin={canJoin}
        canAcceptRematch={canAcceptRematch}
        joining={joining}
        inviteUrl={inviteUrl}
        presetLabel={presetLabel}
        waitingOpponent={waitingOpponent}
        canCancelLobby={canCancelLobby}
        onJoin={onJoin}
        onCopyInvite={onCopyInvite}
        onCancelLobby={onCancelLobby}
        onOpenAuth={onOpenAuth}
        onResignRequest={() => setShowResignConfirm(true)}
        onDrawAction={onDrawAction}
        onTakebackAction={onTakebackAction}
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
        selectedPly={previewPly}
        onSelectPly={setPreviewPly}
        canPremove={canPremove}
        canOfferTakeback={canOfferTakeback}
        isSpectator={isSpectator}
        boardFlipped={boardFlipped}
        onFlipBoard={() => setBoardFlipped((v) => !v)}
        hideIncomingRequests={true}
      />
    </div>
    </>
  );
}
