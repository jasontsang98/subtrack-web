import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PortableData = {
  format: "subtrack-portable";
  version: 1;
  data: {
    subscriptions: Array<Record<string, unknown>>;
    paymentHistory: Array<Record<string, unknown>>;
    emailSettings: Record<string, unknown> | null;
    emailDeliveries: Array<Record<string, unknown>>;
  };
};

export async function GET() {
  const [subscriptions, paymentHistory, emailSettings, emailDeliveries] = await Promise.all([
    db.query(`SELECT id::text, name, price::float8 AS price, cycle,
      next_billing::text AS "nextBilling", category, color, active,
      created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscriptions ORDER BY created_at`),
    db.query(`SELECT id::text, subscription_id::text AS "subscriptionId",
      subscription_name AS "subscriptionName", category, amount::float8 AS amount,
      paid_on::text AS "paidOn", source, created_at AS "createdAt"
      FROM payment_history ORDER BY paid_on, created_at`),
    db.query(`SELECT recipient_email AS "recipientEmail", timezone,
      send_hour AS "sendHour", enabled, updated_at AS "updatedAt"
      FROM email_settings WHERE id = 1`),
    db.query(`SELECT id::text, digest_key AS "digestKey",
      recipient_email AS "recipientEmail", status,
      subscription_count AS "subscriptionCount", error_message AS "errorMessage",
      sent_at AS "sentAt", created_at AS "createdAt"
      FROM email_deliveries ORDER BY created_at`),
  ]);

  const payload = {
    format: "subtrack-portable",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      subscriptions: subscriptions.rows,
      paymentHistory: paymentHistory.rows,
      emailSettings: emailSettings.rows[0] ?? null,
      emailDeliveries: emailDeliveries.rows,
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="subtrack-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let payload: PortableData;
  try {
    payload = await request.json() as PortableData;
  } catch {
    return NextResponse.json({ error: "The selected file is not valid JSON." }, { status: 400 });
  }

  if (
    payload?.format !== "subtrack-portable" ||
    payload.version !== 1 ||
    !Array.isArray(payload.data?.subscriptions) ||
    !Array.isArray(payload.data?.paymentHistory) ||
    !Array.isArray(payload.data?.emailDeliveries) ||
    payload.data.subscriptions.length > 10000 ||
    payload.data.paymentHistory.length > 100000 ||
    payload.data.emailDeliveries.length > 100000
  ) {
    return NextResponse.json({ error: "This is not a supported Subtrack export." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM payment_history");
    await client.query("DELETE FROM subscriptions");
    await client.query("DELETE FROM email_deliveries");

    for (const item of payload.data.subscriptions) {
      await client.query(
        `INSERT INTO subscriptions
          (id, name, price, cycle, next_billing, category, color, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,now()),COALESCE($10::timestamptz,now()))`,
        [item.id, item.name, item.price, item.cycle, item.nextBilling, item.category,
          item.color, item.active !== false, item.createdAt ?? null, item.updatedAt ?? null],
      );
    }

    for (const item of payload.data.paymentHistory) {
      await client.query(
        `INSERT INTO payment_history
          (id, subscription_id, subscription_name, category, amount, paid_on, source, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,now()))`,
        [item.id, item.subscriptionId ?? null, item.subscriptionName, item.category,
          item.amount, item.paidOn, item.source ?? "scheduled", item.createdAt ?? null],
      );
    }

    const settings = payload.data.emailSettings;
    if (settings) {
      await client.query(
        `UPDATE email_settings SET recipient_email=$1, timezone=$2,
          send_hour=$3, enabled=$4, updated_at=COALESCE($5::timestamptz,now())
         WHERE id=1`,
        [settings.recipientEmail ?? null, settings.timezone, settings.sendHour,
          settings.enabled === true, settings.updatedAt ?? null],
      );
    }

    for (const item of payload.data.emailDeliveries) {
      await client.query(
        `INSERT INTO email_deliveries
          (id, digest_key, recipient_email, status, subscription_count,
           error_message, sent_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,now()))`,
        [item.id, item.digestKey, item.recipientEmail, item.status,
          item.subscriptionCount ?? 0, item.errorMessage ?? null,
          item.sentAt ?? null, item.createdAt ?? null],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      imported: {
        subscriptions: payload.data.subscriptions.length,
        payments: payload.data.paymentHistory.length,
        deliveries: payload.data.emailDeliveries.length,
      },
    });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Import failed validation. No existing data was changed." },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
