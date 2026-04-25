"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy entry point. The import UX now lives inline on /games (the unified
 * Game Review hub). Keep this route as a client-side redirect so existing
 * bookmarks and external links don't 404.
 */
export default function ReviewImportRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/games");
  }, [router]);
  return null;
}
