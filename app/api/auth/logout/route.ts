import { sessionCookie } from "@/lib/auth";

export async function POST() {
  const response = new Response(null, { status: 303, headers: { Location: "/login" } });
  response.headers.append("Set-Cookie", `${sessionCookie.name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  return response;
}
