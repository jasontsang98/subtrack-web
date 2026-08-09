import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";
import { applySecurityHeaders, contentSecurityPolicy, mutationOriginAllowed } from "@/lib/request-security";

const publicPaths = new Set(["/login", "/api/auth/login", "/api/health"]);

function secureResponse(response: Response, request: NextRequest, csp: string) {
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return applySecurityHeaders(response, protocol === "https" || request.nextUrl.protocol === "https:", csp);
}

function continueRequest(request: NextRequest, nonce: string, csp: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), request, csp);
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  if (!mutationOriginAllowed(request.method, request.headers)) {
    return secureResponse(Response.json({ error: "Cross-origin request blocked" }, { status: 403 }), request, csp);
  }

  if (publicPaths.has(request.nextUrl.pathname)) return continueRequest(request, nonce, csp);

  let authenticated = false;
  try {
    authenticated = await verifySession(request.cookies.get(sessionCookie.name)?.value);
  } catch {
    return secureResponse(new NextResponse("Subtrack authentication is not configured", { status: 503 }), request, csp);
  }

  if (authenticated) return continueRequest(request, nonce, csp);
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return secureResponse(Response.json({ error: "Authentication required" }, { status: 401 }), request, csp);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return secureResponse(NextResponse.redirect(loginUrl), request, csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|subtrack-icon.png|favicon.ico|favicon-32x32.png|apple-touch-icon.png|icon-192.png|icon-512.png|manifest.webmanifest).*)"],
};
