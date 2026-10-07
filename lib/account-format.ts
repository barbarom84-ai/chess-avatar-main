import type { AccountStreak } from "@/lib/account-types";

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export function localeFor(lang: string): string {
  return lang === "fr" ? "fr-FR" : "en-US";
}

export function formatPlayTime(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

export function formatRelativeDate(iso: string, lang: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" });
  const diffSec = Math.round((t - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86_400 * 7) return rtf.format(Math.round(diffSec / 86_400), "day");
  return new Date(t).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" });
}

export function formatShortDate(dateKey: string, lang: string): string {
  const t = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(t)) return dateKey;
  return new Date(t).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatStreak(
  streak: AccountStreak,
  labels: { win: string; loss: string; draw: string },
  empty: string
): string {
  if (!streak.outcome || streak.count <= 0) return empty;
  return fill(labels[streak.outcome], { n: streak.count });
}
