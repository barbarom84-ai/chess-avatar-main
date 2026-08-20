"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Copy, FlipVertical, Handshake, Loader2, Mail, MessageSquare, RotateCcw, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import OnlinePvpMoveList from "@/components/pvp/OnlinePvpMoveList";
import OnlinePvpChatPanel from "@/components/pvp/OnlinePvpChatPanel";
import OnlinePvpOpponentCard from "@/components/OnlinePvpOpponentCard";
import { isPvpRematchLobby } from "@/lib/pvp-game-cancel";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import type { PvpChatMessage } from "@/lib/pvp-chat";
import { canUserOfferPvpDraw, pvpDrawOffersRemaining } from "@/lib/pvp-draw-limits";
import { useLanguage } from "@/lib/language-context";

type OnlinePvpSidebarProps = {
  game: PvpGameRow;
  moves: PvpMoveRow[];
  userId: string | null;
  role: "white" | "black" | null;
  canJoin: boolean;
  canAcceptRematch?: boolean;
  joining: boolean;
  inviteUrl: string;
  presetLabel: string | null;
  waitingOpponent: boolean;
  canCancelLobby?: boolean;
  onJoin: () => void;
  onCopyInvite: () => void;
  onCancelLobby: () => void;
  onOpenAuth: () => void;
  onResignRequest: () => void;
  onDrawAction: (action: "offer" | "accept" | "decline" | "cancel") => Promise<void>;
  onTakebackAction?: (action: "offer" | "accept" | "decline" | "cancel") => Promise<void>;
  oppInfo: { oppId: string; oppLabel: string; oppColor: "white" | "black" } | null;
  opponentProfile: AccountProfile | null;
  friends: AccountFriend[];
  onFriendsChange: (friends: AccountFriend[]) => void;
  chatMessages: PvpChatMessage[];
  chatLoading: boolean;
  chatDisabled: boolean;
  onSendChat: (body: string) => Promise<void>;
  chatUnreadCount: number;
  onChatTabVisible: (visible: boolean) => void;
  canShowEvalBar: boolean;
  showEvalBar: boolean;
  onShowEvalBarChange: (v: boolean) => void;
  sidebarTab: string;
  onSidebarTabChange: (tab: string) => void;
  selectedPly?: number | null;
  onSelectPly?: (ply: number | null) => void;
  canPremove?: boolean;
  canOfferTakeback?: boolean;
  isSpectator?: boolean;
  boardFlipped?: boolean;
  onFlipBoard?: () => void;
  hideIncomingRequests?: boolean;
};

export default function OnlinePvpSidebar({
  game: g,
  moves,
  userId,
  role,
  canJoin,
  canAcceptRematch = false,
  joining,
  inviteUrl,
  presetLabel,
  waitingOpponent,
  canCancelLobby = false,
  onJoin,
  onCopyInvite,
  onCancelLobby,
  onOpenAuth,
  onResignRequest,
  onDrawAction,
  onTakebackAction,
  oppInfo,
  opponentProfile,
  friends,
  onFriendsChange,
  chatMessages,
  chatLoading,
  chatDisabled,
  onSendChat,
  chatUnreadCount,
  onChatTabVisible,
  canShowEvalBar,
  showEvalBar,
  onShowEvalBarChange,
  sidebarTab,
  onSidebarTabChange,
  selectedPly,
  onSelectPly,
  canPremove = false,
  canOfferTakeback = false,
  isSpectator = false,
  boardFlipped = false,
  onFlipBoard,
  hideIncomingRequests = false,
}: OnlinePvpSidebarProps) {
  const { t } = useLanguage();
  const o = t.playOnline;
  const drawOffersLeft =
    userId && role ? pvpDrawOffersRemaining(g, userId) : 0;
  const canOfferDraw = userId ? canUserOfferPvpDraw(g, userId) : false;

  useEffect(() => {
    onChatTabVisible(sidebarTab === "chat");
  }, [sidebarTab, onChatTabVisible]);

  const statusLabel =
    g.status === "waiting"
      ? o.statusWaiting
      : g.status === "playing"
        ? o.statusPlaying
        : g.status === "finished"
          ? o.statusFinished
          : o.statusAborted;

  return (
    <aside className="pvp-sidebar flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="shrink-0 border-cyan-500/40 text-cyan-200">
              {statusLabel}
            </Badge>
            {presetLabel && (
              <span className="text-xs text-slate-400 truncate">{presetLabel}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
            <Link href="/online">{o.newLobby}</Link>
          </Button>
        </div>

        {role && (
          <p className="text-xs text-slate-400">
            {role === "white" ? o.youAreWhite : o.youAreBlack}
            {g.status === "playing" &&
              (g.draw_offered_by ? "" : "")}
          </p>
        )}

        {isSpectator && (
          <p className="text-xs text-cyan-300/90">{o.spectatorView}</p>
        )}

        {waitingOpponent && role === "white" && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <p className="text-xs text-slate-300">{o.waitingOpponent}</p>
            <Input readOnly value={inviteUrl} className="font-mono text-[10px] h-8" />
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={onCopyInvite}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                {o.copyLink}
              </Button>
              <Button type="button" variant="outline" size="sm" asChild className="border-slate-600">
                <a
                  href={`mailto:?subject=${encodeURIComponent(o.emailInviteSubject)}&body=${encodeURIComponent(
                    o.emailInviteBody.replace("{url}", inviteUrl)
                  )}`}
                >
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  {o.shareEmail}
                </a>
              </Button>
            </div>
          </div>
        )}

        {canCancelLobby && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            {!waitingOpponent && g.status === "waiting" && (
              <p className="text-xs text-slate-300">
                {isPvpRematchLobby(g) ? o.pendingRematchOutgoing.replace(
                  "{name}",
                  oppInfo?.oppLabel ?? o.opponentName
                ) : o.waitingOpponent}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-red-500/40 text-red-300"
              onClick={onCancelLobby}
            >
              {isPvpRematchLobby(g) ? o.cancelRematch : o.cancelLobby}
            </Button>
          </div>
        )}

        {canAcceptRematch && userId && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <p className="text-xs text-slate-200">{o.acceptRematch}</p>
            <Button type="button" size="sm" onClick={onJoin} disabled={joining} className="w-full">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : o.acceptRematch}
            </Button>
          </div>
        )}

        {canJoin && !role && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <p className="text-xs text-slate-200">{o.canJoinPrompt}</p>
            <Button type="button" size="sm" onClick={onJoin} disabled={joining} className="w-full">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : o.joinGame}
            </Button>
          </div>
        )}

        {!userId && (
          <Button type="button" size="sm" onClick={onOpenAuth} className="w-full">
            {o.openAuth}
          </Button>
        )}
      </div>

      <Tabs
        value={sidebarTab}
        onValueChange={onSidebarTabChange}
        className="flex flex-col flex-1 min-h-0 rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-800 bg-slate-950/50 h-10">
          <TabsTrigger value="game" className="gap-1.5 text-xs">
            <Swords className="h-3.5 w-3.5" aria-hidden />
            {o.tabs.gamePanel}
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs relative">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {o.tabs.chat}
            {chatUnreadCount > 0 && (
              <span className="absolute top-1 right-2 min-w-[1rem] h-4 px-1 rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="game" className="flex-1 m-0 p-3 space-y-3 overflow-y-auto">
          {canShowEvalBar && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300">{o.showEvalBarSpectator}</span>
              <Switch
                checked={showEvalBar}
                onCheckedChange={onShowEvalBarChange}
                aria-label={o.showEvalBarSpectator}
              />
            </div>
          )}

          {isSpectator && onFlipBoard && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-slate-600"
              onClick={onFlipBoard}
            >
              <FlipVertical className="h-3.5 w-3.5 mr-1" />
              {o.flipBoard}
              {boardFlipped ? " ✓" : ""}
            </Button>
          )}

          {canPremove && (
            <p className="text-[10px] text-slate-500">{o.premoveHint}</p>
          )}

          <OnlinePvpMoveList
            moves={moves}
            clockMode={g.clock_mode}
            selectedPly={selectedPly}
            onSelectPly={onSelectPly}
          />

          {oppInfo && userId && (
            <OnlinePvpOpponentCard
              oppId={oppInfo.oppId}
              oppLabel={oppInfo.oppLabel}
              oppColor={oppInfo.oppColor}
              opponentProfile={opponentProfile}
              friends={friends}
              onFriendsChange={onFriendsChange}
            />
          )}

          {g.status === "playing" && role && userId && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {g.takeback_offered_by && g.takeback_offered_by !== userId && onTakebackAction && !hideIncomingRequests && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-violet-400/60 bg-violet-950/50 px-3 py-2 space-y-2"
                >
                  <p className="text-xs font-medium text-violet-100 flex items-start gap-2">
                    <RotateCcw className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                    {o.opponentOfferedTakeback}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => void onTakebackAction("accept")}
                    >
                      {o.takebackAccept}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-violet-400/50"
                      onClick={() => void onTakebackAction("decline")}
                    >
                      {o.takebackDecline}
                    </Button>
                  </div>
                </div>
              )}

              {g.takeback_offered_by === userId && onTakebackAction && (
                <div className="rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-2 text-center">
                  <p className="text-xs text-violet-100">{o.youOfferedTakeback}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => void onTakebackAction("cancel")}
                  >
                    {o.takebackCancel}
                  </Button>
                </div>
              )}

              {g.draw_offered_by && g.draw_offered_by !== userId && !hideIncomingRequests && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-amber-400/60 bg-amber-950/50 px-3 py-2 space-y-2"
                >
                  <p className="text-xs font-medium text-amber-100 flex items-start gap-2">
                    <Handshake className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                    {o.opponentOfferedDraw}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => void onDrawAction("accept")}
                    >
                      {o.drawAccept}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-amber-400/50"
                      onClick={() => void onDrawAction("decline")}
                    >
                      {o.drawDecline}
                    </Button>
                  </div>
                </div>
              )}

              {g.draw_offered_by === userId && (
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-center">
                  <p className="text-xs text-cyan-100">{o.youOfferedDraw}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => void onDrawAction("cancel")}
                  >
                    {o.drawCancel}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onResignRequest}
                >
                  {o.resign}
                </Button>
                {onTakebackAction &&
                  canOfferTakeback &&
                  !g.takeback_offered_by &&
                  !g.draw_offered_by && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-violet-500/50 text-violet-200"
                      onClick={() => void onTakebackAction("offer")}
                    >
                      {o.takebackOffer}
                    </Button>
                  )}
                {!g.draw_offered_by && !g.takeback_offered_by && canOfferDraw && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600"
                    onClick={() => void onDrawAction("offer")}
                  >
                    {o.drawOffer}
                  </Button>
                )}
              </div>
              {!g.draw_offered_by &&
                !canOfferDraw &&
                role &&
                userId &&
                g.status === "playing" && (
                  <p className="text-[10px] text-slate-500">{o.drawOfferLimit}</p>
                )}
              {canOfferDraw && drawOffersLeft < 3 && drawOffersLeft > 0 && !g.draw_offered_by && (
                <p className="text-[10px] text-slate-500">
                  {o.drawOffersRemaining.replace("{count}", String(drawOffersLeft))}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="flex-1 m-0 p-3 min-h-[240px]">
          <OnlinePvpChatPanel
            messages={chatMessages}
            loading={chatLoading}
            disabled={chatDisabled}
            userId={userId}
            onSend={onSendChat}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
