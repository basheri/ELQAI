// WHY: CLAUDE.md requires rate-limiting auth endpoints. For the MVP (single
// internal deanship, single server) a best-effort in-memory sliding window is
// enough; a multi-instance production deploy should swap this for a shared
// store (e.g. Redis). Keyed by identifier (email) so a single account can't be
// brute-forced from one process.
const buckets = new Map<string, number[]>();

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recent.length >= maxAttempts) {
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}
