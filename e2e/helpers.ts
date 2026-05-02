import { type APIRequestContext } from "@playwright/test";

/** Shared base URL for API calls */
export const BASE = "http://localhost:5001";

/** Unique suffix to avoid collisions across test runs */
export const RUN_ID = Date.now().toString(36);

/**
 * Sign up a new user via the API.
 * Returns the created user object (no token — email verification required).
 */
export async function apiSignup(
  request: APIRequestContext,
  data: {
    name: string;
    email: string;
    password: string;
    role: "student" | "tutor" | "coordinator";
    orphanage?: string;
    organization?: string;
  }
) {
  const ip = `10.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const res = await request.post(`${BASE}/api/auth/signup`, { 
    data,
    headers: { "x-forwarded-for": ip }
  });
  return { status: res.status(), body: await res.json() };
}

/**
 * Log in and return the JWT token + user.
 * The account must already be verified & approved.
 */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const ip = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
    headers: { "x-forwarded-for": ip }
  });
  return { status: res.status(), body: await res.json() };
}

/**
 * Shorthand to get an auth header object for a logged-in user.
 */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
