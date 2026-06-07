"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getBotEnginePreference,
  setBotEnginePreference,
  subscribeBotEnginePreference,
  type BotEngineId,
} from "@/lib/bot-engine-preference";

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
  }, []);

  return [preference, setPreference];
}
