/**
 * IndexedDB cache for ChessAvatar NNUE weights (~20 MB).
 * Avoids re-downloading on every visit; bump NNUE_CACHE_SCHEMA_VERSION when the bundled file changes.
 */

export const NNUE_CACHE_DB_NAME = "chessavatar-nnue";
export const NNUE_CACHE_STORE_NAME = "files";

/** Bump when `public/chessavatar/nn-default.nnue` is replaced. */
export const NNUE_CACHE_SCHEMA_VERSION = 1;

type CacheRecord = {
  url: string;
  version: number;
  bytes: ArrayBuffer;
  cachedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NNUE_CACHE_DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NNUE_CACHE_STORE_NAME)) {
        db.createObjectStore(NNUE_CACHE_STORE_NAME, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbGet<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
}

function idbPut(store: IDBObjectStore, value: CacheRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(value);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB put failed"));
    request.onsuccess = () => resolve();
  });
}

export async function readNnueFromCache(url: string): Promise<Uint8Array | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const tx = db.transaction(NNUE_CACHE_STORE_NAME, "readonly");
    const record = await idbGet<CacheRecord>(tx.objectStore(NNUE_CACHE_STORE_NAME), url);
    db.close();
    if (!record || record.version !== NNUE_CACHE_SCHEMA_VERSION) return null;
    return new Uint8Array(record.bytes);
  } catch {
    return null;
  }
}

export async function writeNnueToCache(url: string, bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    const tx = db.transaction(NNUE_CACHE_STORE_NAME, "readwrite");
    await idbPut(tx.objectStore(NNUE_CACHE_STORE_NAME), {
      url,
      version: NNUE_CACHE_SCHEMA_VERSION,
      bytes: new Uint8Array(bytes).buffer,
      cachedAt: Date.now(),
    });
    db.close();
  } catch {
    // Private browsing or quota exceeded — ignore.
  }
}

/** Cache-first NNUE load; falls back to network fetch. */
export async function loadNnueWithCache(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<Uint8Array> {
  const cached = await readNnueFromCache(url);
  if (cached) return cached;

  const resp = await fetchImpl(url);
  if (!resp.ok) {
    throw new Error(`NNUE fetch failed: ${resp.status}`);
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  void writeNnueToCache(url, bytes);
  return bytes;
}
