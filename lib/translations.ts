/**
 * @deprecated Prefer `loadLocale` from `@/lib/i18n` for client bundles.
 * Server metadata may import `en` from `@/lib/i18n/en` directly.
 */
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";

export type { Language, TranslationKey } from "./i18n";
export { loadLocale } from "./i18n";

/** Both locales — avoid in client components; use `useLanguage().t` instead. */
export const translations = { fr, en } as const;
