"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import UpgradeModal from "@/components/UpgradeModal";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  ASCENSION_FREE_PUZZLES_PER_TRACK,
  ASCENSION_PREMIUM_PUZZLES_PER_TRACK,
} from "@/lib/ascension/constants";

const READ_STORAGE_KEY = "chess-avatar.notifications.read";
const FREE_ENGINE_DEPTH = 12;
const FREE_MAX_PLIES = 60;

export type SiteNotificationKind = "info" | "warning" | "upgrade" | "offline";

export type SiteNotification = {
  id: string;
  kind: SiteNotificationKind;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type UpgradeReason = "theme" | "pieces" | "profiles" | "coach" | "review" | "ascension";

type SiteNotificationsContextValue = {
  items: SiteNotification[];
  unreadCount: number;
  markAllRead: () => void;
  register: (item: SiteNotification) => void;
  unregister: (id: string) => void;
  openUpgrade: (reason?: UpgradeReason) => void;
};

const SiteNotificationsContext = createContext<SiteNotificationsContextValue | null>(
  null
);

function readStoredIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function SiteNotificationsProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { isPremium, loading: premiumLoading, userId, email } = usePremium();
  const offline = useOfflineSync();
  const [extras, setExtras] = useState<Record<string, SiteNotification>>({});
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("review");

  useEffect(() => {
    setReadIds(readStoredIds(READ_STORAGE_KEY));
  }, []);

  const persistRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const same =
        prev.length === ids.length &&
        prev.every((id) => ids.includes(id)) &&
        ids.every((id) => prev.includes(id));
      if (same) return prev;
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
      } catch {
        /* ignore quota */
      }
      return ids;
    });
  }, []);

  const openUpgrade = useCallback((reason: UpgradeReason = "review") => {
    setUpgradeReason(reason);
    setShowUpgrade(true);
  }, []);

  const register = useCallback((item: SiteNotification) => {
    setExtras((prev) => {
      const current = prev[item.id];
      if (
        current &&
        current.title === item.title &&
        current.body === item.body &&
        current.kind === item.kind &&
        current.actionLabel === item.actionLabel &&
        current.href === item.href
      ) {
        return prev;
      }
      return { ...prev, [item.id]: item };
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setExtras((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const builtin = useMemo<SiteNotification[]>(() => {
    const list: SiteNotification[] = [];
    if (!premiumLoading && !isPremium) {
      list.push({
        id: "free-plan",
        kind: "upgrade",
        title: t.notifications.freePlanTitle,
        body: t.notifications.freePlanBody
          .replace("{depth}", String(FREE_ENGINE_DEPTH))
          .replace("{plies}", String(FREE_MAX_PLIES))
          .replace("{free}", String(ASCENSION_FREE_PUZZLES_PER_TRACK))
          .replace("{premium}", String(ASCENSION_PREMIUM_PUZZLES_PER_TRACK)),
        actionLabel: t.notifications.upgradeCta,
        onAction: () => openUpgrade("review"),
      });
    }
    if (!offline.online) {
      list.push({
        id: "offline",
        kind: "offline",
        title: t.notifications.offlineTitle,
        body: t.offlineSync.offlineMode,
      });
    } else if (offline.pendingCount > 0) {
      list.push({
        id: "offline-pending",
        kind: "warning",
        title: t.notifications.pendingTitle,
        body: t.offlineSync.pendingSync,
        actionLabel: t.offlineSync.syncNow,
        onAction: () => {
          void offline.syncNow();
        },
      });
    }
    return list;
  }, [
    premiumLoading,
    isPremium,
    offline.online,
    offline.pendingCount,
    offline.syncNow,
    openUpgrade,
    t.notifications.freePlanTitle,
    t.notifications.freePlanBody,
    t.notifications.upgradeCta,
    t.notifications.offlineTitle,
    t.notifications.pendingTitle,
    t.offlineSync.offlineMode,
    t.offlineSync.pendingSync,
    t.offlineSync.syncNow,
  ]);

  const items = useMemo(() => {
    const extraList = Object.values(extras);
    const seen = new Set(builtin.map((n) => n.id));
    return [...builtin, ...extraList.filter((n) => !seen.has(n.id))];
  }, [builtin, extras]);

  const unreadCount = useMemo(
    () => items.filter((n) => !readIds.includes(n.id)).length,
    [items, readIds]
  );

  const markAllRead = useCallback(() => {
    const ids = Array.from(new Set([...readIds, ...items.map((n) => n.id)]));
    persistRead(ids);
  }, [items, persistRead, readIds]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      markAllRead,
      register,
      unregister,
      openUpgrade,
    }),
    [items, unreadCount, markAllRead, register, unregister, openUpgrade]
  );

  return (
    <SiteNotificationsContext.Provider value={value}>
      {children}
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        userId={userId}
        email={email}
        reason={upgradeReason}
      />
    </SiteNotificationsContext.Provider>
  );
}

export function useSiteNotifications() {
  const ctx = useContext(SiteNotificationsContext);
  if (!ctx) {
    throw new Error("useSiteNotifications must be used within SiteNotificationsProvider");
  }
  return ctx;
}

/** Register a page-specific notice while the caller is mounted. */
export function useSiteNotification(item: SiteNotification | null) {
  const ctx = useContext(SiteNotificationsContext);
  const actionRef = useRef(item?.onAction);
  actionRef.current = item?.onAction;

  const id = item?.id ?? null;
  const kind = item?.kind;
  const title = item?.title;
  const body = item?.body;
  const href = item?.href;
  const actionLabel = item?.actionLabel;
  const hasAction = Boolean(item?.onAction);

  useEffect(() => {
    if (!ctx || !id || !kind || !title || !body) return;
    ctx.register({
      id,
      kind,
      title,
      body,
      href,
      actionLabel,
      onAction: hasAction ? () => actionRef.current?.() : undefined,
    });
    return () => ctx.unregister(id);
  }, [ctx, id, kind, title, body, href, actionLabel, hasAction]);
}
