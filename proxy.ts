import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that must use POST (besides CORS preflight). */
const POST_ONLY = new Set([
  "/api/stripe/checkout",
  "/api/stripe/webhook",
  "/api/contact",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!POST_ONLY.has(pathname)) {
    return NextResponse.next();
  }
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/stripe/checkout", "/api/stripe/webhook", "/api/contact"],
};
