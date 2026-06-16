"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Loader2, Plus, LayoutGrid, Users, Trash2, UserMinus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountAvatar from "@/components/AccountAvatar";
import OnlinePvpTimeControlGrid from "@/components/pvp/OnlinePvpTimeControlGrid";
import { accountProfileInitials } from "@/lib/account-profile";
import { removeAccountFriendRemote } from "@/lib/account-friends";
import type { AccountFriend } from "@/lib/account-types";
import type { ActivePvpGame, OpenPvpLobby } from "@/hooks/useOpenPvpLobbies";
import { useLanguage } from "@/lib/language-context";

const SimpleChessboard = dynamic(() => import("@/components/SimpleChessboard"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full rounded-lg bg-slate-900/80 animate-pulse" aria-hidden />
  ),
});

type OnlinePvpLobbyLayoutProps = {
  userId: string | null;
  timePreset: string;
  onTimePresetChange: (id: string) => void;
  creating: boolean;
  onCreate: () => void;
  onOpenAuth: () => void;
  onInviteFriend: () => void;
  activeGames: ActivePvpGame[];
  openLobbiesList: OpenPvpLobby[];
  lobbiesLoading: boolean;
  lobbiesError: string | null;
  onRefreshLobbies: () => void;
  onCancelLobby: (id: string) => Promise<void>;
  friends: AccountFriend[];
  friendsLoading: boolean;
  onFriendsChange: (friends: AccountFriend[]) => void;
  locale: string;
  presetLabels: Record<string, string>;
  canQuickPlay?: boolean;
  matchmakingInQueue?: boolean;
  matchmakingJoining?: boolean;
  matchmakingQueueSize?: number;
  onQuickPlay?: () => void;
  onCancelMatchmaking?: () => void;
};

import type { TranslationKey } from "@/lib/i18n";

type PlayOnlineCopy = TranslationKey["playOnline"];

function ActiveGamesList({
  activeGames,
  presetLabels,
  o,
}: {
  activeGames: ActivePvpGame[];
  presetLabels: Record<string, string>;
  o: PlayOnlineCopy;
}) {
  if (activeGames.length === 0) {
    return <p className="text-sm text-slate-500">{o.activeGamesEmpty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-800 rounded-md border border-slate-800/80 overflow-hidden">
      {activeGames.map((ag) => (
        <li
          key={ag.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 bg-slate-900/40"
        >
          <div className="min-w-0 flex items-start gap-2.5">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
              <AccountAvatar
                src={ag.opponent_avatar_url}
                alt={ag.opponent_display_name ?? o.anonymousPlayer}
                initials={accountProfileInitials(
                  ag.opponent_display_name ?? o.anonymousPlayer
                )}
                sizes="36px"
                className="text-[10px]"
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-slate-200 font-medium truncate">
                {o.resumeGameOpponent.replace(
                  "{name}",
                  ag.opponent_display_name ?? o.anonymousPlayer
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {presetLabels[ag.time_preset] ?? ag.time_preset}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-slate-600">
                  {ag.role === "white" ? o.youAreWhite : o.youAreBlack}
                </Badge>
              </div>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/online?game=${ag.id}`}>{o.resumeGame}</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function OpenLobbiesList({
  openLobbiesList,
  presetLabels,
  locale,
  o,
  onCancelLobby,
}: {
  openLobbiesList: OpenPvpLobby[];
  presetLabels: Record<string, string>;
  locale: string;
  o: PlayOnlineCopy;
  onCancelLobby: (id: string) => Promise<void>;
}) {
  if (openLobbiesList.length === 0) {
    return <p className="text-sm text-slate-500">{o.openLobbiesEmpty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-800 rounded-md border border-slate-800/80 overflow-hidden">
      {openLobbiesList.map((lobby) => (
        <li
          key={lobby.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 bg-slate-900/40"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={
                  lobby.isHost
                    ? "border-cyan-500/50 text-cyan-200"
                    : "border-slate-600 text-slate-300"
                }
              >
                {lobby.isHost ? o.yourLobby : o.strangerLobby}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {presetLabels[lobby.time_preset] ?? lobby.time_preset}
              </Badge>
            </div>
            {!lobby.isHost && (
              <Link
                href={`/players/${lobby.host_user_id}`}
                className="flex items-center gap-2.5 min-w-0 hover:opacity-90"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
                  <AccountAvatar
                    src={lobby.host_avatar_url}
                    alt={lobby.host_display_name ?? o.anonymousHost}
                    initials={accountProfileInitials(
                      lobby.host_display_name ?? o.anonymousHost
                    )}
                    sizes="40px"
                    className="text-xs"
                  />
                </div>
                <p className="text-sm font-medium text-slate-200 truncate">
                  {lobby.host_display_name ?? o.anonymousHost}
                </p>
              </Link>
            )}
            {lobby.isHost && lobby.host_display_name && (
              <p className="text-xs text-slate-500">
                {o.waitingHostYou.replace("{name}", lobby.host_display_name)}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {new Date(lobby.created_at).toLocaleString(locale, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {lobby.isHost && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                title={o.removeLobby}
                onClick={() =>
                  void onCancelLobby(lobby.id).then(() => toast.success(o.lobbyRemoved))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/online?game=${lobby.id}`}>
                {lobby.isHost ? o.openLobby : o.joinLobbyRow}
              </Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function OnlinePvpLobbyLayout({
  userId,
  timePreset,
  onTimePresetChange,
  creating,
  onCreate,
  onOpenAuth,
  onInviteFriend,
  activeGames,
  openLobbiesList,
  lobbiesLoading,
  lobbiesError,
  onRefreshLobbies,
  onCancelLobby,
  friends,
  friendsLoading,
  onFriendsChange,
  locale,
  presetLabels,
  canQuickPlay = false,
  matchmakingInQueue = false,
  matchmakingJoining = false,
  matchmakingQueueSize = 0,
  onQuickPlay,
  onCancelMatchmaking,
}: OnlinePvpLobbyLayoutProps) {
  const { t } = useLanguage();
  const o = t.playOnline;
  const onlinePage = t.pages.online;

  return (
    <div className="pvp-lobby-layout max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-6 lg:gap-8 items-start">
        <div className="hidden lg:block space-y-4 sticky top-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-lg">
            <div className="aspect-square w-full max-w-md mx-auto">
              <SimpleChessboard position="start" orientation="white" />
            </div>
          </div>
          <div className="text-center space-y-1 px-2">
            <h1 className="text-2xl font-bold text-cyan-400">{onlinePage.title}</h1>
            <p className="text-sm theme-text-secondary">{onlinePage.subtitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="lg:hidden text-center space-y-1">
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center justify-center gap-2">
              <Users className="h-7 w-7" aria-hidden />
              {onlinePage.title}
            </h1>
            <p className="text-sm theme-text-secondary">{onlinePage.subtitle}</p>
          </div>

          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 border border-slate-800">
              <TabsTrigger value="new" className="gap-1.5 text-xs sm:text-sm">
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                {o.tabs.newGame}
              </TabsTrigger>
              <TabsTrigger value="games" className="gap-1.5 text-xs sm:text-sm">
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                {o.tabs.games}
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-1.5 text-xs sm:text-sm">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                {o.tabs.players}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4 space-y-4">
              <p className="text-sm text-slate-400">{o.joinHint}</p>
              {userId ? (
                <OnlinePvpTimeControlGrid
                  value={timePreset}
                  onChange={onTimePresetChange}
                  disabled={creating}
                />
              ) : null}
              {!userId ? (
                <Button type="button" onClick={onOpenAuth} className="w-full">
                  {o.openAuth}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={onQuickPlay}
                    disabled={
                      creating ||
                      matchmakingJoining ||
                      matchmakingInQueue ||
                      !canQuickPlay
                    }
                    variant="secondary"
                    className="w-full h-11 text-base font-semibold border border-cyan-500/40"
                  >
                    {matchmakingJoining || matchmakingInQueue ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" aria-hidden />
                        {o.quickPlay}
                      </>
                    )}
                  </Button>
                  {matchmakingInQueue && (
                    <div className="rounded-md border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 space-y-2">
                      <p className="text-xs text-cyan-100">{o.matchmakingSearching}</p>
                      {matchmakingQueueSize > 1 && (
                        <p className="text-[10px] text-slate-400">
                          {matchmakingQueueSize} {presetLabels[timePreset] ?? timePreset}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-600"
                        onClick={onCancelMatchmaking}
                      >
                        {o.matchmakingCancel}
                      </Button>
                    </div>
                  )}
                  {!canQuickPlay && userId && (
                    <p className="text-xs text-slate-500">{o.matchmakingOnlyLive}</p>
                  )}
                  <Button
                    type="button"
                    onClick={onCreate}
                    disabled={creating || matchmakingInQueue}
                    className="w-full h-11 text-base font-semibold"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      o.startGame
                    )}
                  </Button>
                </>
              )}
              <Button variant="outline" asChild className="w-full border-slate-700">
                <Link href="/play">{o.backToBots}</Link>
              </Button>
            </TabsContent>

            <TabsContent value="games" className="mt-4 space-y-6">
              {!userId ? (
                <p className="text-sm text-slate-500">{o.openAuth}</p>
              ) : (
                <>
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-cyan-100">
                        {o.activeGamesTitle}
                      </h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-cyan-300 shrink-0 h-8"
                        onClick={onRefreshLobbies}
                      >
                        {lobbiesLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          "↻"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">{o.activeGamesHint}</p>
                    <ActiveGamesList
                      activeGames={activeGames}
                      presetLabels={presetLabels}
                      o={o}
                    />
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-emerald-100">
                        {o.openLobbiesTitle}
                      </h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-emerald-300 shrink-0 h-8"
                        onClick={onRefreshLobbies}
                      >
                        {lobbiesLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          "↻"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">{o.openLobbiesHint}</p>
                    {lobbiesError && (
                      <p className="text-sm text-amber-200/90">{o.openLobbiesError}</p>
                    )}
                    {lobbiesLoading &&
                    openLobbiesList.length === 0 &&
                    activeGames.length === 0 &&
                    !lobbiesError ? (
                      <p className="text-sm text-slate-500">{o.openLobbiesLoading}</p>
                    ) : (
                      <OpenLobbiesList
                        openLobbiesList={openLobbiesList}
                        presetLabels={presetLabels}
                        locale={locale}
                        o={o}
                        onCancelLobby={onCancelLobby}
                      />
                    )}
                  </section>
                </>
              )}
            </TabsContent>

            <TabsContent value="players" className="mt-4 space-y-3">
              {!userId ? (
                <p className="text-sm text-slate-500">{o.openAuth}</p>
              ) : friendsLoading ? (
                <p className="text-sm text-slate-500">{o.openLobbiesLoading}</p>
              ) : friends.length === 0 ? (
                <p className="text-sm text-slate-500">{o.friendsEmpty}</p>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f) => (
                    <li
                      key={f.friendUserId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
                    >
                      <Link
                        href={`/players/${f.friendUserId}`}
                        className="flex items-center gap-3 min-w-0 hover:opacity-90"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
                          <AccountAvatar
                            src={f.avatarUrl}
                            alt={f.displayName}
                            initials={accountProfileInitials(f.displayName)}
                            sizes="40px"
                            className="text-xs"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {f.label || f.displayName}
                          </p>
                          {f.label && f.label !== f.displayName ? (
                            <p className="text-[10px] text-slate-500 truncate">
                              {f.displayName}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={creating}
                          onClick={onInviteFriend}
                        >
                          {o.inviteFriend}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            void removeAccountFriendRemote(f.friendUserId).then((next) => {
                              if (!next) {
                                toast.error(o.openLobbiesError);
                                return;
                              }
                              onFriendsChange(next);
                              toast.success(o.friendRemoved);
                            });
                          }}
                        >
                          <UserMinus className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{o.removeFriend}</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate-500">{o.friendsHint}</p>
              <p className="text-[11px] text-slate-500">{o.inviteFriendHint}</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
