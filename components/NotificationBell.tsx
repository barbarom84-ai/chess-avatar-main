"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Crown, WifiOff, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import {
  useSiteNotifications,
  type SiteNotificationKind,
} from "@/contexts/SiteNotificationsContext";

function KindIcon({ kind }: { kind: SiteNotificationKind }) {
  if (kind === "upgrade") return <Crown className="h-4 w-4 text-amber-400 shrink-0" />;
  if (kind === "offline") return <WifiOff className="h-4 w-4 text-slate-400 shrink-0" />;
  if (kind === "warning") return <RefreshCw className="h-4 w-4 text-amber-300 shrink-0" />;
  return <Info className="h-4 w-4 text-cyan-300 shrink-0" />;
}

export default function NotificationBell() {
  const { t } = useLanguage();
  const { items, unreadCount, markAllRead } = useSiteNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (next) markAllRead();
            return next;
          })
        }
        className="relative text-slate-400 hover:text-cyan-300"
        aria-label={t.notifications.title}
        title={t.notifications.title}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label={t.notifications.title}
          className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] text-left bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.notifications.title}
            </p>
            {unreadCount > 0 && (
              <span className="text-[10px] text-amber-300 font-mono">{unreadCount}</span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-slate-500 text-center">
              {t.notifications.empty}
            </p>
          ) : (
            <ul className="max-h-[min(24rem,70vh)] overflow-y-auto divide-y divide-slate-800">
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <KindIcon kind={item.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                        {item.body}
                      </p>
                    </div>
                  </div>
                  {(item.href || item.onAction) && (
                    <div className="flex justify-end pl-6">
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="text-xs text-cyan-300 hover:text-cyan-100"
                        >
                          {item.actionLabel ?? t.notifications.open}
                        </Link>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                          onClick={() => {
                            item.onAction?.();
                            setOpen(false);
                          }}
                        >
                          {item.actionLabel}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
