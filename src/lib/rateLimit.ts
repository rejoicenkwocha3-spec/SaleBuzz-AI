// Simple in memory limiter. On serverless platforms each instance keeps its own counters,
// so treat this as a safety net and back it with a shared store (for example Upstash) at scale.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { hits.set(key, list); return false; }
  list.push(now); hits.set(key, list);
  return true;
}
