"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

/** Fires once when returning from Stripe checkout success. */
export default function PaymentSuccessTracker() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get("payment") !== "success") return;
    fired.current = true;
    track("premium_activated", { source: "stripe_redirect" });
  }, [searchParams]);

  return null;
}
