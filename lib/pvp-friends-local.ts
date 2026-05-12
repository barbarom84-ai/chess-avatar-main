const STORAGE_KEY = "chess-avatar.pvp.friends.v1";

export type PvpFriendEntry = {
  userId: string;
  label: string;
  addedAt: string;
};

function readRaw(): unknown {
  if (typeof window === "undefined") return [];
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    return JSON.parse(s) as unknown;
  } catch {
    return [];
  }
}

export function loadPvpFriends(): PvpFriendEntry[] {
  const raw = readRaw();
  if (!Array.isArray(raw)) return [];
  const out: PvpFriendEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const userId = typeof o.userId === "string" ? o.userId : "";
    const label = typeof o.label === "string" ? o.label : "";
    const addedAt = typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString();
    if (userId.length >= 8) out.push({ userId, label: label.slice(0, 80) || "Friend", addedAt });
  }
  return out.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

function writeAll(friends: PvpFriendEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
  } catch {
    /* ignore quota */
  }
}

export function addPvpFriend(entry: Omit<PvpFriendEntry, "addedAt">): void {
  const friends = loadPvpFriends().filter((f) => f.userId !== entry.userId);
  friends.unshift({
    userId: entry.userId,
    label: entry.label.slice(0, 80),
    addedAt: new Date().toISOString(),
  });
  writeAll(friends);
}

export function removePvpFriend(userId: string): void {
  writeAll(loadPvpFriends().filter((f) => f.userId !== userId));
}

export function isPvpFriend(userId: string): boolean {
  return loadPvpFriends().some((f) => f.userId === userId);
}
