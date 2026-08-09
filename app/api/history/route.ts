import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await db.query("SELECT roll_forward_subscriptions()");
  const result = await db.query(
    `SELECT id::text, subscription_id::text AS "subscriptionId",
       subscription_name AS name, category, amount::float8 AS amount,
       paid_on::text AS "paidOn", source
     FROM payment_history
     ORDER BY paid_on DESC, created_at DESC`,
  );
  return NextResponse.json(result.rows);
}
