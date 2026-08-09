import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const result = await db.query(
    `SELECT recipient_email AS "recipientEmail", timezone, send_hour AS "sendHour", enabled
     FROM email_settings WHERE id = 1`,
  );
  return NextResponse.json(result.rows[0]);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.recipientEmail ?? "").trim();
  const timezone = String(body.timezone ?? "Australia/Sydney");
  const sendHour = Number(body.sendHour ?? 8);

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    return NextResponse.json({ error: "Invalid send hour" }, { status: 400 });
  }

  const result = await db.query(
    `UPDATE email_settings
     SET recipient_email = $1, timezone = $2, send_hour = $3, enabled = $4, updated_at = now()
     WHERE id = 1
     RETURNING recipient_email AS "recipientEmail", timezone, send_hour AS "sendHour", enabled`,
    [email || null, timezone, sendHour, Boolean(body.enabled) && Boolean(email)],
  );
  return NextResponse.json(result.rows[0]);
}
