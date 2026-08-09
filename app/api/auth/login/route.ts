import { NextRequest, NextResponse } from "next/server";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
import { clientLoginLimiter, globalLoginLimiter } from "@/lib/rate-limit";

function clientKey(request: NextRequest) {
  return request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
}

function limited(retryAfter: number) {
  return Response.json(
    { error: "Too many sign-in attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const clientCheck = clientLoginLimiter.check(key);
  const globalCheck = globalLoginLimiter.check("all");
  if (!clientCheck.allowed || !globalCheck.allowed) {
    return limited(Math.max(clientCheck.retryAfter, globalCheck.retryAfter));
  }

  let password = "";
  try {
    ({ password } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (typeof password !== "string" || !(await verifyPassword(password))) {
      const clientResult = clientLoginLimiter.recordFailure(key);
      const globalResult = globalLoginLimiter.recordFailure("all");
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!clientResult.allowed || !globalResult.allowed) {
        return limited(Math.max(clientResult.retryAfter, globalResult.retryAfter));
      }
      return Response.json({ error: "Incorrect password" }, { status: 401 });
    }

    clientLoginLimiter.reset(key);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie.name, await createSession(), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch {
    return Response.json({ error: "Authentication is not configured" }, { status: 503 });
  }
}
