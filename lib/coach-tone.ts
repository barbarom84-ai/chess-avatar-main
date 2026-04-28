/** Style hint for /api/coach/explain prompts (shared by UI + API). */
export type CoachToneId = "pedagogical" | "concise" | "witty";

export const COACH_TONES: readonly CoachToneId[] = [
  "pedagogical",
  "concise",
  "witty",
] as const;

export function isCoachToneId(v: unknown): v is CoachToneId {
  return v === "pedagogical" || v === "concise" || v === "witty";
}
