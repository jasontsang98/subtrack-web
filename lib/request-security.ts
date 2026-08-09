export function contentSecurityPolicy(nonce: string, development = false) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
  ].join("; ");
}

export function mutationOriginAllowed(method: string, headers: Headers) {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return true;

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = headers.get("origin");
  if (origin === "null") return false;
  if (!origin) return fetchSite === null || fetchSite === "same-origin" || fetchSite === "none";

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || headers.get("host");
  if (!host || parsedOrigin.host !== host) return false;

  const forwardedProtocol = headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return !forwardedProtocol || parsedOrigin.protocol === `${forwardedProtocol}:`;
}

export function applySecurityHeaders(response: Response, secure: boolean, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  if (secure) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}
