import assert from "node:assert/strict";
import test from "node:test";
import { authConfig, createSession, verifyPassword, verifySession } from "../lib/auth.ts";
const originalPassword = process.env.AUTH_PASSWORD;
const originalSecret = process.env.AUTH_SECRET;
test.after(() => {
  if (originalPassword === undefined) delete process.env.AUTH_PASSWORD; else process.env.AUTH_PASSWORD = originalPassword;
  if (originalSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = originalSecret;
});
test("authentication configuration rejects weak credentials", () => {
  process.env.AUTH_PASSWORD = "short"; process.env.AUTH_SECRET = "0123456789abcdef0123456789abcdef";
  assert.throws(() => authConfig(), /at least 12 characters/);
});
test("authentication configuration rejects example placeholders", () => {
  process.env.AUTH_PASSWORD = "replace-with-a-long-unique-password"; process.env.AUTH_SECRET = "replace-with-at-least-32-random-characters";
  assert.throws(() => authConfig(), /unique password/);
});
test("password comparison and signed sessions", async () => {
  process.env.AUTH_PASSWORD = "correct-horse-battery"; process.env.AUTH_SECRET = "0123456789abcdef0123456789abcdef";
  assert.equal(await verifyPassword("wrong"), false); assert.equal(await verifyPassword("correct-horse-battery"), true);
  const now = 1_800_000_000_000; const session = await createSession(now);
  assert.equal(await verifySession(session, now + 1_000), true);
  assert.equal(await verifySession(session + "tampered", now + 1_000), false);
  assert.equal(await verifySession(session, now + 31 * 24 * 60 * 60_000), false);
});
