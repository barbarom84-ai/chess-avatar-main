"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SITE_CONFIG, parseSiteConfig, type SiteConfig } from "@/lib/site-config";

type SiteConfigContextValue = {
  config: SiteConfig;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: DEFAULT_SITE_CONFIG,
  loading: true,
  refresh: async () => {},
});

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/site/config", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { config?: unknown };
      setConfig(parseSiteConfig(data.config));
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo(() => ({ config, loading, refresh }), [config, loading, refresh]);

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
