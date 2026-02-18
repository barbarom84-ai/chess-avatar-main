import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

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
        subject: `[Chess Avatar] Message from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <h2 style="color: #00FFFF;">New contact message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr style="border-color: #334155;" />
            <p style="white-space: pre-wrap;">${message}</p>
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
