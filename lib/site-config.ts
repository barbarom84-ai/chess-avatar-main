import { NAV_HREFS } from "@/lib/nav-items";

export type NavPageBadge = "none" | "beta" | "maintenance";

export type SiteNavPageConfig = {
  hidden?: boolean;
  badge?: NavPageBadge;
};

export type SiteMaintenanceConfig = {
  overlayEnabled: boolean;
  message: { fr: string; en: string };
  showCountdown: boolean;
  countdownEndsAt: string | null;
};

export type SiteConfig = {
  nav: Record<string, SiteNavPageConfig>;
  maintenance: SiteMaintenanceConfig;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  nav: Object.fromEntries(NAV_HREFS.map((href) => [href, { hidden: false, badge: "none" as const }])),
  maintenance: {
    overlayEnabled: false,
    message: {
      fr: "Le site est en maintenance. Merci de revenir bientôt.",
      en: "The site is under maintenance. Please check back soon.",
    },
    showCountdown: false,
    countdownEndsAt: null,
  },
};

function isNavBadge(v: unknown): v is NavPageBadge {
  return v === "none" || v === "beta" || v === "maintenance";
}

export function parseSiteConfig(raw: unknown): SiteConfig {
  const base = structuredClone(DEFAULT_SITE_CONFIG);
  if (!raw || typeof raw !== "object") return base;

  const obj = raw as Record<string, unknown>;

  if (obj.nav && typeof obj.nav === "object") {
    for (const href of NAV_HREFS) {
      const page = (obj.nav as Record<string, unknown>)[href];
      if (!page || typeof page !== "object") continue;
      const p = page as Record<string, unknown>;
      base.nav[href] = {
        hidden: Boolean(p.hidden),
        badge: isNavBadge(p.badge) ? p.badge : "none",
      };
    }
  }

  if (obj.maintenance && typeof obj.maintenance === "object") {
    const m = obj.maintenance as Record<string, unknown>;
    const msg = m.message;
    base.maintenance = {
      overlayEnabled: Boolean(m.overlayEnabled),
      showCountdown: Boolean(m.showCountdown),
      countdownEndsAt:
        typeof m.countdownEndsAt === "string" && m.countdownEndsAt.trim()
          ? m.countdownEndsAt
          : null,
      message: {
        fr:
          msg && typeof msg === "object" && typeof (msg as { fr?: unknown }).fr === "string"
            ? (msg as { fr: string }).fr
            : base.maintenance.message.fr,
        en:
          msg && typeof msg === "object" && typeof (msg as { en?: unknown }).en === "string"
            ? (msg as { en: string }).en
            : base.maintenance.message.en,
      },
    };
  }

  return base;
}

export function getVisibleNavHrefs(config: SiteConfig, isSuperUser: boolean): string[] {
  return NAV_HREFS.filter((href) => {
    if (isSuperUser) return true;
    return !config.nav[href]?.hidden;
  });
}
