export const REVIEW_UI_PREF_KEYS = [
  "moves",
  "moveDetail",
  "summary",
  "keyMoments",
  "evalGraph",
  "coachAnalysis",
] as const;

export type ReviewUiPrefKey = (typeof REVIEW_UI_PREF_KEYS)[number];
export type ReviewUiPrefs = Record<ReviewUiPrefKey, boolean>;

export const DEFAULT_REVIEW_UI_PREFS: ReviewUiPrefs = {
  moves: true,
  moveDetail: false,
  summary: false,
  keyMoments: true,
  evalGraph: false,
  coachAnalysis: true,
};

const STORAGE_KEY = "chess-avatar.review.uiPanels";

export function readReviewUiPrefs(): ReviewUiPrefs {
  if (typeof window === "undefined") return DEFAULT_REVIEW_UI_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REVIEW_UI_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReviewUiPrefs>;
    const next = { ...DEFAULT_REVIEW_UI_PREFS };
    for (const key of REVIEW_UI_PREF_KEYS) {
      if (typeof parsed[key] === "boolean") next[key] = parsed[key];
    }
    return next;
  } catch {
    return DEFAULT_REVIEW_UI_PREFS;
  }
}

export function writeReviewUiPrefs(prefs: ReviewUiPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
