const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;
const MAX_ENTRIES = 5000;

export function rateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();

  // Evict expired entries if approaching cap
  if (rateLimitMap.size >= MAX_ENTRIES) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    // If still too large after eviction, remove oldest 20%
    if (rateLimitMap.size >= MAX_ENTRIES) {
      const keysToDelete = Array.from(rateLimitMap.keys()).slice(
        0,
        Math.floor(MAX_ENTRIES * 0.2)
      );
      for (const key of keysToDelete) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: MAX_REQUESTS - entry.count };
}
