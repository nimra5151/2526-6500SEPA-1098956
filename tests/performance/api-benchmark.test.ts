import { describe, it, expect, beforeAll } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════════
// Performance & Load Testing Suite
// Benchmarks API response times and validates acceptable performance thresholds
// Run with: npm run test (requires server running on localhost:5000)
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = process.env.TEST_API_URL || "http://localhost:5000";
const ACCEPTABLE_RESPONSE_TIME = 2000; // 2 seconds max
const FAST_RESPONSE_TIME = 500;        // 500ms for simple endpoints

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function measureResponseTime(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  return Math.round(performance.now() - start);
}

describe("Performance Benchmarks", () => {
  let studentToken: string;
  let tutorToken: string;
  let coordinatorToken: string;

  beforeAll(async () => {
    const [s, t, c] = await Promise.all([
      api("POST", "/api/auth/login", { email: "kofi@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "james@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "sarah@tutorbridge.org", password: "password123" }),
    ]);
    studentToken = s.data?.token;
    tutorToken = t.data?.token;
    coordinatorToken = c.data?.token;
  });

  // ── Health Check ──────────────────────────────────────────────────────────
  describe("Health Check Performance", () => {
    it("GET /api/health responds within 500ms", async () => {
      const time = await measureResponseTime(() => api("GET", "/api/health"));
      console.log(`  ⏱  /api/health: ${time}ms`);
      expect(time).toBeLessThan(FAST_RESPONSE_TIME);
    });
  });

  // ── Authentication Endpoints ──────────────────────────────────────────────
  describe("Authentication Performance", () => {
    it("POST /api/auth/login responds within 2s", async () => {
      const time = await measureResponseTime(() =>
        api("POST", "/api/auth/login", { email: "kofi@example.com", password: "password123" })
      );
      console.log(`  ⏱  /api/auth/login: ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("GET /api/auth/me responds within 500ms", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/auth/me", undefined, studentToken)
      );
      console.log(`  ⏱  /api/auth/me: ${time}ms`);
      expect(time).toBeLessThan(FAST_RESPONSE_TIME);
    });
  });

  // ── Class Browsing (Public) ───────────────────────────────────────────────
  describe("Class Browsing Performance", () => {
    it("GET /api/classes (all) responds within 2s", async () => {
      const time = await measureResponseTime(() => api("GET", "/api/classes"));
      console.log(`  ⏱  /api/classes: ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("GET /api/classes with search filter responds within 2s", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/classes?search=programming&limit=12")
      );
      console.log(`  ⏱  /api/classes?search: ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("GET /api/classes with category filter responds within 2s", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/classes?category=Programming%20%26%20Tech&limit=12")
      );
      console.log(`  ⏱  /api/classes?category: ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("GET /api/classes/1 (single class) responds within 1s", async () => {
      const time = await measureResponseTime(() => api("GET", "/api/classes/1"));
      console.log(`  ⏱  /api/classes/1: ${time}ms`);
      expect(time).toBeLessThan(1000);
    });
  });

  // ── Dashboard Performance ─────────────────────────────────────────────────
  describe("Dashboard Performance", () => {
    it("Student dashboard stats within 2s", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/dashboard/stats", undefined, studentToken)
      );
      console.log(`  ⏱  /api/dashboard/stats (student): ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("Tutor dashboard stats within 2s", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/dashboard/stats", undefined, tutorToken)
      );
      console.log(`  ⏱  /api/dashboard/stats (tutor): ${time}ms`);
      expect(time).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    });

    it("Coordinator dashboard stats within 3s", async () => {
      const time = await measureResponseTime(() =>
        api("GET", "/api/dashboard/stats", undefined, coordinatorToken)
      );
      console.log(`  ⏱  /api/dashboard/stats (coordinator): ${time}ms`);
      expect(time).toBeLessThan(3000); // coordinator aggregates across all tables
    });
  });

  // ── Concurrent Request Handling ───────────────────────────────────────────
  describe("Concurrent Load Handling", () => {
    it("handles 10 concurrent class listing requests", async () => {
      const start = performance.now();
      const requests = Array.from({ length: 10 }, () => api("GET", "/api/classes?limit=12"));
      const results = await Promise.all(requests);
      const totalTime = Math.round(performance.now() - start);
      console.log(`  ⏱  10 concurrent /api/classes: ${totalTime}ms total`);
      // All should succeed
      results.forEach((r) => expect(r.status).toBe(200));
      // Total time should be reasonable (not 10x sequential)
      expect(totalTime).toBeLessThan(5000);
    });

    it("handles 5 concurrent authenticated requests", async () => {
      const start = performance.now();
      const requests = [
        api("GET", "/api/auth/me", undefined, studentToken),
        api("GET", "/api/bookings", undefined, studentToken),
        api("GET", "/api/notifications", undefined, studentToken),
        api("GET", "/api/favorites", undefined, studentToken),
        api("GET", "/api/settings", undefined, studentToken),
      ];
      const results = await Promise.all(requests);
      const totalTime = Math.round(performance.now() - start);
      console.log(`  ⏱  5 concurrent auth requests: ${totalTime}ms total`);
      results.forEach((r) => expect(r.status).toBe(200));
      expect(totalTime).toBeLessThan(3000);
    });

    it("handles 20 rapid health check requests", async () => {
      const start = performance.now();
      const requests = Array.from({ length: 20 }, () => api("GET", "/api/health"));
      const results = await Promise.all(requests);
      const totalTime = Math.round(performance.now() - start);
      console.log(`  ⏱  20 concurrent /api/health: ${totalTime}ms total`);
      results.forEach((r) => expect(r.status).toBe(200));
      expect(totalTime).toBeLessThan(3000);
    });
  });

  // ── Public Endpoints ──────────────────────────────────────────────────────
  describe("Public Endpoint Performance", () => {
    it("GET /api/public/stats responds within 1s", async () => {
      const time = await measureResponseTime(() => api("GET", "/api/public/stats"));
      console.log(`  ⏱  /api/public/stats: ${time}ms`);
      expect(time).toBeLessThan(1000);
    });
  });

  // ── Response Size Check ───────────────────────────────────────────────────
  describe("Response Payload Size", () => {
    it("class listing returns paginated results (not unlimited)", async () => {
      const { data } = await api("GET", "/api/classes?limit=12");
      const classes = Array.isArray(data) ? data : data?.classes || [];
      expect(classes.length).toBeLessThanOrEqual(200); // server caps at 200
    });
  });
});
