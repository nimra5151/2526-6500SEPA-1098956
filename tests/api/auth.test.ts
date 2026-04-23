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
});
