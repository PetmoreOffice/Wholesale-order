// Limits are per account across routes in the supported single-process deployment.
export function createRateLimiter({ limit, windowMs = 60_000, maxKeys = 10_000, now = Date.now }) {
  const buckets = new Map();
  let lastSweep = 0;
  return (req, res, next) => {
    const time = now();
    if (time - lastSweep >= windowMs) {
      for (const [key, bucket] of buckets) if (bucket.until <= time) buckets.delete(key);
      lastSweep = time;
    }
    const key = req.user?.uid || req.ip;
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= time) {
      if (!bucket && buckets.size >= maxKeys) return reject(res, windowMs);
      bucket = { count: 0, until: time + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) return reject(res, bucket.until - time);
    return next();
  };
}
function reject(res, wait) {
  res.set('Retry-After', String(Math.max(1, Math.ceil(wait / 1000))));
  return res.status(429).json({ error: 'RATE_LIMITED', message: 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่' });
}
const reads = createRateLimiter({ limit: 240 });
const writes = createRateLimiter({ limit: 30 });
const adminWrites = createRateLimiter({ limit: 10 });
export function accountRateLimit(req, res, next) {
  if (/^\/api\/admin\/data\/(export|backups\/)/.test(req.originalUrl || '')) return adminWrites(req, res, next);
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return reads(req, res, next);
  if (req.originalUrl?.startsWith('/api/admin/')) return adminWrites(req, res, next);
  return writes(req, res, next);
}
