import { translations } from "@/lib/translations";

/** Browser tab titles (English default; UI titles follow client language). */
export const pageMetaTitles = {
  analyze: translations.en.pages.analyze.metaTitle,
  play: translations.en.pages.play.metaTitle,
  online: translations.en.pages.online.metaTitle,
  arena: translations.en.pages.arena.metaTitle,
  learn: translations.en.pages.learn.metaTitle,
  puzzles: translations.en.pages.puzzles.metaTitle,
  profile: translations.en.pages.profile.metaTitle,
  avatars: translations.en.pages.avatars.metaTitle,
  games: translations.en.pages.games.metaTitle,
  review: translations.en.pages.review.metaTitle,
  guide: translations.en.pages.guide.metaTitle,
  contact: translations.en.contact.title,
  terms: translations.en.legal.termsTitle,
  privacy: translations.en.legal.privacyTitle,
  refund: translations.en.legal.refundTitle,
} as const;
