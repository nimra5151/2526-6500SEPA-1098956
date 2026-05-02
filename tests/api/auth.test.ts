import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_API_URL || "http://localhost:5001";

async function api(method: string, path: string, body?: any, token?: string, ip: string = "10.0.0.1") {
  const headers: Record<string, string> = { "x-forwarded-for": ip };
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

describe("Auth API", () => {
  let studentToken: string;
  let tutorToken: string;
  let coordinatorToken: string;

  it("POST /api/auth/login — student login succeeds", async () => {
    const { status, data } = await api("POST", "/api/auth/login", {
      email: "kofi@example.com",
      password: "password123",
    });
    expect(status).toBe(200);
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe("student");
    studentToken = data.token;
  });

  it("POST /api/auth/login — tutor login succeeds", async () => {
    const { status, data } = await api("POST", "/api/auth/login", {
      email: "james@example.com",
      password: "password123",
    });
    expect(status).toBe(200);
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe("tutor");
    tutorToken = data.token;
  });

  it("POST /api/auth/login — coordinator login succeeds", async () => {
    const { status, data } = await api("POST", "/api/auth/login", {
      email: "sarah@tutorbridge.org",
      password: "password123",
    });
    expect(status).toBe(200);
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe("coordinator");
    coordinatorToken = data.token;
  });

  it("POST /api/auth/login — wrong password returns 401", async () => {
    const { status, data } = await api("POST", "/api/auth/login", {
      email: "kofi@example.com",
      password: "wrongpassword",
    });
    expect(status).toBe(401);
    expect(data.message).toContain("Invalid");
  });

  it("POST /api/auth/login — invalid email format returns 400 (or 429 if rate-limited)", async () => {
    const { status } = await api("POST", "/api/auth/login", {
      email: "notanemail",
      password: "password123",
    });
    expect([400, 429]).toContain(status);
  });

  it("GET /api/auth/me — returns user with valid token", async () => {
    const { status, data } = await api("GET", "/api/auth/me", undefined, studentToken);
    expect(status).toBe(200);
    expect(data.email).toBe("kofi@example.com");
    expect(data.password).toBeUndefined();
  });

  it("GET /api/auth/me — returns 401 without token", async () => {
    const { status } = await api("GET", "/api/auth/me");
    expect(status).toBe(401);
  });

  it("GET /api/auth/me — returns 401 with invalid token", async () => {
    const { status } = await api("GET", "/api/auth/me", undefined, "invalid.token.here");
    expect(status).toBe(401);
  });

  it("POST /api/auth/forgot-password — returns success for known email", async () => {
    const { status, data } = await api("POST", "/api/auth/forgot-password", {
      email: "kofi@example.com",
    });
    expect(status).toBe(200);
    expect(data.message).toContain("reset link");
  });

  it("POST /api/auth/forgot-password — returns same message for unknown email (no leak)", async () => {
    const { status, data } = await api("POST", "/api/auth/forgot-password", {
      email: "doesnotexist@nowhere.com",
    });
    expect(status).toBe(200);
    expect(data.message).toContain("reset link");
  });

  // T01 — Register new student account
  it("T01 — POST /api/auth/signup — valid student data returns 201 + user object", async () => {
    const uniqueEmail = `testuser.${Date.now()}@example.com`;
    const { status, data } = await api("POST", "/api/auth/signup", {
      name: "Test Student",
      email: uniqueEmail,
      password: "SecurePass123",
      role: "student",
    });
    expect(status).toBe(201);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(uniqueEmail);
    expect(data.user.role).toBe("student");
    expect(data.user.password).toBeUndefined();
  });

  // T02 — Duplicate email registration
  it("T02 — POST /api/auth/signup — duplicate email returns 400", async () => {
    const { status, data } = await api("POST", "/api/auth/signup", {
      name: "Another User",
      email: "kofi@example.com",
      password: "SecurePass123",
      role: "student",
    });
    expect(status).toBe(400);
    expect(data.message).toMatch(/already exist/i);
  });

  // T17 — XSS in signup name → tags stripped at API level
  it("T17 — POST /api/auth/signup — <script> in name is stripped before persisting", async () => {
    const uniqueEmail = `xss.test.${Date.now()}@example.com`;
    const { status, data } = await api("POST", "/api/auth/signup", {
      name: "<script>alert('xss')</script>Test User",
      email: uniqueEmail,
      password: "SecurePass123",
      role: "student",
    });
    expect(status).toBe(201);
    expect(data.user.name).toBeDefined();
    expect(data.user.name).not.toContain("<script>");
    expect(data.user.name).not.toContain("</script>");
    expect(data.user.name).toContain("Test User");
  });

  // T18 — Rate limiting: 16+ login requests in 15 minutes → 429
  it("T18 — POST /api/auth/login — 16+ rapid requests triggers rate limit (429)", async () => {
    const payload = { email: "ratelimit@example.com", password: "wrongpassword" };
    let got429 = false;

    for (let i = 0; i < 20; i++) {
      const { status } = await api("POST", "/api/auth/login", payload, undefined, "10.0.0.18");
      if (status === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
  });
});
