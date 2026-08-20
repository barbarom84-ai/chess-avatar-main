import { NextRequest, NextResponse } from "next/server";
import { getArenaChampionsSetupHints } from "@/lib/arena-featured-persist";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const user =
    url && anonKey
      ? await getAuthedUserFromRequest(request, url, anonKey)
      : null;

  const hints = getArenaChampionsSetupHints(user?.id ?? null);

  return NextResponse.json({
    ...hints,
    envExample: user?.id
      ? `FEATURED_PROFILE_SEED_USER_ID=${user.id}`
      : null,
  });
}
