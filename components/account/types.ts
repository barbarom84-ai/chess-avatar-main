import type { TranslationKey } from "@/lib/i18n";

export type AccountCopy = TranslationKey["profileDashboard"];

export const ACCOUNT_TABS = ["overview", "stats", "social", "settings"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function parseAccountTab(value: string | null | undefined): AccountTab {
  return ACCOUNT_TABS.includes(value as AccountTab) ? (value as AccountTab) : "overview";
}
