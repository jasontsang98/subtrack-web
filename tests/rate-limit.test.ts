import assert from "node:assert/strict";
import test from "node:test";
import { FailureRateLimiter } from "../lib/rate-limit.ts";

test("rate limiter locks after repeated failures and resets", () => {
  const limiter = new FailureRateLimiter(3, 1_000, 5_000);
  assert.equal(limiter.recordFailure("client", 0).allowed, true);
  assert.equal(limiter.recordFailure("client", 1).allowed, true);
  const blocked = limiter.recordFailure("client", 2);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 5);
  assert.equal(limiter.check("client", 4_000).allowed, false);
  assert.equal(limiter.check("client", 5_003).allowed, true);
  limiter.recordFailure("client", 6_000);
  limiter.reset("client");
  assert.equal(limiter.check("client", 6_001).allowed, true);
});
