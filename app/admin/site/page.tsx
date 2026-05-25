"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import { NAV_ITEMS } from "@/lib/nav-items";
import {
  DEFAULT_SITE_CONFIG,
  type NavPageBadge,
  type SiteConfig,
  type SiteNavPageConfig,
} from "@/lib/site-config";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";

const BADGE_OPTIONS: NavPageBadge[] = ["none", "beta", "maintenance"];

export default function AdminSitePage() {
  const { lang, t } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site/config", {
        headers: await accountApiHeaders(false),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Load failed"));
      const data = (await res.json()) as { config: SiteConfig; updatedAt?: string };
      setConfig(data.config);
      setSavedAt(data.updatedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperUser) void load();
  }, [isSuperUser, load]);

  const updateNavPage = (href: string, patch: Partial<SiteNavPageConfig>) => {
    setConfig((prev) => ({
      ...prev,
      nav: {
        ...prev.nav,
        [href]: { ...prev.nav[href], ...patch },
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site/config", {
        method: "PUT",
        headers: await accountApiHeaders(),
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Save failed"));
      const data = (await res.json()) as { config: SiteConfig; updatedAt?: string };
      setConfig(data.config);
      setSavedAt(data.updatedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const badgeLabel = (badge: NavPageBadge) => {
    if (badge === "beta") return t.siteAdmin.badgeBeta;
    if (badge === "maintenance") return t.siteAdmin.badgeMaintenance;
    return t.siteAdmin.badgeNone;
  };

  if (superLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  if (!isSuperUser) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-rose-400">{t.siteAdmin.forbidden}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-gradient p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" asChild size="sm">
            <Link href="/admin/ops">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Ops
            </Link>
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="bg-amber-700 hover:bg-amber-600 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.siteAdmin.save}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-amber-400" />
            {t.siteAdmin.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t.siteAdmin.subtitle}</p>
          {savedAt && (
            <p className="text-xs text-slate-500 mt-1">
              {t.siteAdmin.lastSaved}: {new Date(savedAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
            </p>
          )}
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}

        <Card className="theme-bg-secondary border-slate-700">
          <CardHeader>
            <CardTitle>{t.siteAdmin.navSection}</CardTitle>
            <CardDescription>{t.siteAdmin.navSectionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {NAV_ITEMS.map((item) => {
              const page = config.nav[item.href] ?? { hidden: false, badge: "none" as const };
              return (
                <div
                  key={item.href}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-800 rounded-lg p-3 bg-slate-950/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200">{item.label[lang === "fr" ? "fr" : "en"]}</p>
                    <p className="text-xs text-slate-500 font-mono">{item.href}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <Switch
                        checked={Boolean(page.hidden)}
                        onCheckedChange={(v) => updateNavPage(item.href, { hidden: v })}
                      />
                      {t.siteAdmin.hidden}
                    </label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500">{t.siteAdmin.badge}</Label>
                      <select
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
                        value={page.badge ?? "none"}
                        onChange={(e) =>
                          updateNavPage(item.href, { badge: e.target.value as NavPageBadge })
                        }
                      >
                        {BADGE_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {badgeLabel(b)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="theme-bg-secondary border-amber-500/30">
          <CardHeader>
            <CardTitle>{t.siteAdmin.maintenanceSection}</CardTitle>
            <CardDescription>{t.siteAdmin.maintenanceSectionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 p-3">
              <div>
                <p className="text-sm font-medium text-slate-200">{t.siteAdmin.overlayEnabled}</p>
                <p className="text-xs text-slate-500">{t.siteAdmin.overlayEnabledDesc}</p>
              </div>
              <Switch
                checked={config.maintenance.overlayEnabled}
                onCheckedChange={(v) =>
                  setConfig((prev) => ({
                    ...prev,
                    maintenance: { ...prev.maintenance, overlayEnabled: v },
                  }))
                }
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t.siteAdmin.messageFr}</Label>
                <Input
                  value={config.maintenance.message.fr}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maintenance: {
                        ...prev.maintenance,
                        message: { ...prev.maintenance.message, fr: e.target.value },
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t.siteAdmin.messageEn}</Label>
                <Input
                  value={config.maintenance.message.en}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maintenance: {
                        ...prev.maintenance,
                        message: { ...prev.maintenance.message, en: e.target.value },
                      },
                    }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 p-3">
              <div>
                <p className="text-sm font-medium text-slate-200">{t.siteAdmin.showCountdown}</p>
                <p className="text-xs text-slate-500">{t.siteAdmin.showCountdownDesc}</p>
              </div>
              <Switch
                checked={config.maintenance.showCountdown}
                onCheckedChange={(v) =>
                  setConfig((prev) => ({
                    ...prev,
                    maintenance: { ...prev.maintenance, showCountdown: v },
                  }))
                }
              />
            </label>

            <div className="space-y-1">
              <Label>{t.siteAdmin.countdownEndsAt}</Label>
              <Input
                type="datetime-local"
                value={
                  config.maintenance.countdownEndsAt
                    ? config.maintenance.countdownEndsAt.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    maintenance: {
                      ...prev.maintenance,
                      countdownEndsAt: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
