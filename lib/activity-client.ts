"use client";

import type { AnalyticsEventName } from "@/lib/analytics";

const FLUSH_MS = 30_000;
const MAX_BATCH = 10;

type QueuedEvent = {
  event_name: string;
  path: string | null;
  session_id: string;
  props: Record<string, string | number | boolean>;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  if (typeof window === "undefined") return "server";
  const key = "chessavatar_activity_sid";
  const existing = sessionStorage.getItem(key);
  if (existing) {
    sessionId = existing;
    return existing;
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `s_${Date.now()}`;
  sessionStorage.setItem(key, id);
  sessionId = id;
  return id;
}

async function flushQueue(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const { supabase } = await import("@/lib/supabase");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
    await fetch("/api/activity", {
      method: "POST",
      headers,
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    queue.unshift(...batch);
  }
  if (queue.length > 0) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_MS);
}

export function trackActivity(
  eventName: AnalyticsEventName | string,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === "undefined") return;
  const safe: Record<string, string | number | boolean> = {};
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null) safe[k] = v;
    }
  }
  queue.push({
    event_name: eventName,
    path: window.location.pathname,
    session_id: getSessionId(),
    props: safe,
  });
  if (queue.length >= MAX_BATCH) {
    void flushQueue();
    return;
  }
  scheduleFlush();
}

export function flushActivityNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushQueue();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushActivityNow();
  });
}
