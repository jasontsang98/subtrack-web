import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createMailer, sender } from "@/lib/mailer";

export async function POST() {
  const result = await db.query(
    `SELECT recipient_email AS "recipientEmail" FROM email_settings WHERE id = 1`,
  );
  const recipient = result.rows[0]?.recipientEmail;
  if (!recipient) {
    return NextResponse.json({ error: "Save a recipient email first" }, { status: 400 });
  }

  await createMailer().sendMail({
    from: sender,
    to: recipient,
    subject: "Subtrack test email",
    text: "Email reminders are connected. Your Monday subscription digest is ready.",
    html: `<div style="font-family:Arial,sans-serif;color:#173249;max-width:560px">
      <h1 style="font-family:Georgia,serif">Subtrack is connected.</h1>
      <p>Email reminders are working. Your Monday subscription digest is ready.</p>
    </div>`,
  });
  return NextResponse.json({ ok: true });
}
