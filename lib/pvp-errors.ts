import { PARITY } from "@/lib/parity-contract";

/** Server error message → i18n key (shared with Android through the parity contract). */
const PVP_ERROR_I18N_KEYS: Record<string, string> = PARITY.pvp.errorMessages;

/** Message utilisateur à partir d'une erreur API PvP. */
export function mapPvpErrorMessage(raw: string, t: Record<string, string>): string {
  const key = raw.trim();
  const i18nKey = PVP_ERROR_I18N_KEYS[key];
  if (i18nKey !== undefined) return t[i18nKey] ?? raw;
  return key.length > 0 && key.length < 120 ? key : t.generic ?? raw;
}

export function pvpErrorFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
