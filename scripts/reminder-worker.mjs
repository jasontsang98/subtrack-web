import cron from "node-cron";
import nodemailer from "nodemailer";
import pg from "pg";

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const money = (value) => Number(value).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mailpit",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

function localParts(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

async function runDigest(force = false) {
  await db.query("SELECT roll_forward_subscriptions()");
  const settingsResult = await db.query(
    `SELECT recipient_email, timezone, send_hour, enabled FROM email_settings WHERE id = 1`,
  );
  const settings = settingsResult.rows[0];
  if (!settings?.enabled || !settings.recipient_email) return;

  const local = localParts(settings.timezone);
  if (!force && (local.weekday !== "Mon" || Number(local.hour) !== settings.send_hour)) return;
  const localDate = `${local.year}-${local.month}-${local.day}`;
  const digestKey = `weekly:${localDate}:${settings.recipient_email}`;

  const claim = await db.query(
    `INSERT INTO email_deliveries (digest_key, recipient_email, status)
     VALUES ($1, $2, 'sending')
     ON CONFLICT (digest_key) DO UPDATE SET status = 'sending', error_message = NULL
       WHERE email_deliveries.status = 'failed'
     RETURNING id`,
    [digestKey, settings.recipient_email],
  );
  if (!claim.rowCount) return;

  const due = await db.query(
    `SELECT name, price::float8 AS price, cycle, next_billing::text AS next
     FROM subscriptions
     WHERE active AND next_billing >= $1::date AND next_billing < $1::date + 7
     ORDER BY next_billing, name`,
    [localDate],
  );

  if (!due.rowCount) {
    await db.query("UPDATE email_deliveries SET status = 'skipped' WHERE id = $1", [claim.rows[0].id]);
    return;
  }

  const total = due.rows.reduce((sum, item) => sum + Number(item.price), 0);
  const rows = due.rows.map((item) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #e4e1d9"><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.next)}</small></td>
    <td style="padding:12px 0;border-bottom:1px solid #e4e1d9;text-align:right">${money(item.price)}</td>
  </tr>`).join("");

  try {
    await mailer().sendMail({
      from: process.env.EMAIL_FROM ?? "Subtrack <subtrack@localhost>",
      to: settings.recipient_email,
      subject: `${due.rowCount} subscription${due.rowCount === 1 ? "" : "s"} due this week · ${money(total)}`,
      text: due.rows.map((item) => `${item.name}: ${money(item.price)} on ${item.next}`).join("\n"),
      html: `<div style="font-family:Arial,sans-serif;color:#173249;max-width:600px;margin:auto">
        <p style="color:#208962;font-size:11px;letter-spacing:2px;font-weight:bold">YOUR MONDAY DIGEST</p>
        <h1 style="font:42px Georgia,serif;margin:12px 0">Coming up this week.</h1>
        <p style="color:#74818a">You have ${due.rowCount} upcoming payment${due.rowCount === 1 ? "" : "s"} totalling <strong>${money(total)}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin-top:28px">${rows}</table>
        <p style="color:#89939a;font-size:11px;margin-top:32px">Sent by your self-hosted Subtrack instance.</p>
      </div>`,
    });
    await db.query(
      "UPDATE email_deliveries SET status = 'sent', subscription_count = $2, sent_at = now() WHERE id = $1",
      [claim.rows[0].id, due.rowCount],
    );
  } catch (error) {
    await db.query(
      "UPDATE email_deliveries SET status = 'failed', error_message = $2 WHERE id = $1",
      [claim.rows[0].id, String(error).slice(0, 1000)],
    );
    throw error;
  }
}

cron.schedule("0 * * * *", () => runDigest().catch(console.error), { noOverlap: true });
runDigest().catch(console.error);
console.log("Subtrack reminder worker started");
