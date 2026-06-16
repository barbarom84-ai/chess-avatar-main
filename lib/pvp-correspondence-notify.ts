import type { SupabaseClient } from "@supabase/supabase-js";
import type { PvpGameRow } from "@/lib/pvp-chess";

const FROM_ADDRESS = "Chess Avatar <noreply@contact.chessavatar.net>";

/** Envoie un e-mail « à vous de jouer » après un coup en correspondance (best-effort). */
export async function notifyCorrespondenceYourTurn(
  sb: SupabaseClient,
  game: PvpGameRow,
  moverUserId: string,
  gameId: string,
  origin?: string | null
): Promise<void> {
  if (game.clock_mode !== "correspondence" || game.status !== "playing") return;
  if (!game.black_user_id) return;

  const opponentId =
    game.white_user_id === moverUserId ? game.black_user_id : game.white_user_id;
  if (!opponentId || opponentId === moverUserId) return;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return;

  const { data: opponentAuth, error: authErr } = await sb.auth.admin.getUserById(opponentId);
  if (authErr || !opponentAuth?.user?.email) return;

  const moverName =
    game.white_user_id === moverUserId
      ? game.white_display_name?.trim() || "Your opponent"
      : game.black_display_name?.trim() || "Your opponent";

  const base = origin?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  const gameUrl = base ? `${base.replace(/\/$/, "")}/online?game=${gameId}` : `/online?game=${gameId}`;

  const subject = "Chess Avatar — your turn in a correspondence game";
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; color: #e2e8f0; background: #0f172a; padding: 24px; border-radius: 8px;">
      <h2 style="color: #22d3ee; margin-top: 0;">Your move</h2>
      <p><strong>${escapeHtml(moverName)}</strong> played in your correspondence game.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(gameUrl)}" style="display: inline-block; background: #0891b2; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Open game
        </a>
      </p>
      <p style="font-size: 12px; color: #64748b;">Chess Avatar — online PvP</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [opponentAuth.user.email],
      subject,
      html,
    }),
  }).catch(() => {
    /* notification must not block gameplay */
  });
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
