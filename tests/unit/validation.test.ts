import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema } from "@shared/schema";

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "password123" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const validStudent = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
    role: "student",
  };

  it("accepts valid student signup", () => {
    const result = signupSchema.safeParse(validStudent);
    expect(result.success).toBe(true);
  });

  it("accepts valid tutor signup", () => {
    const result = signupSchema.safeParse({ ...validStudent, role: "tutor" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = signupSchema.safeParse({ ...validStudent, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = signupSchema.safeParse({ ...validStudent, role: "admin" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ ...validStudent, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signupSchema.safeParse({ ...validStudent, password: "abc" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields (orphanage, bio, skills)", () => {
    const result = signupSchema.safeParse({
      ...validStudent,
      orphanage: "Hope Home",
      bio: "I love learning",
      skillsLearning: ["Math", "Science"],
    });
    expect(result.success).toBe(true);
  });
});
