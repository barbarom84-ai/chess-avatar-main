"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { capturePageView, initPostHog } from "@/lib/analytics";
import { trackActivity } from "@/lib/activity-client";
import { useAnalyticsIdentify } from "@/hooks/useAnalyticsIdentify";
import { usePresence } from "@/hooks/usePresence";
import PaymentSuccessTracker from "@/components/PaymentSuccessTracker";

function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
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
  }, []);

  return userId;
}

function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    initPostHog();
    if (!pathname) return;
    capturePageView(pathname);
    trackActivity("page_view", { path: pathname });
  }, [pathname]);

  return null;
}

export default function MonitoringProviders() {
  useAnalyticsIdentify();
  const userId = useAuthUserId();
  usePresence(userId);

  return (
    <>
      <PageViewTracker />
      <Suspense fallback={null}>
        <PaymentSuccessTracker />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
