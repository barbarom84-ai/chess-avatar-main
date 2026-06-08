"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackActivity } from "@/lib/activity-client";
import { useAnalyticsIdentify } from "@/hooks/useAnalyticsIdentify";
import { usePresence } from "@/hooks/usePresence";
import PaymentSuccessTracker from "@/components/PaymentSuccessTracker";
import BotEnginePreferenceSync from "@/components/BotEnginePreferenceSync";

/** Routes that do not need presence or heavy auth side-effects. */
function isLightweightRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/legal") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund"
  );
}

function useAuthUserId(enabled: boolean): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) {
      setUserId(null);
      return;
    }
    const client = supabase;

    async function load() {
      const {
        data: { user },
      } = await client.auth.getUser();
      setUserId(user?.id ?? null);
    }

    void load();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [enabled]);

  return userId;
}

function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled || !pathname) return;
      void import("@/lib/analytics").then(({ initPostHog, capturePageView }) => {
        if (cancelled) return;
        initPostHog();
        capturePageView(pathname);
        trackActivity("page_view", { path: pathname });
      });
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(run, 1);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pathname]);

  return null;
}

export default function MonitoringProviders() {
  const pathname = usePathname();
  const lightweight = isLightweightRoute(pathname);

  useAnalyticsIdentify();
  const userId = useAuthUserId(!lightweight);
  usePresence(lightweight ? null : userId);

  return (
    <>
      <PageViewTracker />
      <Suspense fallback={null}>
        <PaymentSuccessTracker />
      </Suspense>
      <BotEnginePreferenceSync />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
