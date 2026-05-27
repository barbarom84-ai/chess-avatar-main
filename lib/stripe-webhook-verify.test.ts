import { describe, expect, it } from "vitest";
import Stripe from "stripe";

describe("Stripe webhook signature", () => {
  it("rejects tampered payload", () => {
    const secret = "whsec_test_secret_for_unit_test_only";
    const stripe = new Stripe("sk_test_dummy", { apiVersion: "2025-02-24.acacia" });
    const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    expect(() =>
      stripe.webhooks.constructEvent(payload, header, secret)
    ).not.toThrow();

    expect(() =>
      stripe.webhooks.constructEvent(`${payload}x`, header, secret)
    ).toThrow();
  });
});
