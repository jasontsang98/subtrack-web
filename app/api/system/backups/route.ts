import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await db.query(
    `SELECT id::text, trigger, status, filename,
       size_bytes::float8 AS "sizeBytes", error_message AS error,
       requested_at AS "requestedAt", completed_at AS "completedAt"
     FROM backup_runs
     ORDER BY requested_at DESC
     LIMIT 50`,
  );

  return NextResponse.json({
    schedule: {
      hour: Number(process.env.BACKUP_HOUR ?? 2),
      timezone: process.env.BACKUP_TIMEZONE ?? "Australia/Sydney",
      dailyRetentionDays: 7,
      manualRetentionDays: 30,
    },
    backups: result.rows,
  });
}

export async function POST() {
  const result = await db.query(
    `INSERT INTO backup_runs (backup_key, trigger)
     VALUES ('manual:' || gen_random_uuid()::text, 'manual')
     RETURNING id::text, status, requested_at AS "requestedAt"`,
  );

  return NextResponse.json(result.rows[0], { status: 202 });
}
