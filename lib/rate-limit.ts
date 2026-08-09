type RateLimitEntry = {
  attempts: number;
  resetAt: number;
  blockedUntil: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

export class FailureRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly maximumAttempts: number;
  private readonly windowMilliseconds: number;
  private readonly lockMilliseconds: number;

  constructor(maximumAttempts: number, windowMilliseconds: number, lockMilliseconds: number) {
    this.maximumAttempts = maximumAttempts;
    this.windowMilliseconds = windowMilliseconds;
    this.lockMilliseconds = lockMilliseconds;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const entry = this.entries.get(key);
    if (!entry) return { allowed: true, retryAfter: 0 };
    if (entry.blockedUntil > now) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)) };
    }
    if (entry.resetAt <= now) {
      this.entries.delete(key);
      return { allowed: true, retryAfter: 0 };
    }
    return { allowed: true, retryAfter: 0 };
  }

  recordFailure(key: string, now = Date.now()): RateLimitResult {
    const previous = this.entries.get(key);
    const entry = !previous || previous.resetAt <= now
      ? { attempts: 0, resetAt: now + this.windowMilliseconds, blockedUntil: 0 }
      : previous;
    entry.attempts += 1;
    if (entry.attempts >= this.maximumAttempts) entry.blockedUntil = now + this.lockMilliseconds;
    this.entries.set(key, entry);
    return this.check(key, now);
  }

  reset(key: string) {
    this.entries.delete(key);
  }
}

const globalForRateLimits = globalThis as unknown as {
  subtrackClientLoginLimiter?: FailureRateLimiter;
  subtrackGlobalLoginLimiter?: FailureRateLimiter;
};

export const clientLoginLimiter = globalForRateLimits.subtrackClientLoginLimiter
  ?? new FailureRateLimiter(8, 15 * 60_000, 15 * 60_000);
export const globalLoginLimiter = globalForRateLimits.subtrackGlobalLoginLimiter
  ?? new FailureRateLimiter(100, 15 * 60_000, 15 * 60_000);

globalForRateLimits.subtrackClientLoginLimiter = clientLoginLimiter;
globalForRateLimits.subtrackGlobalLoginLimiter = globalLoginLimiter;
