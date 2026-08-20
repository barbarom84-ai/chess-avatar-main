"use client";

import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";
import { trackActivity } from "@/lib/activity-client";

/** PostHog + activity_events journal (batched). */
export function track(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  trackEvent(name, properties);
  trackActivity(name, properties);
}
