const STORAGE_KEY = "chess-avatar.library.viewMode";

export type LibraryViewMode = "list" | "cards";

export function readLibraryViewMode(): LibraryViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "cards" || v === "list") return v;
  } catch {
    /* ignore */
  }
  return "list";
}

export function writeLibraryViewMode(mode: LibraryViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
