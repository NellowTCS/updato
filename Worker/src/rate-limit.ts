/// <reference types="@cloudflare/workers-types" />

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface Entry {
  windowStart: number;
  count: number;
}

const DEFAULTS: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: "ratelimit",
};

export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  async check(
    ip: string,
    kv: KVNamespace,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    const key = `${this.config.keyPrefix}:${ip}`;
    const now = Date.now();
    const ttl = Math.ceil((this.config.windowMs + 60_000) / 1000);

    let entry: Entry;
    try {
      const raw = await kv.get(key);
      if (raw) {
        entry = JSON.parse(raw);
        if (now - entry.windowStart > this.config.windowMs) {
          entry = { windowStart: now, count: 0 };
        }
      } else {
        entry = { windowStart: now, count: 0 };
      }
    } catch {
      entry = { windowStart: now, count: 0 };
    }

    entry.count++;

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const retryAfter = Math.max(
      0,
      Math.ceil((entry.windowStart + this.config.windowMs - now) / 1000),
    );

    await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });

    return {
      allowed: entry.count <= this.config.maxRequests,
      remaining,
      retryAfter,
    };
  }
}
