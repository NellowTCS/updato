import { RateLimiter, getClientIp } from "../rate-limit";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

function mockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    put: jest.fn(
      async (key: string, value: string, opts?: { expirationTtl?: number }) => {
        store.set(key, value);
      },
    ),
    delete: jest.fn(),
    list: jest.fn(),
    getWithMetadata: jest.fn(),
  } as unknown as KVNamespace;
}

describe("RateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 });
    const kv = mockKv();
    const result = await limiter.check("1.2.3.4", kv);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over the limit", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });
    const kv = mockKv();
    await limiter.check("1.2.3.4", kv);
    await limiter.check("1.2.3.4", kv);
    const result = await limiter.check("1.2.3.4", kv);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10_000 });
    const kv = mockKv();
    await limiter.check("1.2.3.4", kv);
    await limiter.check("1.2.3.4", kv);
    let result = await limiter.check("1.2.3.4", kv);
    expect(result.allowed).toBe(false);

    jest.advanceTimersByTime(10_001);
    result = await limiter.check("1.2.3.4", kv);
    expect(result.allowed).toBe(true);
  });

  it("tracks different IPs separately", async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const kv = mockKv();
    const r1 = await limiter.check("1.2.3.4", kv);
    const r2 = await limiter.check("5.6.7.8", kv);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("reports correct retryAfter", async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 10_000 });
    const kv = mockKv();
    await limiter.check("1.2.3.4", kv);
    const result = await limiter.check("1.2.3.4", kv);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(10);
  });
});

describe("getClientIp", () => {
  it("reads CF-Connecting-IP header", () => {
    const req = new Request("https://example.com", {
      headers: { "CF-Connecting-IP": "1.2.3.4" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to X-Forwarded-For", () => {
    const req = new Request("https://example.com", {
      headers: { "X-Forwarded-For": "5.6.7.8, 9.10.11.12" },
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns unknown when no headers", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });
});
