"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";

function formatCountdown(ms: number, lang: "fr" | "en"): string {
  if (ms <= 0) return lang === "fr" ? "Bientôt disponible" : "Available soon";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return lang === "fr" ? `${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;
  }
  return lang === "fr" ? `${m}m ${s}s` : `${m}m ${s}s`;
}

export default function SiteMaintenanceOverlay() {
  const { config } = useSiteConfig();
  const { lang } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const uiLang = lang === "fr" ? "fr" : "en";
  const [now, setNow] = useState(() => Date.now());

  const maintenance = config.maintenance;

  useEffect(() => {
    if (!maintenance.overlayEnabled || !maintenance.showCountdown) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [maintenance.overlayEnabled, maintenance.showCountdown]);

  if (!maintenance.overlayEnabled || superLoading || isSuperUser) {
    return null;
  }

  const endsAt = maintenance.countdownEndsAt ? new Date(maintenance.countdownEndsAt).getTime() : null;
  const countdown =
    maintenance.showCountdown && endsAt != null && !Number.isNaN(endsAt)
      ? formatCountdown(endsAt - now, uiLang)
      : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full rounded-xl border border-amber-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center shadow-2xl space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/50">
          <Wrench className="h-8 w-8 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-amber-100 flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {uiLang === "fr" ? "Maintenance en cours" : "Under maintenance"}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {maintenance.message[uiLang]}
          </p>
        </div>
        {countdown && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 font-mono text-lg text-cyan-200 tabular-nums">
            <Clock className="h-5 w-5 text-cyan-400" />
            {countdown}
          </div>
        )}
        <Button variant="outline" onClick={() => window.location.reload()} className="border-slate-600">
          {uiLang === "fr" ? "Actualiser" : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
