"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getBotEnginePreference,
  setBotEnginePreference,
  subscribeBotEnginePreference,
  type BotEngineId,
} from "@/lib/bot-engine-preference";
import { scheduleBotEnginePreferenceSync } from "@/lib/bot-engine-account-sync";

export function useBotEnginePreference(): [
  BotEngineId,
  (value: BotEngineId) => void,
] {
  const preference = useSyncExternalStore(
    subscribeBotEnginePreference,
    getBotEnginePreference,
    () => "auto" as BotEngineId
  );

  const setPreference = useCallback((value: BotEngineId) => {
    setBotEnginePreference(value);
    scheduleBotEnginePreferenceSync(value);
  }, []);

  return [preference, setPreference];
}
