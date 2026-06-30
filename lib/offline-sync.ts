/**
 * Offline profile cache + sync queue for Supabase.
 * Uses IndexedDB when available, falls back to localStorage.
 */

const DB_NAME = "chess-avatar-offline";
const DB_VERSION = 1;
const STORE_PROFILES = "profiles";
const STORE_SYNC_QUEUE = "sync_queue";
const LS_PROFILES_KEY = "ca_offline_profiles";
const LS_QUEUE_KEY = "ca_offline_sync_queue";

export interface OfflineProfileEntry {
  id: string;
  username: string;
  platform: string;
  config: unknown;
  stats: unknown;
  updated_at: string;
  pending_sync: boolean;
}

export interface SyncQueueItem {
  id: string;
  action: "upsert_profile" | "delete_profile";
  payload: Record<string, unknown>;
  created_at: string;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: "id" });
      }
    };
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
  });
}

async function idbPut<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lsRead<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export async function cacheProfileOffline(entry: OfflineProfileEntry): Promise<void> {
  const withSync = { ...entry, pending_sync: true };
  try {
    await idbPut(STORE_PROFILES, withSync);
  } catch {
    const list = lsRead<OfflineProfileEntry[]>(LS_PROFILES_KEY, []);
    const idx = list.findIndex((p) => p.id === entry.id);
    if (idx >= 0) list[idx] = withSync;
    else list.push(withSync);
    lsWrite(LS_PROFILES_KEY, list);
  }
}

export async function getOfflineProfiles(): Promise<OfflineProfileEntry[]> {
  try {
    const fromIdb = await idbGetAll<OfflineProfileEntry>(STORE_PROFILES);
    if (fromIdb.length > 0) return fromIdb;
  } catch {
    /* fall through */
  }
  return lsRead<OfflineProfileEntry[]>(LS_PROFILES_KEY, []);
}

export async function enqueueSyncItem(item: Omit<SyncQueueItem, "id" | "created_at">): Promise<void> {
  const full: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  try {
    await idbPut(STORE_SYNC_QUEUE, full);
  } catch {
    const queue = lsRead<SyncQueueItem[]>(LS_QUEUE_KEY, []);
    queue.push(full);
    lsWrite(LS_QUEUE_KEY, queue);
  }
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const fromIdb = await idbGetAll<SyncQueueItem>(STORE_SYNC_QUEUE);
    if (fromIdb.length > 0) return fromIdb.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch {
    /* fall through */
  }
  return lsRead<SyncQueueItem[]>(LS_QUEUE_KEY, []).sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

export async function clearSyncItem(id: string): Promise<void> {
  try {
    await idbDelete(STORE_SYNC_QUEUE, id);
  } catch {
    const queue = lsRead<SyncQueueItem[]>(LS_QUEUE_KEY, []).filter((q) => q.id !== id);
    lsWrite(LS_QUEUE_KEY, queue);
  }
}

export async function markProfileSynced(profileId: string): Promise<void> {
  const profiles = await getOfflineProfiles();
  const updated = profiles.map((p) =>
    p.id === profileId ? { ...p, pending_sync: false } : p
  );
  for (const p of updated) {
    await idbPut(STORE_PROFILES, p);
  }
  lsWrite(LS_PROFILES_KEY, updated);
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  if (typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}
