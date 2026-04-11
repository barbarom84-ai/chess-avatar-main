import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safeMessage = escapeHtml(String(message));

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json({ error: "MAIL_NOT_CONFIGURED" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Chess Avatar <noreply@contact.chessavatar.net>",
        to: ["chessavatarpro@gmail.com"],
        reply_to: email,
        subject: `[Chess Avatar] Message from ${String(name).slice(0, 200)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <h2 style="color: #00FFFF;">New contact message</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <hr style="border-color: #334155;" />
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("Resend error:", data);
      return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
