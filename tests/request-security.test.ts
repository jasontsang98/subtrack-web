import assert from "node:assert/strict";
import test from "node:test";
import { applySecurityHeaders, contentSecurityPolicy, mutationOriginAllowed } from "../lib/request-security.ts";
test("origin validation rejects cross-site mutations", () => {
  assert.equal(mutationOriginAllowed("GET", new Headers()), true);
  assert.equal(mutationOriginAllowed("POST", new Headers({ host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" })), true);
  assert.equal(mutationOriginAllowed("POST", new Headers({ host: "localhost:3000", origin: "https://evil.example", "sec-fetch-site": "cross-site" })), false);
  assert.equal(mutationOriginAllowed("POST", new Headers({ host: "localhost:3000", origin: "null" })), false);
});
test("nonce CSP and security headers are strict", () => {
  const csp = contentSecurityPolicy("test-nonce");
  assert.match(csp, /script-src 'self' 'nonce-test-nonce' 'strict-dynamic'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  const plain = applySecurityHeaders(new Response(), false, csp);
  assert.equal(plain.headers.get("x-frame-options"), "DENY");
  assert.equal(plain.headers.has("strict-transport-security"), false);
  const secure = applySecurityHeaders(new Response(), true, csp);
  assert.match(secure.headers.get("strict-transport-security") || "", /max-age=31536000/);
});
