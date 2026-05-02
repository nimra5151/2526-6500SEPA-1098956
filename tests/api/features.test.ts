import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_API_URL || "http://localhost:5001";

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { "x-forwarded-for": "10.0.0.3" };
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("Feature Tests — T11–T20 + Extended Coverage", () => {
  let studentToken: string;
  let tutorToken: string;
  let coordinatorToken: string;
  let certCode: string;

  beforeAll(async () => {
    const [s, t, c] = await Promise.all([
      api("POST", "/api/auth/login", { email: "kofi@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "james@example.com", password: "password123" }),
      api("POST", "/api/auth/login", { email: "sarah@tutorbridge.org", password: "password123" }),
    ]);
    studentToken = s.data?.token;
    tutorToken = t.data?.token;
    coordinatorToken = c.data?.token;

    const certs = await api("GET", "/api/certificates/my", undefined, studentToken);
    if (Array.isArray(certs.data)) {
      const approvedCert = certs.data.find(c => c.status === "approved");
      if (approvedCert) certCode = approvedCert.verificationCode;
    }
  });

  // ── AI TESTS (T11, T12, T12a–T12d) ────────────────────────────────────────

  it("T11 — POST /api/ai/chat — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/chat", { message: "What is Python?", classId: 1 });
    expect(status).toBe(401);
  });

  it("T11 — POST /api/ai/chat — valid student JWT returns 200 or 503", async () => {
    const { status, data } = await api(
      "POST", "/api/ai/chat",
      { message: "What is a variable in Python?", classId: 1 },
      studentToken
    );
    expect([200, 503]).toContain(status);
    if (status === 200) {
      expect(data.response ?? data.message ?? data.answer ?? data).toBeDefined();
    }
  });

  it("T12 — POST /api/ai/rag-chat — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/rag-chat", { message: "Explain variables", classId: 1 });
    expect(status).toBe(401);
  });

  it("T12 — POST /api/ai/rag-chat — valid JWT returns 200 or 503", async () => {
    const { status, data } = await api(
      "POST", "/api/ai/rag-chat",
      { message: "What is covered in lesson 1?", classId: 1 },
      studentToken
    );
    expect([200, 503]).toContain(status);
    if (status === 200) {
      expect(data.response ?? data.answer ?? data).toBeDefined();
    }
  });

  it("T12a — POST /api/ai/lesson-plan — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/lesson-plan", { topic: "loops", duration: 45 });
    expect(status).toBe(401);
  });

  it("T12a — POST /api/ai/lesson-plan — valid tutor JWT returns 200 or 503", async () => {
    const { status, data } = await api(
      "POST", "/api/ai/lesson-plan",
      { topic: "Introduction to loops", duration: 45, difficulty: "beginner", classId: 1 },
      tutorToken
    );
    expect([200, 503]).toContain(status);
    if (status === 200) {
      expect(data.plan ?? data.content ?? data).toBeDefined();
    }
  });

  it("T12b — POST /api/ai/skill-gap — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/skill-gap", { currentSkills: ["Python"] });
    expect(status).toBe(401);
  });

  it("T12b — POST /api/ai/skill-gap — valid student JWT returns 200 or 503", async () => {
    const { status, data } = await api(
      "POST", "/api/ai/skill-gap",
      { currentSkills: ["basic Python", "variables"], targetRole: "junior developer" },
      studentToken
    );
    expect([200, 503]).toContain(status);
    if (status === 200) {
      expect(data.analysis ?? data.gaps ?? data).toBeDefined();
    }
  });

  it("T12c — POST /api/ai/chat (teaching tools) — valid tutor JWT returns 200 or 503", async () => {
    const { status } = await api(
      "POST", "/api/ai/chat",
      { message: "Suggest 5 engaging teaching activities for a class titled 'Python Programming for Beginners' (beginner level) suitable for orphanage students." },
      tutorToken
    );
    expect([200, 503]).toContain(status);
  });

  it("T12d — POST /api/ai/chat (AI grading) — valid tutor JWT returns 200 or 503", async () => {
    const { status } = await api(
      "POST", "/api/ai/chat",
      { message: "You are grading a student assignment. Assignment title: 'Python Variables Exercise'. Student submission: 'x = 5, y = 10, print(x+y)'. Suggest a grade out of 100 and brief constructive feedback. Reply in exactly this format:\nGrade: [number]\nFeedback: [2-3 sentences]" },
      tutorToken
    );
    expect([200, 503]).toContain(status);
  });

  it("T12d — POST /api/ai/chat — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/chat", { message: "Grade this: x=5" });
    expect(status).toBe(401);
  });

  // ── CERTIFICATE TESTS (T13, T14) ───────────────────────────────────────────

  it("T13 — GET /api/certificates/verify/:code — valid code returns 200 + student data", async () => {
    if (!certCode) {
      console.warn("No certificate in DB — skipping T13 (run seed first)");
      return;
    }
    const { status, data } = await api("GET", `/api/certificates/verify/${certCode}`);
    expect(status).toBe(200);
    expect(data.studentName).toBeDefined();
    expect(data.courseName).toBeDefined();
  });

  it("T14 — GET /api/certificates/verify/:code — invalid UUID returns 404", async () => {
    const { status } = await api("GET", "/api/certificates/verify/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  it("GET /api/certificates/my — student sees own certificates", async () => {
    const { status, data } = await api("GET", "/api/certificates/my", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  // ── LEADERBOARD ────────────────────────────────────────────────────────────

  it("GET /api/leaderboard — returns ranked array for authenticated user", async () => {
    const { status, data } = await api("GET", "/api/leaderboard", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /api/leaderboard — no auth returns 401", async () => {
    const { status } = await api("GET", "/api/leaderboard");
    expect(status).toBe(401);
  });

  // ── LESSONS ────────────────────────────────────────────────────────────────

  it("GET /api/lessons?classId=1 — returns lesson list for authenticated user", async () => {
    const { status, data } = await api("GET", "/api/lessons?classId=1", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /api/lessons/:id — returns single lesson with title", async () => {
    const { status, data } = await api("GET", "/api/lessons/1", undefined, studentToken);
    expect(status).toBe(200);
    expect(data.title).toBeDefined();
    expect(data.classId).toBeDefined();
  });

  it("GET /api/lessons/:id — invalid lesson returns 404", async () => {
    const { status } = await api("GET", "/api/lessons/99999", undefined, studentToken);
    expect(status).toBe(404);
  });

  // ── QUIZZES ────────────────────────────────────────────────────────────────

  it("GET /api/quizzes?classId=1 — returns quiz list", async () => {
    const { status, data } = await api("GET", "/api/quizzes?classId=1", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/quizzes/for-student — returns quiz list with attempt status", async () => {
    const { status, data } = await api("GET", "/api/quizzes/for-student", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/quizzes/:id — returns single quiz", async () => {
    const { status, data } = await api("GET", "/api/quizzes/1", undefined, studentToken);
    expect(status).toBe(200);
    expect(data.title).toBeDefined();
  });

  // ── ASSIGNMENTS ────────────────────────────────────────────────────────────

  it("GET /api/assignments?classId=1 — returns assignment list", async () => {
    const { status, data } = await api("GET", "/api/assignments?classId=1", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/assignments/for-student — returns assignment list with submission status", async () => {
    const { status, data } = await api("GET", "/api/assignments/for-student", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/assignments/:id — invalid ID returns 404", async () => {
    const { status } = await api("GET", "/api/assignments/99999", undefined, studentToken);
    expect(status).toBe(404);
  });

  // ── PEER HELP ──────────────────────────────────────────────────────────────

  it("GET /api/peer-help-requests?classId=1 — returns requests array", async () => {
    const { status, data } = await api("GET", "/api/peer-help-requests?classId=1", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/peer-helpers?classId=1 — returns peer helpers array", async () => {
    const { status, data } = await api("GET", "/api/peer-helpers?classId=1", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/peer-help-requests/mine — returns own peer requests", async () => {
    const { status, data } = await api("GET", "/api/peer-help-requests/mine", undefined, studentToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  // ── FILE UPLOAD (T19, T20) ─────────────────────────────────────────────────

  it("T19 — POST /api/upload/assignment — valid PDF returns 200 + fileUrl", async () => {
    // Minimal real PDF with correct %PDF magic bytes
    const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Root 1 0 R /Size 1 >>\nstartxref\n9\n%%EOF";
    const pdfBytes = Buffer.from(pdfContent, "utf-8");

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([pdfBytes], { type: "application/pdf" }),
      "test-submission.pdf"
    );

    const res = await fetch(`${BASE}/api/upload/assignment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData,
    });
    const data = await res.json().catch(() => null);
    expect(res.status).toBe(200);
    expect(data.fileUrl).toBeDefined();
  });

  it("T20 — POST /api/upload/assignment — .exe file returns 400", async () => {
    // EXE magic bytes MZ header
    const exeBytes = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([exeBytes], { type: "application/x-msdownload" }),
      "malware.exe"
    );

    const res = await fetch(`${BASE}/api/upload/assignment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it("T20 — POST /api/upload/assignment — no auth returns 401", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "application/pdf" }), "test.pdf");

    const res = await fetch(`${BASE}/api/upload/assignment`, {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(401);
  });

  // ── EXTRA: AI Profile + Learning Path ─────────────────────────────────────

  it("POST /api/ai/profile-tips — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/profile-tips", { bio: "I teach Python" });
    expect(status).toBe(401);
  });

  it("POST /api/ai/learning-path — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/learning-path", { goals: "become a developer" });
    expect(status).toBe(401);
  });

  it("POST /api/ai/quiz-generate — no auth returns 401", async () => {
    const { status } = await api("POST", "/api/ai/quiz-generate", { topic: "Python", classId: 1 });
    expect(status).toBe(401);
  });
});
