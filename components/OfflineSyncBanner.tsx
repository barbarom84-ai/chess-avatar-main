"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useLanguage } from "@/lib/language-context";

export default function OfflineSyncBanner() {
  const { online, pendingCount, syncing, syncNow } = useOfflineSync();
  const { t } = useLanguage();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm rounded-lg border ${
        online
          ? "bg-amber-950/50 border-amber-800 text-amber-200"
          : "bg-slate-900/80 border-slate-700 text-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        {online ? (
          <Wifi className="h-4 w-4 text-green-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-slate-400" />
        )}
        <span>
          {online ? t.offlineSync.pendingSync : t.offlineSync.offlineMode}
        </span>
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {pendingCount}
          </Badge>
        )}
      </div>
      {online && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={syncing}
          onClick={() => void syncNow()}
          className="h-7"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {t.offlineSync.syncNow}
        </Button>
      )}
    </div>
  );
}
