import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_API_URL || "http://localhost:5000";

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

describe("Core API Endpoints", () => {
  let studentToken: string;
  let tutorToken: string;
  let coordinatorToken: string;

  beforeAll(async () => {
    const [s, t, c] = await Promise.all([
      api("POST", "/api/auth/login", { email: "kofi@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "james@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "sarah@tutorbridge.org", password: "password123" }),
    ]);
    studentToken = s.data.token;
    tutorToken = t.data.token;
    coordinatorToken = c.data.token;
  });

  // --- Classes ---
  it("GET /api/classes — returns array of classes", async () => {
    const { status, data } = await api("GET", "/api/classes");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /api/classes/1 — returns single class with tutor info", async () => {
    const { status, data } = await api("GET", "/api/classes/1");
    expect(status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.title).toBeDefined();
    expect(data.tutorName).toBeDefined();
  });

  it("GET /api/classes/99999 — returns 404 for non-existent class", async () => {
    const { status } = await api("GET", "/api/classes/99999");
    expect(status).toBe(404);
  });

  it("GET /api/classes/my/enrolled — student enrolled classes", async () => {
    const { status, data } = await api("GET", "/api/classes/my/enrolled", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/classes/my/teaching — tutor teaching classes", async () => {
    const { status, data } = await api("GET", "/api/classes/my/teaching", undefined, tutorToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  // --- Dashboard ---
  it("GET /api/dashboard/stats — student stats", async () => {
    const { status, data } = await api("GET", "/api/dashboard/stats", undefined, studentToken);
    expect(status).toBe(200);
    expect(data.classCount).toBeDefined();
    expect(typeof data.totalHours).toBe("number");
  });

  it("GET /api/dashboard/stats — tutor stats", async () => {
    const { status, data } = await api("GET", "/api/dashboard/stats", undefined, tutorToken);
    expect(status).toBe(200);
    expect(data.classCount).toBeDefined();
    expect(data.totalStudents).toBeDefined();
  });

  it("GET /api/dashboard/stats — coordinator stats (previously crashed)", async () => {
    const { status, data } = await api("GET", "/api/dashboard/stats", undefined, coordinatorToken);
    expect(status).toBe(200);
    expect(data.totalUsers).toBeDefined();
    expect(data.avgRating).toBeDefined();
    expect(typeof data.totalHours).toBe("number");
  });

  // --- Bookings ---
  it("GET /api/bookings — student bookings", async () => {
    const { status, data } = await api("GET", "/api/bookings", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  // --- Notifications ---
  it("GET /api/notifications — student notifications", async () => {
    const { status, data } = await api("GET", "/api/notifications", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/notifications/unread-count — returns count object", async () => {
    const { status, data } = await api("GET", "/api/notifications/unread-count", undefined, studentToken);
    expect(status).toBe(200);
    expect(typeof data.count).toBe("number");
  });

  // --- Reviews ---
  it("GET /api/reviews/user/2 — tutor reviews", async () => {
    const { status, data } = await api("GET", "/api/reviews/user/2");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  // --- Settings ---
  it("GET /api/settings — returns defaults for new users", async () => {
    const { status, data } = await api("GET", "/api/settings", undefined, studentToken);
    expect(status).toBe(200);
    expect(data.emailNotifications).toBeDefined();
    expect(data.theme).toBeDefined();
  });

  // --- Favorites ---
  it("GET /api/favorites — returns array", async () => {
    const { status, data } = await api("GET", "/api/favorites", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  // --- Contact ---
  it("POST /api/contact — submits contact form", async () => {
    const { status, data } = await api("POST", "/api/contact", {
      name: "Test",
      email: "test@test.com",
      subject: "Test Subject",
      message: "Test message body",
    });
    expect([200, 201]).toContain(status);
    expect(data.id).toBeDefined();
  });

  // --- Admin ---
  it("GET /api/admin/users — coordinator can list users", async () => {
    const { status, data } = await api("GET", "/api/admin/users", undefined, coordinatorToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    // Ensure passwords are stripped
    expect(data[0].password).toBeUndefined();
  });

  it("GET /api/admin/users — student cannot access admin route", async () => {
    const { status } = await api("GET", "/api/admin/users", undefined, studentToken);
    expect(status).toBe(403);
  });

  it("GET /api/admin/reports — coordinator can list reports", async () => {
    const { status, data } = await api("GET", "/api/admin/reports", undefined, coordinatorToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  // --- Public Stats ---
  it("GET /api/public/stats — returns platform counts", async () => {
    const { status, data } = await api("GET", "/api/public/stats");
    expect(status).toBe(200);
    expect(typeof data.students).toBe("number");
    expect(typeof data.tutors).toBe("number");
    expect(typeof data.classes).toBe("number");
  });

  // --- 404 for non-existent routes ---
  it("GET /api/nonexistent — returns 404", async () => {
    const { status } = await api("GET", "/api/nonexistent");
    expect(status).toBe(404);
  });
});
