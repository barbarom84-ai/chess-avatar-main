import type { fr } from "./fr";

/** Widen string literals so FR/EN bundles share one consumer type. */
type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends object
      ? { [K in keyof T]: WidenStrings<T[K]> }
      : T;

export type TranslationKey = WidenStrings<typeof fr>;
export type Language = "fr" | "en";

/** Load a single locale bundle (code-split per language). */
export async function loadLocale(lang: Language): Promise<TranslationKey> {
  if (lang === "fr") {
    const { fr: locale } = await import("./fr");
    return locale as TranslationKey;
  }
  const { en: locale } = await import("./en");
  return locale as TranslationKey;
}
