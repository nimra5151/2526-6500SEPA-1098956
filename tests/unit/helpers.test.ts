import { describe, it, expect } from "vitest";

// Replicate the JWT token expiry check from client/src/lib/auth.tsx
function getTokenExpiry(t: string): number {
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

// Replicate the rate limiter logic from server/routes.ts
function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true; // allowed
      }
      if (entry.count >= maxRequests) {
        return false; // blocked
      }
      entry.count++;
      return true; // allowed
    },
    store,
  };
}

describe("JWT Token Expiry Parser", () => {
  it("extracts expiry from a valid JWT", () => {
    // Create a fake JWT: header.payload.signature
    const payload = { userId: 1, exp: 1700000000, iat: 1699996400 };
    const encoded = btoa(JSON.stringify(payload));
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${encoded}.fakesignature`;
    expect(getTokenExpiry(fakeJwt)).toBe(1700000000);
  });

  it("returns 0 for invalid JWT", () => {
    expect(getTokenExpiry("not.a.jwt")).toBe(0);
    expect(getTokenExpiry("")).toBe(0);
    expect(getTokenExpiry("single")).toBe(0);
  });

  it("returns 0 when exp is not a number", () => {
    const payload = { userId: 1, exp: "never" };
    const encoded = btoa(JSON.stringify(payload));
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${encoded}.fakesignature`;
    expect(getTokenExpiry(fakeJwt)).toBe(0);
  });

  it("returns 0 when exp is missing", () => {
    const payload = { userId: 1, iat: 1699996400 };
    const encoded = btoa(JSON.stringify(payload));
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${encoded}.fakesignature`;
    expect(getTokenExpiry(fakeJwt)).toBe(0);
  });
});

describe("Rate Limiter Logic", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter(3, 60000);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter(2, 60000);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(false); // 3rd blocked
  });

  it("tracks separate keys independently", () => {
    const limiter = createRateLimiter(1, 60000);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip2")).toBe(true); // different key
    expect(limiter.check("ip1")).toBe(false); // same key blocked
  });

  it("resets after window expires", () => {
    const limiter = createRateLimiter(1, 100); // 100ms window
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(false);

    // Manually expire the entry
    const entry = limiter.store.get("ip1")!;
    entry.resetAt = Date.now() - 1;

    expect(limiter.check("ip1")).toBe(true); // allowed again
  });
});

describe("Number Conversion (toFixed bug prevention)", () => {
  it("Number() converts string from SQL AVG to number", () => {
    const sqlAvgResult = "4.6000000000000000"; // typical Postgres AVG string
    const result = Number(sqlAvgResult).toFixed(1);
    expect(result).toBe("4.6");
  });

  it("handles null/undefined AVG result", () => {
    const avgNull = null;
    const result = avgNull ? Number(avgNull).toFixed(1) : "0";
    expect(result).toBe("0");
  });

  it("handles zero AVG result", () => {
    const avgZero = "0";
    const result = avgZero ? Number(avgZero).toFixed(1) : "0";
    expect(result).toBe("0.0");
  });
});
