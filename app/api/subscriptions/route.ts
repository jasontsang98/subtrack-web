import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Payload = {
  id?: string; name?: string; price?: number;
  cycle?: "weekly" | "fortnightly" | "monthly" | "yearly";
  next?: string; category?: string; color?: string; active?: boolean;
};
const validCycles = new Set(["weekly", "fortnightly", "monthly", "yearly"]);
const colors = ["#208962", "#4d91d9", "#8b6fe8", "#e54747", "#ed824f", "#c09024", "#397e8f", "#a85f8e"];
const colorFor = (name: string) => colors[[...name.toLowerCase()].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % colors.length];
const selectColumns = `
  id::text, name, price::float8 AS price, cycle,
  next_billing::text AS next, category, color, active
`;

export async function GET() {
  await db.query("SELECT roll_forward_subscriptions()");
  const result = await db.query(
    `SELECT ${selectColumns} FROM subscriptions ORDER BY active DESC, next_billing, name`,
  );
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Payload;
  if (!body.name?.trim() || !Number.isFinite(body.price) || !body.next || !body.cycle || !validCycles.has(body.cycle)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const active = body.active !== false;
  if (active) {
    const dateCheck = await db.query(
      `SELECT $1::date >= (now() AT TIME ZONE timezone)::date AS valid
       FROM email_settings WHERE id = 1`, [body.next],
    );
    if (!dateCheck.rows[0]?.valid) {
      return NextResponse.json({ error: "Next payment date cannot be earlier than today" }, { status: 400 });
    }
  }
  const id = body.id ?? crypto.randomUUID();
  const result = await db.query(
    `INSERT INTO subscriptions (id, name, price, cycle, next_billing, category, color, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, price = EXCLUDED.price, cycle = EXCLUDED.cycle,
       next_billing = EXCLUDED.next_billing, category = EXCLUDED.category,
       color = EXCLUDED.color, active = EXCLUDED.active, updated_at = now()
     RETURNING ${selectColumns}`,
    [id, body.name.trim(), body.price, body.cycle, body.next, body.category, body.color ?? colorFor(body.name), active],
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const result = await db.query("DELETE FROM subscriptions WHERE id = $1", [id]);
  return new NextResponse(null, { status: result.rowCount ? 204 : 404 });
}
