import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const baseUrl = process.env.BASE_URL ?? "";
const password = process.env.AUTH_PASSWORD ?? "";
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      "X-Real-IP": "integration-suite",
    },
    body: JSON.stringify({ password }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "login should return a session cookie");
  return cookie;
}

async function api(path: string, cookie: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Origin: baseUrl,
      Cookie: cookie,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

test("migrations, recurrence, authentication and subscription APIs work with PostgreSQL", async () => {
  assert.ok(baseUrl, "BASE_URL is required");
  try {
    const migrationResult = await db.query<{ version: string }>("SELECT version FROM schema_migrations ORDER BY version");
    assert.deepEqual(migrationResult.rows.map(row => row.version), ["001_initial_schema", "002_backup_management", "003_more_billing_cycles"]);
    await db.query("TRUNCATE payment_history, subscriptions CASCADE");

    assert.equal((await fetch(`${baseUrl}/api/subscriptions`)).status, 401);
    const cookie = await login();
    const todayResult = await db.query<{ today: string; past: string; future: string; month: string }>(
      `SELECT CURRENT_DATE::text AS today, (CURRENT_DATE - 1)::text AS past,
       (CURRENT_DATE + 2)::text AS future, to_char(CURRENT_DATE, 'YYYY-MM') AS month`,
    );
    const dates = todayResult.rows[0];

    const pastResponse = await api("/api/subscriptions", cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Past payment", price: 4.99, cycle: "monthly", next: dates.past, category: "Software" }),
    });
    assert.equal(pastResponse.status, 400);

    const createResponse = await api("/api/subscriptions", cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Integration Monthly", price: 12.34, cycle: "monthly", next: dates.future, category: "Software" }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as { id: string; price: number };
    assert.equal(created.price, 12.34);

    await db.query(`INSERT INTO subscriptions (name, price, cycle, next_billing, category, color)
      VALUES ('Integration Weekly', 3.21, 'weekly', CURRENT_DATE - 15, 'Other', '#208962')`);

    const listResponse = await api("/api/subscriptions", cookie);
    assert.equal(listResponse.status, 200);
    const subscriptions = await listResponse.json() as Array<{ name: string; next: string }>;
    assert.ok(subscriptions.some(subscription => subscription.name === "Integration Monthly"));
    const weekly = subscriptions.find(subscription => subscription.name === "Integration Weekly");
    assert.ok(weekly);
    assert.ok(weekly.next >= dates.today);

    const historyResult = await db.query<{ count: number }>(`SELECT count(*)::int AS count
      FROM payment_history WHERE subscription_name = 'Integration Weekly'`);
    assert.equal(historyResult.rows[0].count, 3);

    const calendarResponse = await api(`/api/calendar?month=${dates.month}`, cookie);
    assert.equal(calendarResponse.status, 200);
    const calendar = await calendarResponse.json() as { events: Array<{ subscriptionId: string | null; date: string; status: string }> };
    assert.ok(calendar.events.some(event => event.subscriptionId === created.id && event.date === dates.future && event.status === "projected"));

    assert.equal((await api(`/api/subscriptions?id=${created.id}`, cookie, { method: "DELETE" })).status, 204);
  } finally {
    await db.end();
  }
});
