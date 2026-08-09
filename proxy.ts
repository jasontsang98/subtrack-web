import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";
const publicPaths = new Set(["/login", "/api/auth/login", "/api/health"]);
export async function proxy(request: NextRequest) {
  if (publicPaths.has(request.nextUrl.pathname)) return NextResponse.next();
  let authenticated = false;
  try { authenticated = await verifySession(request.cookies.get(sessionCookie.name)?.value); } catch { return new NextResponse("Subtrack authentication is not configured", { status: 503 }); }
  if (authenticated) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Authentication required" }, { status: 401 });
  const loginUrl = new URL("/login", request.url); loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`); return NextResponse.redirect(loginUrl);
}
export const config = { matcher: ["/((?!_next/static|_next/image|subtrack-icon.png|favicon.ico|favicon-32x32.png|apple-touch-icon.png|icon-192.png|icon-512.png|manifest.webmanifest).*)"] };
