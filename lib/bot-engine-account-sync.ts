"use client";

import { fetchOwnAccountProfile, patchAccountProfile } from "@/lib/account-profile";
import {
  applyBotEnginePreferenceFromServer,
  getBotEnginePreference,
  type BotEngineId,
} from "@/lib/bot-engine-preference";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const VALID: BotEngineId[] = ["auto", "chessavatar", "stockfish"];

function isBotEngineId(v: unknown): v is BotEngineId {
  return typeof v === "string" && VALID.includes(v as BotEngineId);
}

/** Pull server preference after sign-in (server wins when set). */
export async function hydrateBotEnginePreferenceFromAccount(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const profile = await fetchOwnAccountProfile();
  const remote = profile?.preferences?.botEngine;
  if (isBotEngineId(remote)) {
    applyBotEnginePreferenceFromServer(remote);
  }
}

let pendingSync: BotEngineId | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced PATCH when the user changes bot engine preference. */
export function scheduleBotEnginePreferenceSync(value: BotEngineId): void {
  if (!isSupabaseConfigured || !supabase) return;

  pendingSync = value;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void flushBotEnginePreferenceSync();
  }, 600);
}

async function flushBotEnginePreferenceSync(): Promise<void> {
  const value = pendingSync;
  pendingSync = null;
  syncTimer = null;
  if (!value || !supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const local = getBotEnginePreference();
  if (local !== value) return;

  await patchAccountProfile({
    preferences: { botEngine: value },
  });
}
