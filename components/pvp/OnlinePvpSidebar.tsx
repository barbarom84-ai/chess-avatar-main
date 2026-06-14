"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Copy, Handshake, Loader2, Mail, MessageSquare, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import OnlinePvpMoveList from "@/components/pvp/OnlinePvpMoveList";
import OnlinePvpChatPanel from "@/components/pvp/OnlinePvpChatPanel";
import OnlinePvpOpponentCard from "@/components/OnlinePvpOpponentCard";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import type { PvpChatMessage } from "@/lib/pvp-chat";
import { useLanguage } from "@/lib/language-context";

type OnlinePvpSidebarProps = {
  game: PvpGameRow;
  moves: PvpMoveRow[];
  userId: string | null;
  role: "white" | "black" | null;
  canJoin: boolean;
  joining: boolean;
  inviteUrl: string;
  presetLabel: string | null;
  waitingOpponent: boolean;
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
  chatMessages: PvpChatMessage[];
  chatLoading: boolean;
  chatDisabled: boolean;
  onSendChat: (body: string) => Promise<void>;
  chatUnreadCount: number;
  onChatTabVisible: (visible: boolean) => void;
  showEvalBar: boolean;
  onShowEvalBarChange: (v: boolean) => void;
  sidebarTab: string;
  onSidebarTabChange: (tab: string) => void;
};

export default function OnlinePvpSidebar({
  game: g,
  moves,
  userId,
  role,
  canJoin,
  joining,
  inviteUrl,
  presetLabel,
  waitingOpponent,
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
  chatMessages,
  chatLoading,
  chatDisabled,
  onSendChat,
  chatUnreadCount,
  onChatTabVisible,
  showEvalBar,
  onShowEvalBarChange,
  sidebarTab,
  onSidebarTabChange,
}: OnlinePvpSidebarProps) {
  const { t } = useLanguage();
  const o = t.playOnline;

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-300"
                onClick={onCancelLobby}
              >
                {o.cancelLobby}
              </Button>
            </div>
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-300">{o.showEvalBar}</span>
            <Switch
              checked={showEvalBar}
              onCheckedChange={onShowEvalBarChange}
              aria-label={o.showEvalBar}
            />
          </div>

          <OnlinePvpMoveList moves={moves} />

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
              {g.draw_offered_by && g.draw_offered_by !== userId && (
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
                  onClick={() => void onResign()}
                >
                  {o.resign}
                </Button>
                {!g.draw_offered_by && (
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
