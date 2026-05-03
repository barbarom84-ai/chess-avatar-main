import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Resolve Supabase Auth user from Bearer token or Next.js cookies (same pattern as puzzle APIs). */
export async function getAuthedUserFromRequest(
  request: NextRequest,
  supabaseUrl: string,
  anonKey: string
): Promise<User | null> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (!error && user) return user;
  }

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignore */
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
