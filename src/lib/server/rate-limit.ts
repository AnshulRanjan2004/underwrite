type RateLimit = { limit: number; windowMs: number };
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") || forwarded || "anonymous";
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

export function checkRateLimit(request: Request, scope: string, policy: RateLimit) {
  const now = Date.now();
  prune(now);
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
  };
  if (!result.allowed) headers["retry-after"] = String(result.retryAfterSeconds);
  return headers;
}
