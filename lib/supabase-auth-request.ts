import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Resolve Supabase Auth user from Bearer token or Next.js cookies. */
export async function getAuthedUserFromRequest(
  request: NextRequest,
  supabaseUrl: string,
  anonKey: string
): Promise<User | null> {
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("x-supabase-auth")?.trim() ||
    "";
  if (bearer) {
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Pass JWT explicitly — getUser() without args ignores global Authorization
    // when there is no persisted session (breaks mobile / Bearer-only clients).
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(bearer);
    if (!error && user) return user;
  }

  // Prefer request.cookies so mobile clients sending Cookie: work in Route Handlers.
  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        const fromRequest = request.cookies.getAll();
        if (fromRequest.length > 0) return fromRequest;
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignore when called from a Server Component */
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (!error && user) return user;
  return null;
}
