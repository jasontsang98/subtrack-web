import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await db.query(
    `SELECT filename FROM backup_runs
     WHERE id = $1 AND status = 'completed' AND filename IS NOT NULL`,
    [id],
  );
  const filename = result.rows[0]?.filename as string | undefined;

  if (!filename || !/^subtrack-(scheduled|manual)-\d{8}T\d{6}Z\.dump$/.test(filename)) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const path = `/backups/${filename}`;
  try {
    const info = await stat(path);
    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Backup file is unavailable" }, { status: 404 });
  }
}
