import { NextResponse } from "next/server";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
export async function POST(request: Request) {
  let password = ""; try { ({ password } = await request.json()); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  try {
    if (typeof password !== "string" || !(await verifyPassword(password))) { await new Promise(resolve => setTimeout(resolve, 400)); return Response.json({ error: "Incorrect password" }, { status: 401 }); }
    const response = NextResponse.json({ ok: true }); response.cookies.set(sessionCookie.name, await createSession(), { httpOnly: true, sameSite: "strict", secure: process.env.COOKIE_SECURE === "true", path: "/", maxAge: sessionCookie.maxAge }); return response;
  } catch { return Response.json({ error: "Authentication is not configured" }, { status: 503 }); }
}
