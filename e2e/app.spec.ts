import { test, expect, type APIRequestContext } from "@playwright/test";
import { BASE, RUN_ID, apiSignup, apiLogin, authHeader } from "./helpers";

// ---------------------------------------------------------------------------
// Seed accounts (created by server/seed.ts — password: password123)
// ---------------------------------------------------------------------------
const SEED_STUDENT = { email: "kofi@example.com", password: "password123" };
const SEED_TUTOR = { email: "james@example.com", password: "password123" };
const SEED_COORDINATOR = { email: "sarah@tutorbridge.org", password: "password123" };

// ---------------------------------------------------------------------------
// Token cache — avoids repeated login calls that hit rate limiter
// ---------------------------------------------------------------------------
const tokenCache: Record<string, string> = {};
async function getToken(request: APIRequestContext, email: string, password: string) {
  if (tokenCache[email]) return tokenCache[email];
  const { status, body } = await apiLogin(request, email, password);
  expect(status).toBe(200);
  tokenCache[email] = body.token;
  return body.token;
}

// ---------------------------------------------------------------------------
// Scenario 1: Student signup → verify email → login → lands on dashboard
// ---------------------------------------------------------------------------
test.describe("Scenario 1 — Student signup → verify → login → dashboard", () => {
  const student = {
    name: `TestStudent ${RUN_ID}`,
    email: `student-${RUN_ID}@test.local`,
    password: "TestPass123!",
  };

  test("Full signup → verify → login → dashboard flow", async ({ request, page }) => {
    // 1a. Signup creates account
    const { status: signupStatus, body: signupBody } = await apiSignup(request, {
      ...student,
      role: "student",
      orphanage: "E2E Test Orphanage",
    });
    expect(signupStatus).toBe(201);
    expect(signupBody.user).toBeDefined();
    expect(signupBody.user.email).toBe(student.email);
    expect(signupBody.user.role).toBe("student");
    expect(signupBody.message).toContain("verify");

    // 1b. Login blocked before verification
    const loginBefore = await apiLogin(request, student.email, student.password);
    expect(loginBefore.status).toBe(403);
    expect(loginBefore.body.code).toBe("EMAIL_NOT_VERIFIED");

    // 1c. Coordinator verifies the student
    const coordToken = await getToken(request, SEED_COORDINATOR.email, SEED_COORDINATOR.password);
    const usersRes = await request.get(`${BASE}/api/admin/users`, {
      headers: authHeader(coordToken),
    });
    expect(usersRes.status()).toBe(200);
    const users = await usersRes.json();
    const testUser = users.find((u: any) => u.email === student.email);
    expect(testUser).toBeDefined();

    const verifyRes = await request.patch(
      `${BASE}/api/admin/users/${testUser.id}/verify`,
      { headers: authHeader(coordToken) }
    );
    expect(verifyRes.status()).toBe(200);

    // 1d. API login now succeeds
    const loginAfter = await apiLogin(request, student.email, student.password);
    expect(loginAfter.status).toBe(200);
    expect(loginAfter.body.token).toBeTruthy();

    // 1e. UI: login form → redirects to dashboard
    await page.goto("/login");
    await page.getByTestId("input-email").fill(student.email);
    await page.getByTestId("input-password").fill(student.password);

    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
      ),
      page.getByTestId("button-login").click(),
    ]);
    expect(loginResponse.status()).toBe(200);

    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Student browses classes → enrolls → class appears in dashboard
// ---------------------------------------------------------------------------
test.describe("Scenario 2 — Browse classes → enroll → appears in dashboard", () => {
  test("Student can browse, enroll, and see class in enrolled list", async ({
    request,
    page,
  }) => {
    const token = await getToken(request, SEED_STUDENT.email, SEED_STUDENT.password);

    // Get available classes (public endpoint — no auth needed)
    const classesRes = await request.get(`${BASE}/api/classes`);
    expect(classesRes.status()).toBe(200);
    const allClasses = await classesRes.json();
    expect(allClasses.length).toBeGreaterThan(0);

    // Get already-enrolled classes to find one NOT enrolled in
    const enrolledRes = await request.get(`${BASE}/api/classes/my/enrolled`, {
      headers: authHeader(token),
    });
    const enrolled = await enrolledRes.json();
    const enrolledIds = new Set((enrolled as any[]).map((c: any) => c.id));

    // Pick a class student is NOT enrolled in
    const target = allClasses.find(
      (c: any) => !enrolledIds.has(c.id) && c.status === "active"
    );
    expect(target).toBeDefined();

    // Enroll via API (simulates clicking Enroll button)
    const bookRes = await request.post(`${BASE}/api/bookings`, {
      headers: authHeader(token),
      data: {
        classId: target.id,
        tutorId: target.tutorId,
        scheduledDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        duration: target.duration || 60,
      },
    });
    expect(bookRes.status()).toBe(201);

    // Verify class now appears in enrolled list
    const enrolledAfter = await request.get(`${BASE}/api/classes/my/enrolled`, {
      headers: authHeader(token),
    });
    const enrolledAfterList = await enrolledAfter.json();
    const found = (enrolledAfterList as any[]).find((c: any) => c.id === target.id);
    expect(found).toBeDefined();

    // UI: browse page renders class cards
    await page.goto("/classes");
    await expect(page.locator("[data-testid^='card-class-']").first()).toBeVisible({
      timeout: 15000,
    });
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Student takes quiz → score appears in results
// ---------------------------------------------------------------------------
test.describe("Scenario 3 — Student takes quiz → score in results", () => {
  test("Submit quiz answers and verify score is recorded", async ({ request }) => {
    const studentToken = await getToken(request, SEED_STUDENT.email, SEED_STUDENT.password);
    const tutorToken = await getToken(request, SEED_TUTOR.email, SEED_TUTOR.password);

    // Find a class the tutor owns that the student is enrolled in
    const myClassesRes = await request.get(`${BASE}/api/classes/my/teaching`, {
      headers: authHeader(tutorToken),
    });
    expect(myClassesRes.status()).toBe(200);
    const myClasses = await myClassesRes.json();

    const enrolledRes = await request.get(`${BASE}/api/classes/my/enrolled`, {
      headers: authHeader(studentToken),
    });
    expect(enrolledRes.status()).toBe(200);
    const enrolled = await enrolledRes.json();
    const enrolledIds = new Set((enrolled as any[]).map((c: any) => c.id));

    // Find a class taught by this tutor that the student is enrolled in
    let tutorClass = (myClasses as any[]).find((c: any) => enrolledIds.has(c.id));

    // If none, enroll the student in the tutor's first class
    if (!tutorClass) {
      tutorClass = (myClasses as any[])[0];
      expect(tutorClass).toBeDefined();
      const enrollRes = await request.post(`${BASE}/api/bookings`, {
        headers: authHeader(studentToken),
        data: { classId: tutorClass.id, scheduledDate: new Date().toISOString().split("T")[0], scheduledTime: "10:00", duration: 60 },
      });
      expect(enrollRes.status()).toBeLessThan(500);
    }

    // Tutor creates a quiz for this class
    const quizData = {
      classId: tutorClass.id,
      title: `E2E Quiz ${RUN_ID}`,
      description: "Test quiz created by Playwright",
      questions: JSON.stringify([
        { question: "What is 2+2?", options: ["3", "4", "5", "6"], correctAnswer: 1 },
        { question: "What is 10/2?", options: ["3", "4", "5", "6"], correctAnswer: 2 },
      ]),
      timeLimit: 5,
      passingScore: 50,
      maxAttempts: 3,
    };
    const createQuizRes = await request.post(`${BASE}/api/quizzes`, {
      headers: authHeader(tutorToken),
      data: quizData,
    });
    expect(createQuizRes.status()).toBe(201);
    const quiz = await createQuizRes.json();
    expect(quiz.id).toBeDefined();

    // Student submits quiz result
    const submitRes = await request.post(`${BASE}/api/quiz-results`, {
      headers: authHeader(studentToken),
      data: {
        quizId: quiz.id,
        answers: [1, 2],  // indices matching correctAnswer in each question
        score: 100,
        passed: true,
      },
    });
    expect(submitRes.status()).toBe(201);

    // Verify result appears in student's quiz results
    const resultsRes = await request.get(`${BASE}/api/quiz-results/my`, {
      headers: authHeader(studentToken),
    });
    expect(resultsRes.status()).toBe(200);
    const results = await resultsRes.json();
    const matchingResult = (results as any[]).find((r: any) => r.quizId === quiz.id);
    expect(matchingResult).toBeDefined();
    expect(matchingResult.score).toBe(100);
    expect(matchingResult.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Tutor creates class → class visible in browse
// ---------------------------------------------------------------------------
test.describe("Scenario 4 — Tutor creates class → visible in browse", () => {
  const classTitle = `E2E Test Class ${RUN_ID}`;

  test("Tutor creates class and it appears in public listing", async ({ request, page }) => {
    const token = await getToken(request, SEED_TUTOR.email, SEED_TUTOR.password);

    // Create a new class
    const createRes = await request.post(`${BASE}/api/classes`, {
      headers: authHeader(token),
      data: {
        title: classTitle,
        description: "End-to-end test class created by Playwright",
        category: "Programming & Tech",
        skillLevel: "beginner",
        duration: 60,
        maxStudents: 30,
        courseType: "on-demand",
        isFree: true,
        language: "English",
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeDefined();
    expect(created.title).toBe(classTitle);

    // Verify it appears in public class listing
    const listRes = await request.get(`${BASE}/api/classes`);
    const allClasses = await listRes.json();
    const found = (allClasses as any[]).find((c: any) => c.title === classTitle);
    expect(found).toBeDefined();

    // UI: visit the class detail page
    await page.goto(`/classes/${created.id}`);
    await expect(page.getByTestId("text-class-title")).toContainText(classTitle, {
      timeout: 15000,
    });
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Coordinator approves tutor → tutor can login
// ---------------------------------------------------------------------------
test.describe("Scenario 5 — Coordinator approves tutor → tutor can login", () => {
  const newTutor = {
    name: `TestTutor ${RUN_ID}`,
    email: `tutor-${RUN_ID}@test.local`,
    password: "TestPass123!",
  };

  test("Pending tutor is blocked, then approved and can login", async ({ request }) => {
    // 1. Sign up a new tutor (will be pending approval + unverified)
    const signupRes = await apiSignup(request, {
      ...newTutor,
      role: "tutor",
    });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.user.role).toBe("tutor");

    // 2. Tutor login should fail (403 for unverified or pending approval)
    const loginBefore = await apiLogin(request, newTutor.email, newTutor.password);
    expect(loginBefore.status).toBe(403);

    // 3. Coordinator approves (reuse cached coordinator token)
    const coordToken = await getToken(request, SEED_COORDINATOR.email, SEED_COORDINATOR.password);

    // 4. Find the pending tutor
    const usersRes = await request.get(`${BASE}/api/admin/users`, {
      headers: authHeader(coordToken),
    });
    const users = await usersRes.json();
    const pendingTutor = (users as any[]).find((u: any) => u.email === newTutor.email);
    expect(pendingTutor).toBeDefined();
    expect(pendingTutor.isPendingApproval).toBe(true);

    // 5. Approve the tutor (sets isPendingApproval=false and isVerified=true)
    const approveRes = await request.patch(
      `${BASE}/api/admin/users/${pendingTutor.id}/approve`,
      { headers: authHeader(coordToken) }
    );
    expect(approveRes.status()).toBe(200);

    // 6. Now tutor can login
    const loginAfter = await apiLogin(request, newTutor.email, newTutor.password);
    expect(loginAfter.status).toBe(200);
    expect(loginAfter.body.token).toBeTruthy();
    expect(loginAfter.body.user.role).toBe("tutor");
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Health check endpoint returns valid response
// ---------------------------------------------------------------------------
test.describe("Scenario 6 — Health check endpoint", () => {
  test("GET /api/health returns status ok with DB info", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeTruthy();
    expect(body.memory).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: UI smoke tests — key pages render without errors
// ---------------------------------------------------------------------------
test.describe("Scenario 7 — UI smoke tests", () => {
  test("Home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TutorBridge/i, { timeout: 15000 });
  });

  test("Login page loads with form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("input-email")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("input-password")).toBeVisible();
    await expect(page.getByTestId("button-login")).toBeVisible();
  });

  test("Signup page loads with role selection", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByTestId("button-role-student")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("button-role-tutor")).toBeVisible();
  });

  test("Browse classes page renders class cards", async ({ page }) => {
    await page.goto("/classes");
    await expect(page.locator("[data-testid^='card-class-']").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("Terms of Service page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText(/terms/i, { timeout: 10000 });
  });

  test("Privacy Policy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText(/privacy/i, { timeout: 10000 });
  });
});
