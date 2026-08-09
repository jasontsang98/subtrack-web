import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BillingCycle, monthBounds, projectBillingDates } from "@/lib/calendar-projection";

type RecordedRow = {
  id: string;
  subscriptionId: string | null;
  name: string;
  category: string;
  amount: number;
  date: string;
  color: string;
};

type SubscriptionRow = {
  id: string;
  name: string;
  category: string;
  amount: number;
  cycle: BillingCycle;
  nextBilling: string;
  color: string;
};

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? "";
  let bounds: ReturnType<typeof monthBounds>;

  try {
    bounds = monthBounds(month);
  } catch {
    return NextResponse.json({ error: "Month must use YYYY-MM" }, { status: 400 });
  }

  await db.query("SELECT roll_forward_subscriptions()");

  const [todayResult, recordedResult, subscriptionResult] = await Promise.all([
    db.query<{ today: string }>(
      `SELECT (now() AT TIME ZONE timezone)::date::text AS today
       FROM email_settings WHERE id = 1`,
    ),
    db.query<RecordedRow>(
      `SELECT payment.id::text,
         payment.subscription_id::text AS "subscriptionId",
         payment.subscription_name AS name,
         payment.category,
         payment.amount::float8 AS amount,
         payment.paid_on::text AS date,
         COALESCE(subscription.color, '#173249') AS color
       FROM payment_history payment
       LEFT JOIN subscriptions subscription ON subscription.id = payment.subscription_id
       WHERE payment.paid_on BETWEEN $1::date AND $2::date
       ORDER BY payment.paid_on, payment.subscription_name`,
      [bounds.start, bounds.end],
    ),
    db.query<SubscriptionRow>(
      `SELECT id::text, name, category, price::float8 AS amount, cycle,
         next_billing::text AS "nextBilling", color
       FROM subscriptions
       WHERE active
       ORDER BY next_billing, name`,
    ),
  ]);

  const today = todayResult.rows[0]?.today;
  if (!today) return NextResponse.json({ error: "Timezone settings unavailable" }, { status: 500 });

  const recorded = recordedResult.rows.map(row => ({ ...row, status: "recorded" as const }));
  const recordedKeys = new Set(
    recorded
      .filter(event => event.subscriptionId)
      .map(event => `${event.subscriptionId}|${event.date}`),
  );
  const projectionStart = bounds.start > today ? bounds.start : today;
  const projected = bounds.end < today ? [] : subscriptionResult.rows.flatMap(subscription =>
    projectBillingDates(subscription.nextBilling, subscription.cycle, projectionStart, bounds.end)
      .filter(date => !recordedKeys.has(`${subscription.id}|${date}`))
      .map(date => ({
        id: `projected-${subscription.id}-${date}`,
        subscriptionId: subscription.id,
        name: subscription.name,
        category: subscription.category,
        amount: subscription.amount,
        date,
        color: subscription.color,
        status: "projected" as const,
      })),
  );

  const events = [...recorded, ...projected].sort(
    (left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name),
  );

  return NextResponse.json({ month, today, events });
}
