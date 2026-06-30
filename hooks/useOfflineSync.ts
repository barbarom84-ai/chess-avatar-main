"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getSyncQueue,
  clearSyncItem,
  isBrowserOnline,
  markProfileSynced,
  type SyncQueueItem,
} from "@/lib/offline-sync";

export interface OfflineSyncState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refreshQueue = useCallback(async () => {
    const queue = await getSyncQueue();
    setPendingCount(queue.length);
  }, []);

  useEffect(() => {
    setOnline(isBrowserOnline());
    void refreshQueue();

    const onOffline = () => setOnline(false);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshQueue]);

  const processItem = async (item: SyncQueueItem): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    if (item.action === "upsert_profile") {
      const payload = item.payload;
      const { error } = await supabase.from("profiles").upsert({
        ...payload,
        user_id: user.id,
      });
      if (error) return false;
      const profileId = String(payload.id ?? "");
      if (profileId) await markProfileSynced(profileId);
      return true;
    }

    if (item.action === "delete_profile") {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", String(item.payload.id));
      return !error;
    }

    return false;
  };

  const syncNow = useCallback(async () => {
    if (!isBrowserOnline() || !isSupabaseConfigured) return;
    setSyncing(true);
    try {
      const queue = await getSyncQueue();
      for (const item of queue) {
        const ok = await processItem(item);
        if (ok) await clearSyncItem(item.id);
      }
      setLastSyncAt(new Date().toISOString());
      await refreshQueue();
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncNow]);

  return { online, pendingCount, syncing, lastSyncAt, syncNow };
}
