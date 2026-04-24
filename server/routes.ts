import type { Express, Request, Response, NextFunction } from "express";

// Augment Express Request to include auth properties set by authMiddleware
declare global {
  namespace Express {
    interface Request {
      userId: number;
      tokenVersion: number;
    }
  }
}
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { signupSchema, loginSchema, insertLessonSchema, insertQuizSchema, insertAssignmentSchema, users, lessons, quizzes, assignments, assignmentSubmissions, notes, quizResults, certificates, notifications, emailVerificationTokens, passwordResetTokens as dbPasswordResetTokens, bookings, classes, contactSubmissions, classWaitlist, courseProgress, discussions, discussionReplies, reviews, type Booking } from "@shared/schema";
import { isNull } from "drizzle-orm";
import { eq, and, ne, not, inArray, gte, lte, desc, asc, or, ilike, sql, count } from "drizzle-orm";
import { sendBookingConfirmationEmail, sendAssignmentGradedEmail, sendVerificationEmail, sendWeeklyDigestEmail, sendPasswordResetEmail, sendCourseCompletionEmail, sendTutorApprovedEmail, sendTutorRejectedEmail, testEmailConnection } from "./email";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createZoomMeeting, deleteZoomMeeting, testZoomCredentials, listZoomRecordings } from "./zoom";
import { db } from "./db";
import { getNotifText, getUserLang } from "./notification-i18n";

// Multer setup
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
];
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG"));
    }
  },
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

function generateToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ userId, tokenVersion }, JWT_SECRET as string, { expiresIn: "7d" });
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as { userId: number; tokenVersion?: number };
    req.userId = decoded.userId;
    req.tokenVersion = decoded.tokenVersion ?? 1;
    // Reject revoked sessions (password reset, logout-all)
    const user = await storage.getUser(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if ((user.tokenVersion ?? 1) !== (decoded.tokenVersion ?? 1)) {
      return res.status(401).json({ message: "Session expired. Please log in again.", code: "TOKEN_REVOKED" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Account suspended. Contact support." });
    }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

async function verifyTokenVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if ((user.tokenVersion ?? 1) !== (req.tokenVersion ?? 1)) {
      return res.status(401).json({ message: "Session expired. Please log in again.", code: "TOKEN_REVOKED" });
    }
    next();
  } catch {
    return res.status(500).json({ message: "Token verification failed" });
  }
}

function coordinatorMiddleware(req: Request, res: Response, next: NextFunction) {
  authMiddleware(req, res, async () => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: true, message: "Coordinator access required", code: "FORBIDDEN" });
      }
      next();
    } catch {
      return res.status(500).json({ error: true, message: "Authorization check failed", code: "SERVER_ERROR" });
    }
  });
}

// ── Rate limiter ─────────────────────────────────────────────────────────────
// Key is prefixed per limiter so different limits don't share the same counter.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number, prefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${prefix}:${req.ip || "unknown"}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    entry.count++;
    next();
  };
}
const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
const loginRateLimit   = rateLimit(isDev ? 100 : 15, 15 * 60 * 1000, "login");   // 15 req / 15 min (login) — relaxed in dev
const signupRateLimit  = rateLimit(isDev ? 100 : 10, 15 * 60 * 1000, "signup");  // 10 req / 15 min (signup) — relaxed in dev
const authRateLimit    = rateLimit(isDev ? 100 : 10, 15 * 60 * 1000, "auth");    // 10 req / 15 min (forgot-pw, resend, etc.) — relaxed in dev
const gradeRateLimit   = rateLimit(60, 60 * 60 * 1000, "grade");   // #12: 60 grading ops / 1 hour
// AI rate limit keys by userId (not IP) so shared IPs at orphanages don't block each other
function aiUserRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `ai:${req.userId ?? req.ip ?? "unknown"}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    entry.count++;
    next();
  };
}
const aiRateLimit      = aiUserRateLimit(20, 60 * 60 * 1000);      // 20 req / 1 hour per user (AI is costly)
const contactRateLimit = rateLimit(5,  60 * 60 * 1000, "contact"); // 5  req / 1 hour  (forms)
const reportRateLimit   = rateLimit(20, 60 * 60 * 1000, "report");  // 20 req / 1 hour  (safeguarding reports)
const uploadRateLimit  = rateLimit(10, 60 * 60 * 1000, "upload");  // 10 req / 1 hour  (file uploads)
const messageRateLimit = rateLimit(30, 60 * 60 * 1000, "message"); // 30 req / 1 hour (messaging)

// Prune expired rate-limit entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  });
}, 5 * 60 * 1000);

// ── Token helpers (DB-backed, survive server restarts) ────────────────────────
async function createVerificationToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  // Delete any existing tokens for this user first
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  await db.insert(emailVerificationTokens).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
  return token;
}

async function createPasswordResetToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  // Delete any existing reset tokens for this user first
  await db.delete(dbPasswordResetTokens).where(eq(dbPasswordResetTokens.userId, userId));
  await db.insert(dbPasswordResetTokens).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });
  return token;
}

// ── WebSocket client registry ─────────────────────────────────────────────────
const wsClients = new Map<number, Set<WebSocket>>();

// Module-level timer IDs so the weekly digest can be cleared on shutdown
let weeklyDigestIntervalId: ReturnType<typeof setInterval> | null = null;
let weeklyDigestTimeoutId: ReturnType<typeof setTimeout> | null = null;

function msUntilNextMondayAt9am(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = day === 1 ? 7 : (1 + 7 - day) % 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(9, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}
function broadcastToUser(userId: number, data: object) {
  const sockets = wsClients.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(data);
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as { userId: number };
      req.userId = decoded.userId;
    } catch {}
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Request ID middleware (Phase 3) ──────────────────────────────────────────
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Request-ID", crypto.randomUUID());
    next();
  });

  // ── Health check (no auth) ─────────────────────────────────────────────────
  app.get("/api/health", async (_req: Request, res: Response) => {
    const start = Date.now();
    let dbStatus = "ok";
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = "unreachable";
    }
    const mem = process.memoryUsage();
    const payload = {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - start}ms`,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heap: `${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
    };
    res.status(dbStatus === "ok" ? 200 : 503).json(payload);
  });

  // ── WebSocket server ────────────────────────────────────────────────────────
  const wss = new WebSocketServer({ noServer: true });
  // #17: Validate Origin header on WebSocket upgrade to block cross-origin connections
  const allowedWsOrigins = process.env.APP_URL
    ? [process.env.APP_URL, "http://localhost:5000"]
    : ["http://localhost:5000"];

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws") { socket.destroy(); return; }
    const origin = request.headers.origin;
    if (process.env.NODE_ENV === "production" && origin && !allowedWsOrigins.includes(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    const token = url.searchParams.get("token");
    if (!token) { socket.destroy(); return; }
    let userId: number;
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: number };
      userId = decoded.userId;
    } catch { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => {
      if (!wsClients.has(userId)) wsClients.set(userId, new Set());
      wsClients.get(userId)!.add(ws);
      ws.on("close", () => {
        wsClients.get(userId)?.delete(ws);
        if (wsClients.get(userId)?.size === 0) wsClients.delete(userId);
      });
    });
  });

  // ── Health check — no auth required ─────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
  });

  // Public stats for login/signup pages
  app.get("/api/public/stats", async (_req, res) => {
    try {
      const [students, tutors, classes] = await Promise.all([
        storage.getStudentCount(),
        storage.getTutorCount(),
        storage.getClassCount(),
      ]);
      res.json({
        students,
        tutors,
        classes,
        googleOAuthEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // AUTH
  app.post("/api/auth/signup", signupRateLimit, async (req: Request, res: Response) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { name, email, password, role, orphanage, organization, bio, skillsTaught, skillsLearning } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email may already exist. Try logging in." });
      }
      // Server-side validation: coordinators must provide organization
      if (role === "coordinator" && !organization?.trim()) {
        return res.status(400).json({ message: "Organization name is required for coordinators" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role,
        orphanage: orphanage || null,
        organization: organization || null,
        bio: bio || null,
        avatar: null,
        skillsTaught: skillsTaught || null,
        skillsLearning: skillsLearning || null,
        isPendingApproval: (role === "tutor" || role === "coordinator") ? true : false,
      });
      const { password: _, ...safeUser } = user;
      // Send verification email — must be clicked before login is allowed
      // Fire-and-forget: errors never crash signup
      createVerificationToken(user.id).then(async (verifyToken) => {
        try {
          await sendVerificationEmail(email, name, verifyToken);
          console.log(`[signup] Verification email sent to ${email}`);
        } catch (emailErr: any) {
          console.error(`[signup] Failed to send verification email to ${email}:`, emailErr.message);
        }
      }).catch((tokenErr: any) => {
        console.error(`[signup] Failed to create verification token for user ${user.id}:`, tokenErr.message);
      });
      // Do NOT return a JWT — user must verify email before they can log in
      res.status(201).json({ user: safeUser, message: "Account created! Please check your email to verify your address before logging in." });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Signup failed" });
    }
  });

  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query as { token: string };
      if (!token) return res.status(400).json({ message: "Verification token is required." });
      const [entry] = await db.select().from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, token));
      if (!entry || new Date() > entry.expiresAt) {
        return res.status(400).json({ message: "Invalid or expired verification link." });
      }
      await storage.updateUser(entry.userId, { isVerified: true });
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
      res.json({ message: "Email verified successfully!" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Verification failed" });
    }
  });

  app.post("/api/auth/forgot-password", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.getUserByEmail(email);
      // Always return success to avoid user enumeration
      if (user) {
        const token = await createPasswordResetToken(user.id);
        await sendPasswordResetEmail(user.email, user.name, token);
      }
      res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to send reset email" });
    }
  });

  // POST /api/auth/resend-verification — resend verification email for unverified accounts
  app.post("/api/auth/resend-verification", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.getUserByEmail(email);
      // Always return success to avoid user enumeration
      if (user && !user.isVerified && !user.isBlocked) {
        const verifyToken = await createVerificationToken(user.id);
        sendVerificationEmail(user.email, user.name, verifyToken)
          .then(() => console.log(`[resend] Verification email sent to ${user.email}`))
          .catch((e: any) => console.error(`[resend] Failed to send to ${user.email}:`, e.message));
      }
      res.json({ message: "If that email exists and is unverified, a new verification link has been sent." });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required" });
      if (newPassword.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
      const [entry] = await db.select().from(dbPasswordResetTokens)
        .where(eq(dbPasswordResetTokens.token, token));
      if (!entry || new Date() > entry.expiresAt) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(entry.userId, { password: hashed });
      // Invalidate all existing sessions so stolen tokens can't be reused after reset
      await storage.incrementTokenVersion(entry.userId);
      await db.delete(dbPasswordResetTokens).where(eq(dbPasswordResetTokens.token, token));
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to reset password" });
    }
  });

  app.post("/api/auth/login", loginRateLimit, async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      }
      // Account lockout check (Phase 3)
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        const unlockMins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        return res.status(423).json({ message: `Account temporarily locked. Try again in ${unlockMins} minute(s).`, code: "ACCOUNT_LOCKED" });
      }
      if (user.isPendingApproval && (user.role === "tutor" || user.role === "coordinator")) {
        const msg = user.role === "tutor"
          ? "Your tutor account is pending approval by a coordinator. You will be notified by email once approved."
          : "Your coordinator account is pending approval by an existing coordinator. You will be notified by email once approved.";
        return res.status(403).json({ message: msg, code: "PENDING_APPROVAL" });
      }
      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in. Check your inbox for the verification link.", code: "EMAIL_NOT_VERIFIED" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        // Increment failed attempts, lock after 5
        const attempts = (user.failedLoginAttempts ?? 0) + 1;
        const updateData: Partial<typeof user> = { failedLoginAttempts: attempts };
        if (attempts >= 5) {
          (updateData as Record<string, unknown>).lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
        }
        await storage.updateUser(user.id, updateData);
        const remaining = Math.max(0, 5 - attempts);
        return res.status(401).json({
          message: remaining > 0
            ? `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`
            : "Invalid email or password. Account locked for 30 minutes due to too many failed attempts.",
        });
      }
      // Successful login — reset lockout
      const incomingIp = req.ip || req.headers["x-forwarded-for"] as string;
      const isNewIp = user.lastLoginIp && user.lastLoginIp !== incomingIp;
      await storage.updateUser(user.id, { failedLoginAttempts: 0, lockedUntil: null, lastLoginIp: incomingIp });
      // Record login history
      await storage.recordLoginHistory(user.id, incomingIp, req.headers["user-agent"]);
      // Suspicious IP notification
      if (isNewIp) {
        const loginLang = await getUserLang(storage, user.id);
        const loginNotifText = getNotifText("new_login", loginLang, { ip: incomingIp });
        await storage.createNotification({
          userId: user.id,
          type: "system",
          title: loginNotifText.title,
          message: loginNotifText.message,
          link: "/settings",
        });
      }
      const token = generateToken(user.id, user.tokenVersion ?? 1);
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/auth/logout-all — revoke all sessions for the current user (Phase 3)
  app.post("/api/auth/logout-all", authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.incrementTokenVersion(req.userId);
      res.json({ success: true, message: "All sessions have been logged out." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/auth/sessions — last 10 login history entries (Phase 3)
  app.get("/api/auth/sessions", authMiddleware, async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getLoginHistory(req.userId, 10);
      // #147: mark the most recent session whose IP matches current request as current
      const currentIp = req.ip || (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim();
      let markedCurrent = false;
      const withCurrent = sessions.map((s: any) => {
        const isCurrent = !markedCurrent && s.ip === currentIp;
        if (isCurrent) markedCurrent = true;
        return { ...s, isCurrent };
      });
      // If no IP matched (e.g. behind proxy), mark the most recent as current
      if (!markedCurrent && withCurrent.length > 0) withCurrent[0].isCurrent = true;
      res.json(withCurrent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // USERS
  app.get("/api/users/search", authMiddleware, async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || "").trim().toLowerCase();
      if (!q) return res.json([]);
      const allUsers = await storage.getAllUsers();
      const results = allUsers
        .filter((u) => u.id !== req.userId && u.name?.toLowerCase().includes(q))
        .slice(0, 20)
        .map(({ id, name, role, avatar }) => ({ id, name, role, avatar }));
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      const {
        password: _,
        failedLoginAttempts: __,
        lockedUntil: ___,
        tokenVersion: ____,
        lastLoginIp: _____,
        isBlocked: ______,
        deletedAt: _______,
        email: _email,
        ...safeUser
      } = user;
      // Include availability schedule for tutors
      if (user.role === "tutor") {
        const settings = await storage.getUserSettings(user.id);
        const safeUserWithSchedule = safeUser as typeof safeUser & { availabilitySchedule: Record<string, unknown> | null };
        safeUserWithSchedule.availabilitySchedule = settings?.availabilitySchedule as Record<string, unknown> | null || null;
      }
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.userId !== Number(req.params.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const allowedFields = ["name", "bio", "avatar", "skillsTaught", "skillsLearning", "orphanage", "organization"];
      const safeUpdate: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) safeUpdate[field] = req.body[field];
      }
      const updated = await storage.updateUser(Number(req.params.id), safeUpdate);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users/:id/change-password", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.userId !== Number(req.params.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Current password and new password (min 8 chars) required" });
      }
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(Number(req.params.id), { password: hashed });
      // Revoke all existing sessions by incrementing tokenVersion
      await storage.incrementTokenVersion(Number(req.params.id));
      res.json({ success: true, message: "Password changed. All other sessions have been logged out." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // CLASSES
  app.get("/api/classes", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { search, category, level, courseType, sort, minDuration, maxDuration, minRating, language, isFree, orphanage, limit } = req.query;
      const result = await storage.getClasses({
        search: search as string,
        category: category as string,
        level: level as string,
        courseType: courseType as string,
        sort: sort as string,
        minDuration: minDuration ? Number(minDuration) : undefined,
        maxDuration: maxDuration ? Number(maxDuration) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        language: language as string,
        isFree: isFree as string,
        orphanage: orphanage as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/classes/my/teaching", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getClassesByTutor(req.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/classes/my/enrolled", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getEnrolledClasses(req.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Recommended classes for the authenticated student
  app.get("/api/classes/recommended", authMiddleware, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 6, 20);
      const enrolled = await storage.getEnrolledClasses(req.userId);
      const enrolledIds = new Set(enrolled.map((c) => c.id));
      const learningCategories = new Set(enrolled.map((c) => c.category).filter(Boolean));

      // Get all active classes
      const allActive = await storage.getClasses();
      // Filter out already-enrolled and draft classes
      const candidates = allActive.filter((c: any) => !enrolledIds.has(c.id) && c.status !== "draft");

      // Score each candidate: category match + rating + popularity
      const scored = candidates.map((c: any) => {
        let score = 0;
        if (learningCategories.has(c.category)) score += 50; // category match
        score += (Number(c.averageRating) || 0) * 5;          // rating (0-25)
        score += Math.min(c.enrolledCount || 0, 50);          // popularity cap at 50
        return { ...c, _score: score };
      });

      scored.sort((a: any, b: any) => b._score - a._score);
      const result = scored.slice(0, limit).map(({ _score, ...rest }: any) => rest);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Upcoming assignment deadlines for the authenticated student (next 14 days, excluding already-submitted)
  app.get("/api/students/me/deadlines", authMiddleware, async (req: Request, res: Response) => {
    try {
      const enrolled = await storage.getEnrolledClasses(req.userId);
      if (!enrolled.length) return res.json([]);
      const classIds = enrolled.map((c) => c.id);
      const now = new Date();
      const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const upcoming = await db.select().from(assignments).where(
        and(
          inArray(assignments.classId, classIds),
          gte(assignments.dueDate, now),
          lte(assignments.dueDate, twoWeeks)
        )
      );
      if (!upcoming.length) return res.json([]);
      // Filter out assignments this student has already submitted
      const submittedRows = await db
        .select({ assignmentId: assignmentSubmissions.assignmentId })
        .from(assignmentSubmissions)
        .where(and(
          eq(assignmentSubmissions.studentId, req.userId),
          inArray(assignmentSubmissions.assignmentId, upcoming.map((a) => a.id))
        ));
      const submittedIds = new Set(submittedRows.map((r) => r.assignmentId));
      // Enrich with className
      const classMap: Record<number, string> = {};
      enrolled.forEach((c) => { if (c.id) classMap[c.id] = c.title; });
      const enriched = upcoming
        .filter((a): a is typeof a & { classId: number; dueDate: Date } => !!a.classId && !!a.dueDate && !submittedIds.has(a.id))
        .map((a) => ({ ...a, className: a.classId ? classMap[a.classId] : `Class #${a.classId ?? 'unknown'}` }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Tutors for the authenticated student's enrolled classes
  app.get("/api/students/me/tutors", authMiddleware, async (req: Request, res: Response) => {
    try {
      const enrolled = await storage.getEnrolledClasses(req.userId);
      if (!enrolled.length) return res.json([]);
      const seen = new Set<number>();
      const tutorIds: number[] = enrolled
        .map((c) => c.tutorId)
        .filter((id): id is number => {
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      const tutors = await db.select({
        id: users.id, name: users.name, avatar: users.avatar, bio: users.bio,
        rating: users.rating, skillsTaught: users.skillsTaught,
      }).from(users).where(inArray(users.id, tutorIds));
      // Attach which classes each tutor teaches
      const result = tutors.map((t) => ({
        ...t,
        classes: enrolled.filter((c) => c.tutorId === t.id).map((c) => ({ id: c.id, title: c.title })),
      }));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // #170: STUDENT LEADERBOARD — ranked by activity score
  app.get("/api/leaderboard", authMiddleware, async (req: Request, res: Response) => {
    try {
      const countFn = count;
      const descFn = desc;
      // Gather completed bookings per student
      const completedBookings = await db.select({
        studentId: bookings.studentId,
        cnt: countFn(bookings.id),
      })
        .from(bookings)
        .where(eq(bookings.status, "completed" as any))
        .groupBy(bookings.studentId);

      // Quiz passes
      const quizPasses = await db.select({
        studentId: quizResults.studentId,
        cnt: countFn(quizResults.id),
      })
        .from(quizResults)
        .where(eq(quizResults.passed, true))
        .groupBy(quizResults.studentId);

      // Certificates
      const certs = await db.select({
        studentId: certificates.studentId,
        cnt: countFn(certificates.id),
      })
        .from(certificates)
        .groupBy(certificates.studentId);

      // Merge into score map
      const scores: Record<number, number> = {};
      for (const r of completedBookings) { scores[r.studentId!] = (scores[r.studentId!] || 0) + Number(r.cnt) * 10; }
      for (const r of quizPasses)        { scores[r.studentId!] = (scores[r.studentId!] || 0) + Number(r.cnt) * 5; }
      for (const r of certs)             { scores[r.studentId!] = (scores[r.studentId!] || 0) + Number(r.cnt) * 20; }

      const topIds = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([id]) => Number(id));

      if (!topIds.length) return res.json([]);

      // inArray is already imported statically
      const topUsers = await db.select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(and(inArray(users.id, topIds), isNull(users.deletedAt)));

      const ranked = topIds.map((id, idx) => {
        const u = topUsers.find((x) => x.id === id);
        return { rank: idx + 1, userId: id, name: u?.name || "User", avatar: u?.avatar || null, score: scores[id] };
      });

      res.json(ranked);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/classes/user/:userId", optionalAuth, async (req: Request, res: Response) => {
    try {
      const result = await storage.getClassesByUser(Number(req.params.userId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/classes/:id", optionalAuth, async (req: Request, res: Response) => {
    try {
      const cls = await storage.getClass(Number(req.params.id));
      if (!cls) return res.status(404).json({ message: "Class not found" });

      let isEnrolled = false;
      let isFavorited = false;
      if (req.userId) {
        const userBookings = await storage.getBookings(req.userId);
        isEnrolled = userBookings.some(
          (b) => b.classId === cls.id && !["cancelled", "no-show"].includes(b.status)
        );
        isFavorited = await storage.isFavorite(req.userId, cls.id);
      }

      await db.update(classes).set({ viewCount: sql`${classes.viewCount} + 1` }).where(eq(classes.id, cls.id));

      res.json({ ...cls, isEnrolled, isFavorited });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Check if the current user is enrolled in a class
  app.get("/api/classes/:id/enrollment", authMiddleware, async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.id);
      const bookings = await storage.getBookings(req.userId);
      const isEnrolled = bookings.some(
        (b) => b.classId === classId && !["cancelled", "no-show"].includes(b.status)
      );
      const cls = await storage.getClass(classId);
      const isTeacher = cls?.tutorId === req.userId;
      res.json({ isEnrolled, isTeacher });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/classes", authMiddleware, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.userId);
      if (!currentUser || currentUser.role !== "tutor") {
        return res.status(403).json({ message: "Only tutors can create classes" });
      }
      const { title, description, category, skillLevel, duration, maxStudents, scheduleDate, scheduleTime, scheduleType, courseType, thumbnailUrl, videoUrl, totalLectures, language, isFree, price } = req.body;
      if (!title || !description || !category) {
        return res.status(400).json({ message: "Title, description, and category are required" });
      }
      const cls = await storage.createClass({
        tutorId: req.userId,
        title,
        description,
        category,
        skillLevel: skillLevel || "beginner",
        duration: Number(duration) || 60,
        maxStudents: Number(maxStudents) || 10,
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        scheduleTime: scheduleTime || null,
        scheduleType: scheduleType || "one-time",
        courseType: courseType || "live",
        thumbnailUrl: thumbnailUrl || null,
        videoUrl: videoUrl || null,
        totalLectures: Number(totalLectures) || 1,
        language: language || "English",
        isFree: isFree !== false,
        price: price || "0",
        status: "active",
        recordingUrl: null,
        recordingAvailableUntil: null,
        recurringDays: null,
      });
      res.status(201).json(cls);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/classes/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const cls = await storage.getClass(Number(req.params.id));
      if (!cls || cls.tutorId !== req.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const ALLOWED_CLASS_FIELDS = [
        "title", "description", "category", "skillLevel", "duration",
        "maxStudents", "status", "courseType", "thumbnailUrl", "videoUrl",
        "recordingUrl", "totalLectures", "language", "isFree", "scheduleDate",
        "scheduleTime", "zoomMeetingId", "zoomMeetingUrl",
      ];
      const safeUpdate: Record<string, any> = {};
      for (const field of ALLOWED_CLASS_FIELDS) {
        if (req.body[field] !== undefined) safeUpdate[field] = req.body[field];
      }
      const updated = await storage.updateClass(Number(req.params.id), safeUpdate);
      if (!updated) return res.status(404).json({ message: "Class not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // #167: CLASS ANNOUNCEMENTS — tutor broadcasts to enrolled students
  app.post("/api/classes/:id/announce", authMiddleware, async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.id);
      const { title, message } = req.body;
      if (!title?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "title and message are required" });
      }
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Only the tutor can send announcements" });

      // Get enrolled students for this class with direct query
      const enrolledStudents = await db
        .select({ studentId: bookings.studentId })
        .from(bookings)
        .where(and(
          eq(bookings.classId, classId),
          not(inArray(bookings.status, ["cancelled", "no-show"]))
        ));
      const enrolledStudentIds = enrolledStudents.map(s => s.studentId);

      const results = await Promise.allSettled(
        enrolledStudentIds.map((studentId: number) =>
          storage.createNotification({
            userId: studentId,
            type: "system",
            title: `📢 ${cls.title}: ${title}`,
            message,
            link: `/classes/${classId}`,
          }).then((notif: any) => {
            broadcastToUser(studentId, { type: "notification", payload: notif });
            return notif;
          })
        )
      );
      const sent = results.filter((r) => r.status === "fulfilled").length;
      res.json({ sent, total: enrolledStudentIds.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // #169: CERTIFICATE CRITERIA EDITOR — tutor sets auto-cert rules per class
  app.patch("/api/classes/:id/certificate-criteria", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.params.id);
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      const { criteria } = req.body;
      if (!Array.isArray(criteria)) return res.status(400).json({ message: "criteria must be an array" });
      const [updated] = await db.update(classes)
        .set({ certificateCriteria: criteria })
        .where(eq(classes.id, classId))
        .returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // #164: PER-CLASS STUDENT PROGRESS DASHBOARD
  app.get("/api/classes/:id/student-progress", authMiddleware, async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.id);
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Forbidden" });

      const countFn = count;

      // Get all confirmed bookings for this class
      const classBookings = await db.select({
        studentId: bookings.studentId,
        status: bookings.status,
      }).from(bookings).where(and(eq(bookings.classId, classId), not(inArray(bookings.status, ["cancelled", "no-show"] as any[]))));

      const studentIds = Array.from(new Set(classBookings.map((b) => b.studentId)));
      if (!studentIds.length) return res.json([]);

      // Get their quiz results for quizzes in this class
      const classQuizIds = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.classId, classId));
      const qIds = classQuizIds.map((q) => q.id);

      const quizResultsForClass = qIds.length
        ? await db.select({ studentId: quizResults.studentId, passed: quizResults.passed, score: quizResults.score })
            .from(quizResults).where(inArray(quizResults.quizId, qIds))
        : [];

      // Get assignment submissions for assignments in this class
      const classAssignmentIds = await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.classId, classId));
      const aIds = classAssignmentIds.map((a) => a.id);

      const submissionsForClass = aIds.length
        ? await db.select({ studentId: assignmentSubmissions.studentId, grade: assignmentSubmissions.grade })
            .from(assignmentSubmissions).where(inArray(assignmentSubmissions.assignmentId, aIds))
        : [];

      // Get course progress
      const progressForClass = await db.select({ studentId: courseProgress.userId, completed: courseProgress.completed })
        .from(courseProgress).where(eq(courseProgress.classId, classId));

      // Certificates
      const certsForClass = await db.select({ studentId: certificates.studentId })
        .from(certificates).where(eq(certificates.classId, classId));

      // Load student names
      const studentUsers = studentIds.length
        ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, studentIds))
        : [];

      const result = studentIds.map((sid) => {
        const u = studentUsers.find((x) => x.id === sid);
        const myQuizResults = quizResultsForClass.filter((r) => r.studentId === sid);
        const mySubmissions = submissionsForClass.filter((r) => r.studentId === sid);
        const myProgress = progressForClass.filter((r) => r.studentId === sid);
        const completedLectures = myProgress.filter((r) => r.completed).length;
        const hasCert = certsForClass.some((c) => c.studentId === sid);
        const avgGrade = mySubmissions.length
          ? Math.round(mySubmissions.reduce((s, r) => s + (r.grade || 0), 0) / mySubmissions.length)
          : null;
        const quizPasses = myQuizResults.filter((r) => r.passed).length;

        return {
          studentId: sid,
          name: u?.name || "Student",
          avatar: u?.avatar || null,
          completedLectures,
          totalLectures: cls.totalLectures || 1,
          quizPasses,
          totalQuizzes: qIds.length,
          assignmentsSubmitted: mySubmissions.length,
          totalAssignments: aIds.length,
          avgGrade,
          hasCertificate: hasCert,
        };
      });

      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // BOOKINGS
  app.get("/api/bookings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getBookings(req.userId);
      
      // Batch-query existing reviews for the user to populate hasReview field
      const { reviews } = await import("@shared/schema");
      const bookingIds = result.map(b => b.classId);
      const existingReviews = bookingIds.length > 0
        ? await db.select({ classId: reviews.classId })
            .from(reviews)
            .where(and(eq(reviews.reviewerId, req.userId), inArray(reviews.classId, bookingIds)))
        : [];
      
      const reviewedClassIds = new Set(existingReviews.map(r => r.classId));
      
      // Add hasReview field to each booking
      const bookingsWithReviewStatus = result.map(booking => ({
        ...booking,
        hasReview: reviewedClassIds.has(booking.classId)
      }));
      
      res.json(bookingsWithReviewStatus);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bookings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { classId, tutorId, scheduledDate, scheduledTime, duration } = req.body;
      if (!classId || !tutorId || !scheduledDate) {
        return res.status(400).json({ message: "classId, tutorId, and scheduledDate are required" });
      }

      // Wrap capacity check + booking insert + enrolledCount increment in a single transaction
      // to prevent race conditions where two concurrent requests could both pass the capacity check
      let booking: any;
      try {
        booking = await db.transaction(async (tx: any) => {
          // Re-read the class inside the transaction for an up-to-date enrolledCount
          const [cls] = await tx.select().from(classes).where(eq(classes.id, Number(classId)));
          if (!cls) throw Object.assign(new Error("Class not found"), { status: 404 });
          if ((cls.enrolledCount || 0) >= (cls.maxStudents || 10)) {
            throw Object.assign(new Error("Class is full"), { status: 400 });
          }
          // Prevent duplicate bookings: check if this student already has an active booking
          const [existing] = await tx.select({ id: bookings.id }).from(bookings).where(
            and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)),
              not(inArray(bookings.status, ["cancelled", "no-show"])))
          );
          if (existing) throw Object.assign(new Error("You already have an active booking for this class"), { status: 409 });
          const [created] = await tx.insert(bookings).values({
            studentId: req.userId,
            classId: Number(classId),
            tutorId: Number(tutorId),
            scheduledDate: new Date(scheduledDate),
            scheduledTime: scheduledTime || null,
            duration: Number(duration) || 60,
            status: "confirmed",
          }).returning();
          await tx.update(classes)
            .set({ enrolledCount: sql`${classes.enrolledCount} + 1` })
            .where(eq(classes.id, Number(classId)));
          return created;
        });
      } catch (txErr: any) {
        return res.status(txErr.status || 500).json({ message: txErr.message });
      }

      const bookingLang = await getUserLang(storage, tutorId);
      const bookingText = getNotifText("new_booking", bookingLang);
      const bookingNotif = await storage.createNotification({
        userId: tutorId,
        type: "booking",
        title: bookingText.title,
        message: bookingText.message,
        link: `/bookings`,
      });
      broadcastToUser(Number(tutorId), { type: "notification", payload: bookingNotif });

      // Send confirmation email
      try {
        const student = await storage.getUser(req.userId);
        const classData = await storage.getClass(Number(classId));
        if (student?.email && classData) {
          await sendBookingConfirmationEmail(
            student.email,
            student.name,
            classData.title,
            new Date(scheduledDate).toLocaleDateString()
          );
        }
      } catch (e) { console.warn("Booking confirmation email failed:", (e as Error).message); }

      res.status(201).json(booking);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // #174: WAITLIST — join when class is full
  app.post("/api/classes/:id/waitlist", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.params.id);
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if ((cls.enrolledCount || 0) < (cls.maxStudents || 10)) {
        return res.status(400).json({ message: "Class still has spots — enrol directly" });
      }
      const entry = await db.transaction(async (tx) => {
        const countFn = count;
        const [{ cnt }] = await tx.select({ cnt: countFn(classWaitlist.id) })
          .from(classWaitlist).where(eq(classWaitlist.classId, classId));
        const position = Number(cnt) + 1;
        const [result] = await tx.insert(classWaitlist)
          .values({ classId, studentId: req.userId, position })
          .onConflictDoNothing()
          .returning();
        return result;
      });
      res.status(201).json(entry || { message: "Already on waitlist" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/classes/:id/waitlist", authMiddleware, async (req, res) => {
    try {
      await db.delete(classWaitlist)
        .where(and(eq(classWaitlist.classId, Number(req.params.id)), eq(classWaitlist.studentId, req.userId)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/classes/:id/waitlist", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.params.id);
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      // If user is the tutor, return full waitlist
      if (cls.tutorId === req.userId) {
        const ascOp = asc;
        const list = await db.select().from(classWaitlist)
          .where(eq(classWaitlist.classId, classId))
          .orderBy(ascOp(classWaitlist.position));
        res.json(list);
      } else {
        // For students, only return their own waitlist entry or null
        const userEntry = await db.select().from(classWaitlist)
          .where(and(eq(classWaitlist.classId, classId), eq(classWaitlist.studentId, req.userId)))
          .limit(1);
        res.json(userEntry[0] || null);
      }
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // #172: BULK ENROLLMENT — tutor enrolls multiple students at once by userId array
  app.post("/api/classes/:id/bulk-enroll", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.params.id);
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "studentIds array required" });
      }
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Only the tutor can bulk-enrol" });
      
      // Check capacity before bulk enrollment
      const currentEnrolled = cls.enrolledCount || 0;
      const maxStudents = cls.maxStudents || 10;
      if ((currentEnrolled + studentIds.length) > maxStudents) {
        return res.status(400).json({ message: "Not enough spots for all students" });
      }

      const results = await Promise.allSettled(
        studentIds.map((sId: number) =>
          db.insert(bookings).values({
            studentId: sId, classId, tutorId: req.userId,
            scheduledDate: cls.scheduleDate || new Date(),
            status: "confirmed" as any,
          }).onConflictDoNothing().returning()
        )
      );
      const enrolled = results.filter((r) => r.status === "fulfilled" && (r as any).value?.length > 0).length;
      if (enrolled > 0) {
        await db.update(classes).set({ enrolledCount: sql`${classes.enrolledCount} + ${enrolled}` }).where(eq(classes.id, classId));
      }
      res.json({ enrolled, failed: results.length - enrolled });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // #166: LESSON ATTACHMENTS — PATCH to add/replace attachment list
  app.patch("/api/lessons/:id/attachments", authMiddleware, async (req, res) => {
    try {
      const { attachments } = req.body;
      if (!Array.isArray(attachments)) return res.status(400).json({ message: "attachments must be an array" });
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, Number(req.params.id)));
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      if (lesson.tutorId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      const [updated] = await db.update(lessons)
        .set({ attachments })
        .where(eq(lessons.id, Number(req.params.id)))
        .returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // #173: ASSIGNMENT RUBRIC — PATCH to set rubric criteria
  app.patch("/api/assignments/:id/rubric", authMiddleware, async (req, res) => {
    try {
      const { rubric } = req.body;
      if (!Array.isArray(rubric)) return res.status(400).json({ message: "rubric must be an array of criteria" });
      const [asgn] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!asgn) return res.status(404).json({ message: "Assignment not found" });
      if (asgn.tutorId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      const [updated] = await db.update(assignments)
        .set({ rubric })
        .where(eq(assignments.id, Number(req.params.id)))
        .returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });


  app.patch("/api/bookings/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(Number(req.params.id));
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.studentId !== req.userId && booking.tutorId !== req.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await storage.updateBooking(Number(req.params.id), { status: "cancelled" });
      // Decrement enrolledCount atomically on cancellation (#325)
      await db.update(classes)
        .set({ enrolledCount: sql`GREATEST(${classes.enrolledCount} - 1, 0)` })
        .where(eq(classes.id, booking.classId));
      // Notify tutor when student cancels
      if (booking.studentId === req.userId && booking.tutorId) {
        const classData = await storage.getClass(booking.classId);
        const cancelLang = await getUserLang(storage, booking.tutorId);
        const cancelText = getNotifText("booking_cancelled", cancelLang, { className: classData?.title || "your class" });
        await storage.createNotification({ // #14: was fire-and-forget
          userId: booking.tutorId,
          type: "booking",
          title: cancelText.title,
          message: cancelText.message,
          link: "/teacher-dashboard",
        }).then((n) => broadcastToUser(booking.tutorId!, { type: "notification", payload: n })).catch(() => {});
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Mark booking as completed — tutor or coordinator only
  app.patch("/api/bookings/:id/status", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const allowedStatuses = ["confirmed", "completed", "no-show"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `status must be one of: ${allowedStatuses.join(", ")}` });
      }
      const booking = await storage.getBooking(Number(req.params.id));
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const requestingUser = await storage.getUser(req.userId);
      const isTutor = booking.tutorId === req.userId;
      const isCoordinator = requestingUser?.role === "coordinator";
      if (!isTutor && !isCoordinator) {
        return res.status(403).json({ message: "Only the tutor or a coordinator can update booking status" });
      }

      const updated = await storage.updateBooking(Number(req.params.id), { status: status as Booking["status"] });

      // Auto-issue certificate and notify student on completion
      if (status === "completed") {
        try {
          const student = await storage.getUser(booking.studentId);
          const cls = booking.classId ? await storage.getClass(booking.classId) : null;
          const tutor = await storage.getUser(booking.tutorId);
          if (student && cls) {
            // Check if certificate already exists
            const andOp = and;
            const existing = await db.select().from(certificates)
              .where(andOp(eq(certificates.studentId, booking.studentId), eq(certificates.classId, booking.classId!)))
              .limit(1); // #8: proper exists query
            let cert = existing[0];
            if (!cert) {
              const verificationCode = crypto.randomUUID();
              [cert] = await db.insert(certificates).values({
                studentId: booking.studentId,
                classId: booking.classId,
                bookingId: booking.id,
                studentName: student.name,
                courseName: cls.title,
                tutorName: tutor?.name || "Tutor",
                verificationCode,
              }).returning();
            }
            // Notify student
            const sessLang = await getUserLang(storage, booking.studentId);
            const sessText = getNotifText("session_completed", sessLang, { className: cls.title });
            const notif = await storage.createNotification({
              userId: booking.studentId,
              type: "system",
              title: sessText.title,
              message: sessText.message,
              link: "/student-dashboard",
            });
            broadcastToUser(booking.studentId, { type: "notification", payload: notif });
            // Send completion email (fire-and-forget)
            if (cert) {
              sendCourseCompletionEmail(student.email, student.name, cls.title, cert.verificationCode).catch((err) => console.error("Email send failed:", err.message));
            }
          }
        } catch (certErr) {
          console.error("Certificate auto-issue failed:", certErr);
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // MESSAGES
  app.get("/api/messages/conversations", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getConversations(req.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/:otherUserId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getMessagesBetween(
        req.userId,
        Number(req.params.otherUserId)
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Mark all messages from otherUser as read (called by WS handler when message arrives in active convo)
  app.patch("/api/messages/:otherUserId/read", authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.markConversationRead(req.userId, Number(req.params.otherUserId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/messages", authMiddleware, messageRateLimit, async (req: Request, res: Response) => {
    try {
      const { receiverId, content, conversationId } = req.body;
      if (!receiverId || !content?.trim()) {
        return res.status(400).json({ message: "receiverId and content are required" });
      }
      if (Number(receiverId) === req.userId) {
        return res.status(400).json({ message: "Cannot send a message to yourself" });
      }

      // Enforce recipient's messaging preference
      const recipientSettings = await storage.getUserSettings(Number(receiverId));
      if (recipientSettings?.messagingPreference === "no-one") {
        return res.status(403).json({ message: "This user has disabled messaging." });
      }
      if (recipientSettings?.messagingPreference === "tutors-students") {
        const sender = await storage.getUser(req.userId);
        if (sender?.role !== "tutor") {
          return res.status(403).json({ message: "This user only accepts messages from tutors." });
        }
      }

      const msg = await storage.createMessage({
        senderId: req.userId,
        receiverId: Number(receiverId),
        content: content.trim(),
        conversationId: conversationId || [req.userId, Number(receiverId)].sort().join("-"),
      });
      // Broadcast to both sender and receiver via WebSocket
      broadcastToUser(req.userId, { type: "message", payload: msg });
      broadcastToUser(Number(receiverId), { type: "message", payload: msg });
      // Create persistent notification for recipient so they see it even if offline
      // #14: wrap in catch so message delivery is not blocked by notification failure
      getUserLang(storage, Number(receiverId)).then((msgLang) => {
        const msgText = getNotifText("new_message", msgLang);
        return storage.createNotification({
          userId: Number(receiverId),
          type: "message",
          title: msgText.title,
          message: msgText.message,
          link: "/messages",
        });
      }).catch(() => {}); // non-critical — don't fail the request if notification fails
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // REVIEWS
  app.get("/api/reviews/class/:classId", async (req: Request, res: Response) => {
    try {
      const result = await storage.getReviewsByClass(Number(req.params.classId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const result = await storage.getReviewsByUser(Number(req.params.userId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { revieweeId, classId, rating, comment } = req.body;
      if (!revieweeId || !classId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "revieweeId, classId, and rating (1-5) are required" });
      }
      
      // Prevent self-review
      if (Number(revieweeId) === req.userId) {
        return res.status(400).json({ message: "You cannot review yourself" });
      }
      // Verify reviewer is enrolled in this class (has a non-cancelled, non-no-show booking)
      const [enrollment] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.studentId, req.userId),
          eq(bookings.classId, Number(classId)),
          not(inArray(bookings.status, ["cancelled", "no-show"]))
        ))
        .limit(1);
      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this class to leave a review." });
      }
      
      // Check for duplicate review with same (reviewerId, revieweeId, classId)
      const reviewsTable = reviews;
      const [existingReview] = await db
        .select({ id: reviewsTable.id })
        .from(reviewsTable)
        .where(and(
          eq(reviewsTable.reviewerId, req.userId),
          eq(reviewsTable.revieweeId, Number(revieweeId)),
          eq(reviewsTable.classId, Number(classId))
        ))
        .limit(1);
      if (existingReview) {
        return res.status(409).json({ message: "You have already reviewed this class" });
      }
      const review = await storage.createReview({
        reviewerId: req.userId,
        revieweeId: Number(revieweeId),
        classId: Number(classId),
        rating: Number(rating),
        comment: comment || null,
      });

      const revLang = await getUserLang(storage, Number(revieweeId));
      const revText = getNotifText("new_review", revLang, { rating });
      await storage.createNotification({
        userId: Number(revieweeId),
        type: "review",
        title: revText.title,
        message: revText.message,
        link: `/profile/${revieweeId}`,
      });

      res.status(201).json(review);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // NOTIFICATIONS
  app.get("/api/notifications", authMiddleware, async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const result = await storage.getNotifications(req.userId, limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const [notif] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
      if (!notif || notif.userId !== req.userId) {
        return res.status(403).json({ error: true, message: "Forbidden" });
      }
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // FAVORITES
  app.get("/api/favorites", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getFavorites(req.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/favorites", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId is required" });
      const already = await storage.isFavorite(req.userId, Number(classId));
      if (already) return res.status(400).json({ message: "Already favorited" });
      const fav = await storage.addFavorite({
        userId: req.userId,
        classId: Number(classId),
      });
      res.status(201).json(fav);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/favorites/:classId", authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.removeFavorite(req.userId, Number(req.params.classId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SETTINGS
  app.get("/api/settings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getUserSettings(req.userId);
      // Return sensible defaults if no settings row exists yet
      const defaults = {
        emailNotifications: true,
        pushNotifications: true,
        bookingReminders: true,
        messageAlerts: true,
        reviewNotifications: true,
        marketingEmails: false,
        showProfilePublicly: true,
        theme: "light",
        language: "en",
        autoplayVideos: true,
        platformAlerts: true,
      };
      res.json(settings ? { ...defaults, ...settings } : defaults);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/settings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const ALLOWED_SETTINGS = [
        "emailNotifications", "pushNotifications", "bookingReminders", "messageAlerts",
        "reviewNotifications", "marketingEmails", "messagingPreference", "showProfilePublicly",
        "sessionTimeout", "theme", "language", "timezone", "autoplayVideos", "learningGoals",
        "preferredSubjects", "studyReminders", "teachingPreferences", "availabilitySchedule",
        "platformAlerts", "weeklyGoal", "recentlyViewedClasses",
      ];
      const filtered = Object.fromEntries(
        Object.entries(req.body).filter(([k]) => ALLOWED_SETTINGS.includes(k))
      );
      const settings = await storage.upsertUserSettings(req.userId, filtered);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // COURSE PROGRESS
  app.get("/api/progress", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getUserCourseProgress(req.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/progress/:classId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getCourseProgress(req.userId, Number(req.params.classId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/progress", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { classId, lectureNumber, completed, watchTimeSeconds } = req.body;
      if (!classId) return res.status(400).json({ message: "classId is required" });
      
      // Verify user is enrolled in the class (prevents certificate forgery)
      const cls = await storage.getClass(Number(classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      const isOwner = cls.tutorId === req.userId;
      const isEnrolled = await db.select().from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
        .limit(1);
      
      if (!isOwner && !isEnrolled[0]) {
        return res.status(403).json({ message: "Access denied - not enrolled in this class" });
      }
      const progress = await storage.upsertCourseProgress({
        userId: req.userId,
        classId: Number(classId),
        lectureNumber: Number(lectureNumber) || 1,
        completed: completed || false,
        watchTimeSeconds: Number(watchTimeSeconds) || 0,
      });

      // Auto-issue certificate when all lectures are completed
      if (completed) {
        try {
          const cls = await storage.getClass(Number(classId));
          if (cls) {
            const allProgress = await storage.getCourseProgress(req.userId, Number(classId));
            const completedCount = allProgress.filter((p) => p.completed).length;
            if (completedCount >= (cls.totalLectures || 1)) {
              await db.transaction(async (tx) => {
                const _and = and;
                const existing = await tx.select().from(certificates)
                  .where(_and(eq(certificates.studentId, req.userId), eq(certificates.classId, Number(classId))))
                  .limit(1);
                if (!existing[0]) {
                  const student = await storage.getUser(req.userId);
                  const tutor = await storage.getUser(cls.tutorId);
                  const verificationCode = crypto.randomUUID();
                  await tx.insert(certificates).values({
                    studentId: req.userId,
                    classId: Number(classId),
                    bookingId: null,
                    studentName: student?.name || "Student",
                    courseName: cls.title,
                    tutorName: tutor?.name || "Tutor",
                    verificationCode,
                  });
                  // Send notification after certificate is created
                  try {
                    const certLang = await getUserLang(storage, req.userId);
                    const certText = getNotifText("certificate_earned", certLang, { className: cls.title });
                    const notif = await storage.createNotification({
                      userId: req.userId,
                      type: "system",
                      title: certText.title,
                      message: certText.message,
                      link: "/student-dashboard",
                    });
                    broadcastToUser(req.userId, { type: "notification", payload: notif });
                  } catch (err: any) {
                    console.error("Error sending notification:", err.message);
                  }
                }
              });
            }
          }
        } catch {}
      }

      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // MARK ALL NOTIFICATIONS READ
  app.patch("/api/notifications/read-all", authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // UNREAD NOTIFICATION COUNT
  app.get("/api/notifications/unread-count", authMiddleware, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.userId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // CONTACT FORM
  app.post("/api/contact", contactRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      const submission = await storage.createContactSubmission({ name, email, subject, message });
      res.status(201).json(submission);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ADMIN CONTACT FORM — dedicated endpoint for authenticated admin contact
  app.post("/api/contact-admin", authMiddleware, contactRateLimit, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      const submission = await storage.createContactSubmission({
        name: user.name,
        email: user.email,
        subject: `[Admin Contact] ${subject}`,
        message,
      });
      res.status(201).json(submission);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SAFEGUARDING REPORT
  app.post("/api/report", optionalAuth, reportRateLimit, async (req: Request, res: Response) => {
    try {
      // #156: respect anonymous flag — never store identity when user opts for anonymity
      const isAnonymous = req.body.anonymous === true;
      req.body.reporterId = (!isAnonymous && req.userId) ? req.userId : null;
      const { reportType, targetType, targetId, description, reporterId } = req.body;
      if (!reportType || !targetType || !description) {
        return res.status(400).json({ message: "reportType, targetType, and description are required" });
      }
      const report = await storage.createSafeguardingReport({
        reporterId: reporterId || null,
        reportType,
        targetType,
        targetId: targetId ? Number(targetId) : null,
        description,
      });

      const coordinators = await db.select().from(users).where(eq(users.role, "coordinator"));
      for (const coord of coordinators) {
        const safeLang = await getUserLang(storage, coord.id);
        const safeText = getNotifText("safeguarding_report", safeLang, { reportType });
        const coordNotif = await storage.createNotification({
          userId: coord.id,
          type: "system",
          title: safeText.title,
          message: safeText.message,
          link: "/admin-dashboard?tab=reports",
        });
        broadcastToUser(coord.id, { type: "notification", payload: coordNotif });
      }

      res.status(201).json(report);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ADMIN ROUTES
  app.get("/api/admin/users", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/users/:id/verify", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      // Only allow verification (set to true), not toggle
      if (user.isVerified) {
        return res.status(400).json({ message: "User is already verified" });
      }
      // For tutors/coordinators: also clear isPendingApproval when verifying, to keep state consistent
      const patch: any = { isVerified: true };
      if (user.role === "tutor" || user.role === "coordinator") patch.isPendingApproval = false;
      const updated = await storage.updateUser(Number(req.params.id), patch);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/users/:id/block", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      const updated = await storage.updateUser(Number(req.params.id), { isBlocked: !user.isBlocked });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/users/:id/approve", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "tutor" && user.role !== "coordinator") return res.status(400).json({ message: "Only tutor and coordinator accounts require approval" });
      await storage.updateUser(Number(req.params.id), { isPendingApproval: false, isVerified: true });
      // Send approval email + in-app notification (fire-and-forget)
      const isCoord = user.role === "coordinator";
      sendTutorApprovedEmail(user.email, user.name).catch((err) => console.error("Email send failed:", err.message));
      const approveLang = await getUserLang(storage, user.id);
      const approveText = getNotifText(isCoord ? "coordinator_approved" : "tutor_approved", approveLang);
      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: approveText.title,
        message: approveText.message,
        link: isCoord ? "/admin" : "/teacher-dashboard",
      }).then((notif) => broadcastToUser(user.id, { type: "notification", payload: notif })).catch(() => {});
      res.json({ success: true, message: `${isCoord ? "Coordinator" : "Tutor"} approved` });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/admin/users/:id/reject", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "tutor" && user.role !== "coordinator") return res.status(400).json({ message: "Only tutor and coordinator accounts can be rejected" });
      // Mark as blocked so they can't re-login without coordinator intervention
      await storage.updateUser(Number(req.params.id), { isPendingApproval: false, isBlocked: true });
      sendTutorRejectedEmail(user.email, user.name, reason).catch((err) => console.error("Email send failed:", err.message));
      res.json({ success: true, message: "Tutor application rejected" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/classes", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await storage.getClasses();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/classes/:id", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteClass(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/reports", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const reports = await storage.getSafeguardingReports();
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/reports/:id", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const { status, adminNotes } = req.body;
      if (!status) return res.status(400).json({ message: "status is required" });
      const VALID_STATUSES = ["pending", "investigating", "resolved", "dismissed"];
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status. Must be one of: " + VALID_STATUSES.join(", ") });
      const updated = await storage.updateReportStatus(Number(req.params.id), status, req.userId, adminNotes);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ADMIN - Bulk/targeted notifications
  app.post("/api/admin/notify", coordinatorMiddleware, async (req, res) => {
    try {
      const { title, message, type = "system", recipients = "all" } = req.body;
      if (!title || !message) return res.status(400).json({ message: "title and message required" });
      const allUsers = await storage.getAllUsers();
      const NOTIFY_RATE_LIMIT = 2000; // max users per notification request
      const targets = allUsers.filter((u) => {
        if (recipients === "all") return true;
        if (recipients === "students") return u.role === "student";
        if (recipients === "tutors") return u.role === "tutor";
        if (recipients.startsWith("orphanage:")) {
          const org = recipients.slice("orphanage:".length).trim().toLowerCase();
          return (u.orphanage || u.organization || "").toLowerCase().includes(org);
        }
        return true;
      });
      const limited = targets.slice(0, NOTIFY_RATE_LIMIT);
      // #91: use allSettled so one failed delivery doesn't abort the rest
      const results = await Promise.allSettled(
        limited.map((u) =>
          storage.createNotification({ userId: u.id, type, title, message, link: null })
            .then((notif) => { broadcastToUser(u.id, { type: "notification", payload: notif }); return notif; })
        )
      );
      const sent   = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      res.json({ sent, failed });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // COORDINATOR WEEKLY DIGEST — manual trigger + auto weekly schedule
  async function sendDigestToCoordinators() {
    if (!process.env.SMTP_USER) return;
    try {
      const allUsers = await storage.getAllUsers();
      const coordinators = allUsers.filter((u) => u.role === "coordinator");
      const stats = await storage.getDashboardStats(0, "coordinator");
      for (const coord of coordinators) {
        await sendWeeklyDigestEmail(coord.email, coord.name, {
          newEnrollments: (stats as any).weeklyEnrollments ?? (stats as any).totalEnrollments ?? 0,
          completedCourses: (stats as any).completedCourses ?? 0,
          activeTutors: (stats as any).totalTutors ?? 0,
          newStudents: (stats as any).newStudents ?? (stats as any).totalStudents ?? 0,
          orphanage: coord.organization || coord.orphanage || undefined,
        });
      }
    } catch (err) {
      console.error("Digest send error:", err);
    }
  }

  app.post("/api/admin/digest", coordinatorMiddleware, async (_req: Request, res: Response) => {
    try {
      await sendDigestToCoordinators();
      res.json({ message: "Weekly digest sent to all coordinators." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/bookings — all platform bookings for analytics
  app.get("/api/admin/bookings", coordinatorMiddleware, async (_req: Request, res: Response) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/admin/users/:id/role — change user role
  app.patch("/api/admin/users/:id/role", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      if (!['student', 'tutor', 'coordinator'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be student, tutor, or coordinator." });
      }
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      // Cascade: if tutor is being demoted to student, cancel their active classes
      if (user.role === "tutor" && role === "student") {
        await db.update(classes)
          .set({ status: "cancelled" } as any)
          .where(and(eq(classes.tutorId, user.id), eq(classes.status, "active")));
      }
      await storage.updateUser(Number(req.params.id), { role: role as any });
      res.json({ success: true, message: `Role updated to ${role}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/admin/users/:id — delete user account
  app.delete("/api/admin/users/:id", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === 'coordinator') return res.status(403).json({ message: "Cannot delete coordinator accounts." });
      await storage.softDeleteUser(userId);
      res.json({ success: true, message: "User account deleted." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/admin/discussions/:id — admin delete any discussion
  app.delete("/api/admin/discussions/:id", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteDiscussion(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/quizzes — all quizzes for content moderation
  app.get("/api/admin/quizzes", coordinatorMiddleware, async (_req: Request, res: Response) => {
    try {
      const result = await db.select().from(quizzes).orderBy(desc(quizzes.id));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/admin/quizzes/:id — coordinator removes a quiz (cascades quiz results)
  app.delete("/api/admin/quizzes/:id", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const quizId = Number(req.params.id);
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      // Cascade: delete all quiz results before deleting the quiz
      await db.delete(quizResults).where(eq(quizResults.quizId, quizId));
      await db.delete(quizzes).where(eq(quizzes.id, quizId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/contact-submissions — all contact form submissions
  app.get("/api/admin/contact-submissions", coordinatorMiddleware, async (_req: Request, res: Response) => {
    try {
      const submissions = await db
        .select()
        .from(contactSubmissions)
        .orderBy(desc(contactSubmissions.createdAt));
      res.json(submissions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/notifications — recent platform-wide notifications
  app.get("/api/admin/notifications", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const notifs = await storage.getAllNotifications(limit);
      res.json(notifs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/test-email — send a test email to the coordinator's own address
  app.get("/api/admin/test-email", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const result = await testEmailConnection(user.email);
      if (result.ok) {
        return res.json({ configured: true, message: `Test email sent to ${user.email} — check your inbox.` });
      }
      if (!process.env.SMTP_USER) {
        return res.status(503).json({ configured: false, message: result.error });
      }
      return res.status(500).json({ configured: true, error: result.error, message: "Credentials found but send failed — check SMTP_PASS and that Gmail App Password (not your regular password) is used." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/test-zoom — verify Zoom credentials can obtain an access token
  app.get("/api/admin/test-zoom", coordinatorMiddleware, async (_req: Request, res: Response) => {
    try {
      const result = await testZoomCredentials();
      if (result.ok) {
        return res.json({ configured: true, message: "Zoom credentials verified — access token obtained successfully." });
      }
      if (!process.env.ZOOM_ACCOUNT_ID) {
        return res.status(503).json({ configured: false, message: result.error });
      }
      return res.status(500).json({ configured: true, error: result.error, message: "Zoom credentials found but authentication failed — check your Server-to-Server OAuth app on marketplace.zoom.us." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Auto-send weekly digest every Monday at 9am — first fire aligned to next Monday 9am
  weeklyDigestTimeoutId = setTimeout(() => {
    sendDigestToCoordinators();
    weeklyDigestIntervalId = setInterval(sendDigestToCoordinators, 7 * 24 * 60 * 60 * 1000);
  }, msUntilNextMondayAt9am());

  // #178: PUBLIC STATS — no auth needed; used by home page hero
  // DASHBOARD
  app.get("/api/dashboard/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const stats = await storage.getDashboardStats(user.id, user.role);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/activity", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const result = await storage.getRecentActivity(limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET single quiz by ID
  app.get("/api/quizzes/:id", authMiddleware, async (req, res) => {
    try {
      const result = await db.select().from(quizzes).where(eq(quizzes.id, Number(req.params.id)));
      if (!result[0]) return res.status(404).json({ message: "Quiz not found" });
      
      const quiz = result[0];
      if (!quiz.classId) return res.status(404).json({ message: "Quiz not found" });
      
      const cls = await storage.getClass(quiz.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      // Check if user is owner or enrolled
      const isOwner = cls.tutorId === req.userId;
      const isEnrolled = await db.select().from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, quiz.classId), ne(bookings.status, "cancelled")))
        .limit(1);
      
      if (!isOwner && !isEnrolled[0]) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Strip correct answers for non-owners
      if (!isOwner && quiz.questions && Array.isArray(quiz.questions)) {
        const safeQuiz = {
          ...quiz,
          questions: (quiz.questions as any[]).map((q: any) => {
            const { correctAnswer, ...rest } = q;
            return rest;
          })
        };
        res.json(safeQuiz);
      } else {
        res.json(quiz);
      }
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET assignments for current student across all enrolled classes (with submission status)
  app.get("/api/assignments/for-student", authMiddleware, async (req, res) => {
    try {
      const studentId = req.userId;
      // Get all classes the student is enrolled in
      const enrolledBookings = await db.select({ classId: bookings.classId })
        .from(bookings)
        .where(and(
          eq(bookings.studentId, studentId),
          ne(bookings.status, "cancelled"),
          ne(bookings.status, "no-show")
        ));
      const enrolledClassIds = Array.from(new Set(
        enrolledBookings.map((b: any) => b.classId).filter(Boolean)
      )) as number[];
      if (!enrolledClassIds.length) return res.json([]);
      // Get all assignments for those classes
      const classAssignments = await db.select().from(assignments)
        .where(inArray(assignments.classId, enrolledClassIds))
        .orderBy(desc(assignments.id));
      if (!classAssignments.length) return res.json([]);
      // Get student's submissions for these assignments
      const assignmentIds = classAssignments.map((a: any) => a.id);
      const mySubmissions = await db.select({
        assignmentId: assignmentSubmissions.assignmentId,
        grade: assignmentSubmissions.grade,
        feedback: assignmentSubmissions.feedback,
        submittedAt: assignmentSubmissions.submittedAt,
        fileUrl: assignmentSubmissions.fileUrl,
      }).from(assignmentSubmissions)
        .where(and(
          inArray(assignmentSubmissions.assignmentId, assignmentIds),
          eq(assignmentSubmissions.studentId, studentId)
        ));
      const submissionMap = new Map<number, any>(mySubmissions.map((s: any) => [s.assignmentId, s]));
      const result = classAssignments.map((a: any) => {
        const sub = submissionMap.get(a.id);
        return {
          ...a,
          submitted: !!sub,
          submittedAt: sub?.submittedAt || null,
          grade: sub?.grade ?? null,
          feedback: sub?.feedback || null,
          submittedFileUrl: sub?.fileUrl || null,
          isOverdue: a.dueDate ? new Date() > new Date(a.dueDate) : false,
        };
      });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET single assignment by ID
  app.get("/api/assignments/:id", authMiddleware, async (req, res) => {
    try {
      const result = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!result[0]) return res.status(404).json({ message: "Assignment not found" });
      
      const assignment = result[0];
      if (!assignment.classId) return res.status(404).json({ message: "Assignment not found" });
      
      const cls = await storage.getClass(assignment.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      // Check if user is owner or enrolled
      const isOwner = cls.tutorId === req.userId;
      const isEnrolled = await db.select().from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, assignment.classId), ne(bookings.status, "cancelled")))
        .limit(1);
      
      if (!isOwner && !isEnrolled[0]) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(assignment);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // #163: GLOBAL SEARCH — lessons, quizzes, assignments
  app.get("/api/search", authMiddleware, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q || q.length < 2) return res.json({ lessons: [], quizzes: [], assignments: [] });
      const pattern = `%${q}%`;
      const orOp = or;
      const ilikeOp = ilike;

      // Get user info to determine role
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      let classFilter;
      if (user.role === "tutor") {
        // Tutors can only search their own classes
        const myClasses = await db.select({ id: classes.id }).from(classes).where(eq(classes.tutorId, req.userId));
        classFilter = myClasses.map(c => c.id);
      } else {
        // Students can only search classes they're enrolled in
        const myBookings = await db.select({ classId: bookings.classId }).from(bookings).where(and(eq(bookings.studentId, req.userId), ne(bookings.status, "cancelled")));
        classFilter = myBookings.map(b => b.classId);
      }

      if (classFilter.length === 0) {
        return res.json({ lessons: [], quizzes: [], assignments: [] });
      }

      const [lessonResults, quizResults2, assignmentResults] = await Promise.all([
        db.select({ id: lessons.id, title: lessons.title, description: lessons.description, classId: lessons.classId, tutorId: lessons.tutorId })
          .from(lessons)
          .where(and(
            inArray(lessons.classId, classFilter),
            orOp(ilikeOp(lessons.title, pattern), ilikeOp(lessons.description, pattern))
          ))
          .limit(10),
        db.select({ id: quizzes.id, title: quizzes.title, description: quizzes.description, classId: quizzes.classId })
          .from(quizzes)
          .where(and(
            inArray(quizzes.classId, classFilter),
            orOp(ilikeOp(quizzes.title, pattern), ilikeOp(quizzes.description, pattern))
          ))
          .limit(10),
        db.select({ id: assignments.id, title: assignments.title, description: assignments.description, classId: assignments.classId })
          .from(assignments)
          .where(and(
            inArray(assignments.classId, classFilter),
            orOp(ilikeOp(assignments.title, pattern), ilikeOp(assignments.description, pattern))
          ))
          .limit(10),
      ]);

      res.json({ lessons: lessonResults, quizzes: quizResults2, assignments: assignmentResults });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // LESSONS
  app.get("/api/lessons", authMiddleware, async (req, res) => {
    try {
      const { classId } = req.query;
      let result;
      
      if (classId) {
        // Check if user is owner or enrolled in the class
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        
        const isOwner = cls.tutorId === req.userId;
        const isEnrolled = await db.select().from(bookings)
          .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
          .limit(1);
        
        if (!isOwner && !isEnrolled[0]) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        result = await db.select().from(lessons).where(eq(lessons.classId, Number(classId)));
      } else {
        // Only return user's own lessons when no classId specified
        result = await db.select().from(lessons).where(eq(lessons.tutorId, req.userId));
      }
      
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/lessons", authMiddleware, async (req, res) => {
    try {
      const parsed = insertLessonSchema.safeParse({
        ...req.body,
        tutorId: req.userId,
        duration: req.body.duration ? Number(req.body.duration) : undefined,
        classId: req.body.classId ? Number(req.body.classId) : null,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: true, message: parsed.error.errors[0]?.message || "Invalid input", code: "VALIDATION_ERROR" });
      }
      const { title, description, content, duration, difficulty, classId, sections, attachments } = req.body;
      // Ownership check: only the class tutor can add lessons
      if (classId) {
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Not your class" });
      }
      const [lesson] = await db.insert(lessons).values({
        title, description, content, duration: Number(duration) || 30,
        difficulty: difficulty || "beginner",
        classId: Number(classId),
        tutorId: req.userId,
        sections: sections || [],
        ...(attachments !== undefined && { attachments }),
      }).returning();
      // Auto-ingest into RAG vector store (fire-and-forget)
      import("./rag/ingest.js").then(({ ingestLesson }) =>
        ingestLesson(lesson.id).catch((e: any) => console.error("RAG ingest failed:", e.message))
      );
      res.status(201).json(lesson);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/lessons/:id", authMiddleware, async (req, res) => {
    try {
      const result = await db.select().from(lessons).where(eq(lessons.id, Number(req.params.id)));
      if (!result[0]) return res.status(404).json({ message: "Lesson not found" });
      
      const lesson = result[0];
      if (!lesson.classId) return res.status(404).json({ message: "Lesson not found" });
      
      const cls = await storage.getClass(lesson.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      // Check if user is owner or enrolled
      const isOwner = cls.tutorId === req.userId;
      const isEnrolled = await db.select().from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, lesson.classId), ne(bookings.status, "cancelled")))
        .limit(1);
      
      if (!isOwner && !isEnrolled[0]) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(lesson);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/lessons/:id", authMiddleware, async (req, res) => {
    try {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, Number(req.params.id)));
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      // Verify tutor owns the class that this lesson belongs to (not just the tutorId on the lesson record)
      const [parentClass] = lesson.classId
        ? await db.select({ tutorId: classes.tutorId }).from(classes).where(eq(classes.id, lesson.classId))
        : [{ tutorId: lesson.tutorId }];
      if (!parentClass || parentClass.tutorId !== req.userId) return res.status(403).json({ message: "Only the class owner can edit its lessons" });
      const { title, description, content, duration, difficulty, sections } = req.body;
      const [updated] = await db.update(lessons).set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(difficulty !== undefined && { difficulty }),
        ...(sections !== undefined && { sections }),
      }).where(eq(lessons.id, Number(req.params.id))).returning();
      // Re-ingest updated lesson into RAG (fire-and-forget)
      import("./rag/ingest.js").then(({ ingestLesson }) =>
        ingestLesson(Number(req.params.id)).catch((e: any) => console.error("RAG re-ingest failed:", e.message))
      );
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/lessons/:id", authMiddleware, async (req, res) => {
    try {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, Number(req.params.id)));
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      if (lesson.tutorId !== req.userId) return res.status(403).json({ message: "Only the lesson owner can delete it" });
      await db.delete(lessons).where(eq(lessons.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // QUIZZES
  app.get("/api/quizzes", authMiddleware, async (req, res) => {
    try {
      const { classId } = req.query;
      let result;
      
      if (classId) {
        // Check if user is owner or enrolled in the class
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        
        const isOwner = cls.tutorId === req.userId;
        const isEnrolled = await db.select().from(bookings)
          .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
          .limit(1);
        
        if (!isOwner && !isEnrolled[0]) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        result = await db.select().from(quizzes).where(eq(quizzes.classId, Number(classId)));
        
        // Strip correct answers for non-owners
        if (!isOwner) {
          result = result.map(quiz => ({
            ...quiz,
            questions: quiz.questions && Array.isArray(quiz.questions) 
              ? (quiz.questions as any[]).map((q: any) => {
                  const { correctAnswer, ...rest } = q;
                  return rest;
                })
              : quiz.questions
          }));
        }
      } else {
        // Only return user's own quizzes when no classId specified
        result = await db.select().from(quizzes).where(eq(quizzes.tutorId, req.userId));
      }
      
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/quizzes", authMiddleware, async (req, res) => {
    try {
      const parsed = insertQuizSchema.safeParse({
        ...req.body,
        tutorId: req.userId,
        classId: req.body.classId ? Number(req.body.classId) : null,
        passingScore: req.body.passingScore ? Number(req.body.passingScore) : undefined,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: true, message: parsed.error.errors[0]?.message || "Invalid input", code: "VALIDATION_ERROR" });
      }
      const { title, description, questions, timeLimit, passingScore, classId, maxAttempts } = req.body;
      // #9: Validate quiz question structure before storing
      const parsedQuestions = typeof questions === "string" ? (() => { try { return JSON.parse(questions); } catch { return null; } })() : questions;
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        return res.status(400).json({ message: "questions must be a non-empty array" });
      }
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        if (!q || typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswer !== "number") {
          return res.status(400).json({ message: `Question ${i + 1} is malformed — must have question, options (≥2), and correctAnswer` });
        }
      }
      // Ownership check: only the class tutor can add quizzes
      if (classId) {
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Not your class" });
      }
      const [quiz] = await db.insert(quizzes).values({
        title, description,
        questions: typeof questions === "string" ? questions : JSON.stringify(questions),
        timeLimit: timeLimit ? Number(timeLimit) : null,
        passingScore: Number(passingScore) || 70,
        classId: classId ? Number(classId) : null,
        tutorId: req.userId,
        maxAttempts: maxAttempts ? Number(maxAttempts) : null,
      }).returning();
      res.status(201).json(quiz);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/quizzes/:id", authMiddleware, async (req, res) => {
    try {
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, Number(req.params.id)));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      if (quiz.tutorId !== req.userId) return res.status(403).json({ message: "Only the quiz owner can edit it" });
      const { title, description, questions, timeLimit, passingScore, maxAttempts } = req.body;
      const [updated] = await db.update(quizzes).set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(questions !== undefined && { questions: typeof questions === "string" ? questions : JSON.stringify(questions) }),
        ...(timeLimit !== undefined && { timeLimit: timeLimit ? Number(timeLimit) : null }),
        ...(passingScore !== undefined && { passingScore: Number(passingScore) }),
        ...(maxAttempts !== undefined && { maxAttempts: maxAttempts ? Number(maxAttempts) : null }),
      }).where(eq(quizzes.id, Number(req.params.id))).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/quizzes/:id", authMiddleware, async (req, res) => {
    try {
      const quizId = Number(req.params.id);
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      if (quiz.tutorId !== req.userId) return res.status(403).json({ message: "Only the quiz owner can delete it" });
      // Cascade delete quiz results before deleting quiz
      await db.delete(quizResults).where(eq(quizResults.quizId, quizId));
      await db.delete(quizzes).where(eq(quizzes.id, quizId));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ASSIGNMENTS
  app.get("/api/assignments", authMiddleware, async (req, res) => {
    try {
      const { classId } = req.query;
      let result;
      
      if (classId) {
        // Check if user is owner or enrolled in the class
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        
        const isOwner = cls.tutorId === req.userId;
        const isEnrolled = await db.select().from(bookings)
          .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
          .limit(1);
        
        if (!isOwner && !isEnrolled[0]) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        result = await db.select().from(assignments).where(eq(assignments.classId, Number(classId)));
      } else {
        // Only return user's own assignments when no classId specified
        result = await db.select().from(assignments).where(eq(assignments.tutorId, req.userId));
      }
      
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/assignments", authMiddleware, async (req, res) => {
    try {
      const parsed = insertAssignmentSchema.safeParse({
        ...req.body,
        tutorId: req.userId,
        classId: req.body.classId ? Number(req.body.classId) : null,
        maxScore: req.body.maxScore ? Number(req.body.maxScore) : undefined,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: true, message: parsed.error.errors[0]?.message || "Invalid input", code: "VALIDATION_ERROR" });
      }
      const { title, description, instructions, dueDate, maxScore, classId, allowLateSubmission } = req.body;
      // Ownership check: only the class tutor can add assignments
      if (classId) {
        const cls = await storage.getClass(Number(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        if (cls.tutorId !== req.userId) return res.status(403).json({ message: "Not your class" });
      }
      const [assignment] = await db.insert(assignments).values({
        title, description, instructions,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: Number(maxScore) || 100,
        classId: classId ? Number(classId) : null,
        tutorId: req.userId,
        allowLateSubmission: allowLateSubmission !== undefined ? Boolean(allowLateSubmission) : true,
      }).returning();
      res.status(201).json(assignment);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/assignments/:id", authMiddleware, async (req, res) => {
    try {
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.tutorId !== req.userId) return res.status(403).json({ message: "Only the assignment owner can edit it" });
      const { title, description, instructions, dueDate, maxScore } = req.body;
      const [updated] = await db.update(assignments).set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(maxScore !== undefined && { maxScore: Number(maxScore) }),
      }).where(eq(assignments.id, Number(req.params.id))).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/assignments/:id", authMiddleware, async (req, res) => {
    try {
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.tutorId !== req.userId) return res.status(403).json({ message: "Only the assignment owner can delete it" });
      await db.delete(assignments).where(eq(assignments.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/assignments/:id/grade", authMiddleware, gradeRateLimit, async (req, res) => { // #12
    try {
      const { submissionId, grade, feedback } = req.body;
      // Verify the requester owns this assignment
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.tutorId !== req.userId) {
        return res.status(403).json({ message: "Only the assignment owner can grade submissions" });
      }
      const numGrade = Number(grade);
      const maxScore = assignment.maxScore ?? 100;
      if (isNaN(numGrade) || numGrade < 0 || numGrade > maxScore) {
        return res.status(400).json({ message: `Grade must be between 0 and ${maxScore}` });
      }
      const [updated] = await db.update(assignmentSubmissions)
        .set({ grade: numGrade, feedback, gradedAt: new Date() })
        .where(and(
          eq(assignmentSubmissions.id, Number(submissionId)),
          eq(assignmentSubmissions.assignmentId, Number(req.params.id))
        ))
        .returning();
      if (!updated) return res.status(404).json({ message: "Submission not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // NOTES
  app.get("/api/notes", authMiddleware, async (req, res) => {
    try {
      const { classId } = req.query;
      const whereClause = classId
        ? and(eq(notes.userId, req.userId), eq(notes.classId, Number(classId)))
        : eq(notes.userId, req.userId);
      const result = await db.select().from(notes).where(whereClause);
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/notes", authMiddleware, async (req, res) => {
    try {
      const { content, topic, classId, tags } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });
      const [note] = await db.insert(notes).values({
        userId: req.userId,
        content, topic,
        classId: classId ? Number(classId) : null,
        tags: tags || [],
      }).returning();
      res.status(201).json(note);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
    try {
      await db.delete(notes).where(and(eq(notes.id, Number(req.params.id)), eq(notes.userId, req.userId)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI CHAT - Study Buddy
  app.post("/api/ai/chat", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const { message, classTitle, conversationHistory } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      if (message.length > 2000) return res.status(400).json({ message: "Message too long (max 2000 chars)" });
      const messages: any[] = [
        {
          role: "system",
          content: `You are a helpful AI Study Buddy for TutorBridge, a peer tutoring platform for orphanages.
You are helping a student studying: "${classTitle || "their course"}".
Be encouraging, patient, use simple language, and give clear educational explanations.
Keep responses concise (under 200 words) unless asked for more detail.`
        },
        ...(conversationHistory || []).filter((m: any) => m.role === "user" || m.role === "assistant").slice(-8),
        { role: "user", content: message }
      ];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 400,
        temperature: 0.7,
      });
      const reply = completion.choices[0]?.message?.content || "I apologize, I could not generate a response.";
      res.json({ reply });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - RAG Chat (answers from lesson content stored in Pinecone)
  app.post("/api/ai/rag-chat", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      return res.status(503).json({ message: "RAG_NOT_CONFIGURED" });
    }
    try {
      const { message, classId, history } = req.body;
      console.log(`[RAG] Incoming request: classId=${classId}, message="${message?.slice(0, 50)}"`);
      if (!message) return res.status(400).json({ message: "Message required" });
      if (message.length > 2000) return res.status(400).json({ message: "Message too long (max 2000 chars)" });
      const safeHistory = Array.isArray(history)
        ? (history as any[]).filter((m: any) => m.role === "user" || m.role === "assistant").slice(-8)
        : [];
      const { ragChat } = await import("./rag/chain.js");
      const result = await ragChat(message, safeHistory, classId ? Number(classId) : undefined);
      res.json({ answer: result.answer, sources: result.sources });
    } catch (err: any) {
      if (err.message === "RAG_NOT_CONFIGURED") {
        return res.status(503).json({ message: "RAG_NOT_CONFIGURED" });
      }
      console.error("RAG chat error:", err.message);
      res.status(502).json({ message: "AI service error. Please try again." });
    }
  });

  // AI - RAG Ingest All (admin/coordinator only — populates Pinecone with all existing lessons)
  app.post("/api/ai/rag-ingest", authMiddleware, async (req, res) => {
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      return res.status(503).json({ message: "RAG ingestion requires OPENAI_API_KEY, PINECONE_API_KEY, and PINECONE_INDEX." });
    }
    try {
      const { ingestAll } = await import("./rag/ingest.js");
      // Run in background so we can respond immediately
      ingestAll().catch((e: any) => console.error("[RAG] Bulk ingest error:", e.message));
      res.json({ message: "RAG ingestion started. Check server logs for progress." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // AI - Lesson Plan Generator
  app.post("/api/ai/lesson-plan", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const { topic, duration, difficulty } = req.body;
      if (!topic) return res.status(400).json({ message: "Topic required" });
      if (topic.length > 500) return res.status(400).json({ message: "Topic too long (max 500 chars)" });
      const mins = Number(duration) || 60;
      const level = difficulty || "intermediate";
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Create a lesson plan for: "${topic}". Duration: ${mins} minutes. Level: ${level}. Audience: orphanage students aged 10-18.
Return ONLY valid JSON matching this exact shape:
{
  "title": string,
  "duration": ${mins},
  "objectives": [string, string, string, string],
  "materials": [string, string, string, string, string],
  "activities": [{ "name": string, "duration": number, "description": string }],
  "assessment": [string, string, string, string]
}
activities should sum roughly to ${mins} minutes total. Return only the JSON object, no extra text.`
        }],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });
      let plan;
      try { plan = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      res.json(plan);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - Skill Gap Detector
  app.post("/api/ai/skill-gap", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const userId = req.userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const skillsList: string[] = req.body.skills || user?.skillsLearning || [];
      if (!skillsList.length) return res.status(400).json({ message: "No skills to analyze. Add skills to your profile first." });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Analyze skill gaps for a student who wants to learn: ${skillsList.slice(0, 6).join(", ")}.
Return ONLY valid JSON:
{
  "skills": [{ "name": string, "level": number (20-85), "target": number (75-95), "gap": number, "status": "strong"|"developing"|"needs-focus" }],
  "studyPlan": string
}
Include one entry per skill. Set gap = target - level. Status: strong if gap<10, developing if gap<25, needs-focus if gap>=25.`
        }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      });
      let result;
      try { result = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - Class Summary Generator
  app.post("/api/ai/summarize", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const { classTitle } = req.body;
      if (!classTitle) return res.status(400).json({ message: "classTitle required" });
      if (classTitle.length > 200) return res.status(400).json({ message: "classTitle too long (max 200 chars)" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate a study summary for a class titled: "${classTitle}".
Return ONLY valid JSON:
{
  "keyPoints": [string, string, string, string],
  "takeaways": [string, string, string],
  "practiceQuestions": [string, string, string, string],
  "nextSteps": [string, string, string, string]
}
Make content relevant to the class topic and educational for students aged 10-18.`
        }],
        max_tokens: 900,
        response_format: { type: "json_object" },
      });
      let result;
      try { result = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - Quiz Generator
  app.post("/api/ai/quiz-generate", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const { topic, difficulty, questionCount } = req.body;
      if (!topic) return res.status(400).json({ message: "Topic required" });
      const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate ${count} multiple-choice questions about: "${topic}". Difficulty: ${difficulty || "medium"}.
Return JSON: { questions: [{ id, question, options: [string, string, string, string], correctAnswer: 0-3, points: 1, explanation: string }] }`
        }],
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });
      let result;
      try { result = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      const requested = count;
      const returned = Array.isArray(result.questions) ? result.questions.length : 0;
      if (returned !== requested) {
        console.warn(`[ai/quiz-generate] Requested ${requested} questions, AI returned ${returned}`);
      }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - Profile Optimizer (for tutors)
  app.post("/api/ai/profile-tips", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const userId = req.userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      const userClasses = await db.select().from(classes).where(eq(classes.tutorId, userId));
      const userBookings = await db.select().from(bookings).where(eq(bookings.tutorId, userId));
      const profile = {
        name: user.name,
        bio: user.bio || "",
        skillsTaught: user.skillsTaught || [],
        classCount: userClasses.length,
        hasPhoto: !!user.avatar,
        bookingCount: userBookings.length,
      };
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Analyze this tutor's profile and give actionable optimization tips.
Profile: ${JSON.stringify(profile)}
Return ONLY valid JSON:
{
  "tips": [{ "tip": string, "detail": string, "priority": "High Priority"|"Medium"|"Suggestion", "icon": "lightbulb"|"camera"|"book"|"star"|"target" }],
  "overallScore": number (0-100),
  "summary": string
}
Give 3-5 tips. Be specific and encouraging. Focus on what would help them attract more students on a peer tutoring platform for orphanages.`
        }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      });
      let result;
      try { result = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // AI - Learning Path Suggestions (for students)
  app.post("/api/ai/learning-path", authMiddleware, aiRateLimit, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI features are not available: OPENAI_API_KEY is not configured." });
    }
    try {
      const userId = req.userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      const userBookings = await db.select({ classId: bookings.classId }).from(bookings).where(eq(bookings.studentId, userId));
      const enrolledIds = userBookings.map((b: any) => b.classId).filter(Boolean);
      let enrolledTitles: string[] = [];
      if (enrolledIds.length > 0) {
        const enrolled = await db.select({ title: classes.title, category: classes.category }).from(classes).where(inArray(classes.id, enrolledIds));
        enrolledTitles = enrolled.map((c: any) => `${c.title} (${c.category})`);
      }
      const skills = user.skillsLearning || [];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Create a personalized learning path for a student.
Skills they want to learn: ${skills.length ? skills.join(", ") : "not specified"}
Currently enrolled in: ${enrolledTitles.length ? enrolledTitles.join(", ") : "no courses yet"}
Return ONLY valid JSON:
{
  "suggestions": [{ "text": string, "suggestion": string, "category": string }],
  "summary": string
}
Give exactly 3 suggestions. Each "text" should describe their current progress context, "suggestion" should be the next recommended step, and "category" should be a course category to search for. Make suggestions specific and actionable for orphanage students aged 10-18.`
        }],
        max_tokens: 600,
        response_format: { type: "json_object" },
      });
      let result;
      try { result = JSON.parse(completion.choices[0]?.message?.content || "{}"); }
      catch { return res.status(502).json({ message: "AI returned an invalid response. Please try again." }); }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // QUIZ RESULTS - Student submits quiz
  app.post("/api/quiz-results", authMiddleware, async (req, res) => {
    try {
      const { quizId, answers, score, passed } = req.body;
      if (!quizId) return res.status(400).json({ message: "quizId required" });
      // Enforce maxAttempts if set on the quiz
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, Number(quizId)));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      // Enrollment check
      if (quiz.classId) {
        const userBookings = await storage.getBookings(req.userId);
        const isEnrolled = userBookings.some((b: any) => b.classId === quiz.classId && !["cancelled", "no-show"].includes(b.status));
        if (!isEnrolled) return res.status(403).json({ message: "Not enrolled in this class" });
      }
      if (quiz?.maxAttempts) {
        const existing = await db.select().from(quizResults)
          .where(and(eq(quizResults.quizId, Number(quizId)), eq(quizResults.studentId, req.userId)));
        if (existing.length >= quiz.maxAttempts) {
          return res.status(403).json({
            message: `You have reached the maximum number of attempts (${quiz.maxAttempts}) for this quiz.`,
            attemptsUsed: existing.length,
            maxAttempts: quiz.maxAttempts,
          });
        }
      }
      // Server-side score calculation - ignore client-supplied score/passed
      let parsedAnswers;
      try {
        parsedAnswers = typeof answers === "string" ? JSON.parse(answers) : answers;
      } catch {
        return res.status(400).json({ message: "Invalid answers format" });
      }
      
      // Fetch quiz questions to calculate score
      const questions = typeof quiz.questions === "string" ? JSON.parse(quiz.questions) : quiz.questions;
      const computedScore = questions.reduce((score: number, q: any, i: number) => {
        return parsedAnswers[i] === q.correctAnswer ? score + (q.points || 1) : score;
      }, 0);
      const totalPoints = questions.reduce((total: number, q: any) => total + (q.points || 1), 0);
      const scorePercent = totalPoints > 0 ? Math.round((computedScore / totalPoints) * 100) : 0;
      const computedPassed = scorePercent >= (quiz.passingScore || 70);

      const [result] = await db.insert(quizResults).values({
        quizId: Number(quizId),
        studentId: req.userId,
        score: scorePercent,
        answers: typeof answers === "string" ? answers : JSON.stringify(answers),
        passed: computedPassed,
      }).returning();
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/quiz-results/quiz/:quizId", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, Number(req.params.quizId))).limit(1);
      if (!quiz) return res.status(404).json({ error: true, message: "Quiz not found" });
      if (quiz.tutorId !== userId && user?.role !== "coordinator") {
        return res.status(403).json({ error: true, message: "Forbidden" });
      }
      const result = await db.select().from(quizResults)
        .where(eq(quizResults.quizId, Number(req.params.quizId)));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Batch endpoint: all quiz results for all quizzes owned by the current tutor
  app.get("/api/quiz-results/my-quizzes", authMiddleware, async (req, res) => {
    try {
      const tutorId = req.userId;
      // Get all quizzes belonging to this tutor
      const tutorQuizzes = await db.select({ id: quizzes.id, title: quizzes.title, classId: quizzes.classId })
        .from(quizzes)
        .where(eq(quizzes.tutorId, tutorId));
      if (!tutorQuizzes.length) return res.json([]);
      const quizIds = tutorQuizzes.map((q: any) => q.id);
      const quizMap = new Map<number, any>(tutorQuizzes.map((q: any) => [q.id, q]));
      const results = await db.select().from(quizResults).where(inArray(quizResults.quizId, quizIds));
      // Fetch student names for all unique student IDs
      const studentIds = Array.from(new Set(results.map((r: any) => r.studentId)));
      let studentMap = new Map<number, string>();
      if (studentIds.length > 0) {
        const studentRows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, studentIds));
        studentRows.forEach((s: any) => studentMap.set(s.id, s.name));
      }
      const enriched = results.map((r: any) => ({
        ...r,
        quizTitle: quizMap.get(r.quizId)?.title,
        quizClassId: quizMap.get(r.quizId)?.classId,
        studentName: studentMap.get(r.studentId) || null,
      }));
      res.json(enriched);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/quiz-results/my/:quizId", authMiddleware, async (req, res) => {
    try {
      // and is already statically imported
      const result = await db.select().from(quizResults)
        .where(and(eq(quizResults.quizId, Number(req.params.quizId)), eq(quizResults.studentId, req.userId)));
      res.json(result[0] || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // All quiz results for the current student (joined with quiz title)
  app.get("/api/quiz-results/my", authMiddleware, async (req, res) => {
    try {
      const results = await db.select({
        id: quizResults.id,
        quizId: quizResults.quizId,
        score: quizResults.score,
        passed: quizResults.passed,
        answers: quizResults.answers,
        completedAt: quizResults.completedAt,
        quizTitle: quizzes.title,
        classId: quizzes.classId,
      })
        .from(quizResults)
        .leftJoin(quizzes, eq(quizResults.quizId, quizzes.id))
        .where(eq(quizResults.studentId, req.userId));
      res.json(results);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // All assignment submissions for the current student (joined with assignment title)
  app.get("/api/assignment-submissions/my", authMiddleware, async (req, res) => {
    try {
      const results = await db.select({
        id: assignmentSubmissions.id,
        assignmentId: assignmentSubmissions.assignmentId,
        content: assignmentSubmissions.content,
        fileUrl: assignmentSubmissions.fileUrl,
        grade: assignmentSubmissions.grade,
        feedback: assignmentSubmissions.feedback,
        submittedAt: assignmentSubmissions.submittedAt,
        gradedAt: assignmentSubmissions.gradedAt,
        assignmentTitle: assignments.title,
        classId: assignments.classId,
        dueDate: assignments.dueDate,
        maxScore: assignments.maxScore,
      })
        .from(assignmentSubmissions)
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(eq(assignmentSubmissions.studentId, req.userId));
      res.json(results);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Batch endpoint: all assignment submissions for all assignments owned by the current tutor
  app.get("/api/assignment-submissions/my-assignments", authMiddleware, async (req, res) => {
    try {
      const tutorId = req.userId;
      // Get all assignments belonging to this tutor
      const tutorAssignments = await db.select({ id: assignments.id, title: assignments.title, classId: assignments.classId })
        .from(assignments)
        .where(eq(assignments.tutorId, tutorId));
      if (!tutorAssignments.length) return res.json([]);
      const assignmentIds = tutorAssignments.map((a: any) => a.id);
      const assignmentMap = new Map<number, any>(tutorAssignments.map((a: any) => [a.id, a]));
      const results = await db
        .select({
          id: assignmentSubmissions.id,
          assignmentId: assignmentSubmissions.assignmentId,
          studentId: assignmentSubmissions.studentId,
          studentName: users.name, // #81: include student name for grading modal
          content: assignmentSubmissions.content,
          fileUrl: assignmentSubmissions.fileUrl,
          grade: assignmentSubmissions.grade,
          feedback: assignmentSubmissions.feedback,
          submittedAt: assignmentSubmissions.submittedAt,
          gradedAt: assignmentSubmissions.gradedAt,
        })
        .from(assignmentSubmissions)
        .leftJoin(users, eq(assignmentSubmissions.studentId, users.id))
        .where(inArray(assignmentSubmissions.assignmentId, assignmentIds));
      const enriched = results.map((s: any) => ({
        ...s,
        assignmentTitle: assignmentMap.get(s.assignmentId)?.title,
        assignmentClassId: assignmentMap.get(s.assignmentId)?.classId,
      }));
      res.json(enriched);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ASSIGNMENT SUBMISSIONS
  app.post("/api/assignment-submissions", authMiddleware, async (req, res) => {
    try {
      const { assignmentId, content, fileUrl } = req.body;
      if (!assignmentId || (!content?.trim() && !req.body.fileUrl)) return res.status(400).json({ message: "Either text content or a file attachment is required" });
      // Block duplicate submissions — only one submission per student per assignment
      const [existing] = await db
        .select({ id: assignmentSubmissions.id })
        .from(assignmentSubmissions)
        .where(and(
          eq(assignmentSubmissions.assignmentId, Number(assignmentId)),
          eq(assignmentSubmissions.studentId, req.userId)
        ))
        .limit(1);
      if (existing) {
        return res.status(400).json({ message: "You have already submitted this assignment." });
      }
      // Enforce late submission policy
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(assignmentId)));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      // Enrollment check
      if (assignment.classId) {
        const userBookings = await storage.getBookings(req.userId);
        const isEnrolled = userBookings.some((b: any) => b.classId === assignment.classId && !["cancelled", "no-show"].includes(b.status));
        if (!isEnrolled) return res.status(403).json({ message: "Not enrolled in this class" });
      }
      if (assignment?.dueDate && new Date() > new Date(assignment.dueDate) && assignment.allowLateSubmission === false) {
        return res.status(403).json({ message: "The deadline has passed and late submissions are not allowed for this assignment." });
      }
      const [submission] = await db.insert(assignmentSubmissions).values({
        assignmentId: Number(assignmentId),
        studentId: req.userId,
        content,
        fileUrl: fileUrl || null,
      }).returning();
      res.status(201).json(submission);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/assignment-submissions/assignment/:assignmentId", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.assignmentId))).limit(1);
      if (!assignment) return res.status(404).json({ error: true, message: "Assignment not found" });
      if (assignment.tutorId !== userId && user?.role !== "coordinator") {
        return res.status(403).json({ error: true, message: "Forbidden" });
      }
      const result = await db.select().from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.assignmentId, Number(req.params.assignmentId)));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/assignment-submissions/my/:assignmentId", authMiddleware, async (req, res) => {
    try {
      // and is already statically imported
      const result = await db.select().from(assignmentSubmissions)
        .where(and(eq(assignmentSubmissions.assignmentId, Number(req.params.assignmentId)), eq(assignmentSubmissions.studentId, req.userId)));
      res.json(result[0] || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Return assignment for revision — saves feedback and notifies student atomically
  app.patch("/api/assignment-submissions/:id/feedback", authMiddleware, async (req, res) => {
    try {
      const { feedback } = req.body;
      if (!feedback?.trim()) return res.status(400).json({ message: "feedback required" });
      // Verify the requester is the tutor who owns the assignment for this submission
      const [sub] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, Number(req.params.id)));
      if (!sub) return res.status(404).json({ message: "Submission not found" });
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, sub.assignmentId));
      if (!assignment || assignment.tutorId !== req.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      // Save feedback and notify student in a single atomic step
      const [updated] = await db.update(assignmentSubmissions)
        .set({ feedback })
        .where(eq(assignmentSubmissions.id, Number(req.params.id)))
        .returning();
      // Send in-app notification and message to student as part of the same operation
      try {
        const notif = await storage.createNotification({
          userId: sub.studentId,
          type: "assignment",
          title: `Assignment returned for revision`,
          message: `Your assignment "${assignment.title}" has been returned with feedback. Please review and resubmit.`,
          link: `/student-dashboard?tab=assignments`,
        });
        broadcastToUser(sub.studentId, { type: "notification", payload: notif });
        // Also send a direct message so the student sees the full feedback text
        await storage.createMessage({
          senderId: req.userId,
          receiverId: sub.studentId,
          content: `Your assignment "${assignment.title}" has been returned for revision.\n\nFeedback:\n${feedback}\n\nPlease revise and resubmit when ready.`,
        });
      } catch (notifErr: any) {
        console.warn("[feedback] Notification failed for submission", req.params.id, ":", notifErr.message);
      }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update grade route to send email
  app.post("/api/assignments/:id/grade-with-email", authMiddleware, gradeRateLimit, async (req, res) => { // #12
    try {
      const { submissionId, grade, feedback } = req.body;
      // Verify the requester owns this assignment
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, Number(req.params.id)));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.tutorId !== req.userId) {
        return res.status(403).json({ message: "Only the assignment owner can grade submissions" });
      }
      // Validate grade range against assignment's maxScore
      const numGrade = Number(grade);
      const maxScore = assignment.maxScore ?? 100;
      if (isNaN(numGrade) || numGrade < 0 || numGrade > maxScore) {
        return res.status(400).json({ message: `Grade must be between 0 and ${maxScore}` });
      }
      const [updated] = await db.update(assignmentSubmissions)
        .set({ grade: numGrade, feedback, gradedAt: new Date() })
        .where(eq(assignmentSubmissions.id, Number(submissionId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Submission not found" });
      // Send email to student — surface failure as warning flag instead of silently ignoring
      let emailSent = false;
      try {
        const student = await storage.getUser(updated.studentId);
        if (student?.email && assignment) {
          await sendAssignmentGradedEmail(student.email, student.name, assignment.title, numGrade, feedback || "");
          emailSent = true;
        }
      } catch (emailErr: any) {
        console.warn("[grade-with-email] Email failed for submission", submissionId, ":", emailErr.message);
      }
      res.json({ ...updated, emailSent });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // CERTIFICATES with verification UUID
  app.post("/api/certificates", authMiddleware, async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) {
        return res.status(400).json({ message: "classId is required" });
      }
      
      // Verify student has a completed booking for this class (prevents unearned certificates)
      const completedBooking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.studentId, req.userId),
          eq(bookings.classId, Number(classId)),
          eq(bookings.status, "completed"),
        ))
        .limit(1);
      if (completedBooking.length === 0) {
        return res.status(403).json({ message: "You must complete this course before receiving a certificate." });
      }
      
      // Check for duplicate certificate
      const existing = await db.select().from(certificates).where(and(eq(certificates.studentId, req.userId), eq(certificates.classId, Number(classId)))).limit(1);
      if (existing[0]) return res.json(existing[0]);
      
      // Get actual names from database (don't trust request body)
      const student = await storage.getUser(req.userId);
      const cls = await storage.getClass(Number(classId));
      const tutor = await storage.getUser(cls?.tutorId);
      
      if (!student || !cls || !tutor) {
        return res.status(404).json({ message: "Student, class, or tutor not found" });
      }
      
      const verificationCode = crypto.randomUUID();
      const [cert] = await db.insert(certificates).values({
        studentId: req.userId,
        classId: Number(classId),
        bookingId: completedBooking[0]?.id || null,
        studentName: student.name,
        courseName: cls.title,
        tutorName: tutor.name,
        verificationCode,
      }).returning();
      res.status(201).json(cert);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/certificates/verify/:code", async (req, res) => {
    try {
      const result = await db.select().from(certificates)
        .where(eq(certificates.verificationCode, req.params.code));
      if (!result[0]) return res.status(404).json({ message: "Certificate not found or invalid code" });
      res.json(result[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/certificates/my", authMiddleware, async (req, res) => {
    try {
      const result = await db.select().from(certificates)
        .where(eq(certificates.studentId, req.userId));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // FILE UPLOAD for assignment submissions
  app.post("/api/upload/assignment", authMiddleware, uploadRateLimit, upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      // Guard against path traversal
      const resolvedPath = path.resolve(uploadDir, req.file.filename);
      if (!resolvedPath.startsWith(path.resolve(uploadDir) + path.sep)) {
        fs.unlinkSync(resolvedPath);
        return res.status(400).json({ message: "Invalid file path" });
      }
      // #132: validate magic bytes against claimed MIME type to prevent MIME spoofing
      const magicMap: Record<string, number[][]> = {
        "application/pdf": [[0x25, 0x50, 0x44, 0x46]],          // %PDF
        "image/jpeg":      [[0xFF, 0xD8, 0xFF]],
        "image/png":       [[0x89, 0x50, 0x4E, 0x47]],
        "application/zip": [[0x50, 0x4B, 0x03, 0x04]],           // .zip / .docx
        "application/msword": [[0xD0, 0xCF, 0x11, 0xE0]],        // .doc
        "text/plain":      [],                                     // no magic bytes for plain text
      };
      const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const txtMime  = "text/plain";
      const mime     = req.file.mimetype;
      const magicSigs = magicMap[mime] ?? (mime === docxMime ? magicMap["application/zip"] : null);
      if (magicSigs && magicSigs.length > 0) {
        const buf = Buffer.alloc(8);
        const fd  = fs.openSync(resolvedPath, "r");
        fs.readSync(fd, buf, 0, 8, 0);
        fs.closeSync(fd);
        const matches = magicSigs.some((sig) => sig.every((b, i) => buf[i] === b));
        if (!matches && mime !== txtMime) {
          fs.unlinkSync(resolvedPath);
          return res.status(400).json({ message: "File content does not match the declared type." });
        }
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ fileUrl, filename: req.file.originalname, size: req.file.size });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GOOGLE OAUTH - Simplified implementation
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    }
    const redirectUri = `${req.protocol}://${req.headers.host}/api/auth/google/callback`;
    const scope = "openid email profile";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
    res.redirect(url);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      if (!code) return res.redirect("/?error=oauth_failed");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/?error=oauth_not_configured");
      const redirectUri = `${req.protocol}://${req.headers.host}/api/auth/google/callback`;

      // Exchange code for token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/?error=oauth_token_failed");

      // Get user info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userRes.json() as any;
      if (!googleUser.email) return res.redirect("/?error=oauth_no_email");

      // Find or create user
      let user = await storage.getUserByEmail(googleUser.email);
      if (user && user.isBlocked) {
        return res.redirect("/?error=account_suspended");
      }
      if (!user) {
        const randomPw = await bcrypt.hash(crypto.randomUUID(), 10);
        user = await storage.createUser({
          name: googleUser.name || googleUser.email.split("@")[0],
          email: googleUser.email,
          password: randomPw,
          role: "student",
          avatar: googleUser.picture || null,
          orphanage: null, organization: null, bio: null,
          skillsTaught: null, skillsLearning: null,
        });
        // Google has already verified this email — mark verified directly
        await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));
      }
      const token = generateToken(user.id, user.tokenVersion ?? 1);
      // Generate short-lived auth code (5 minutes) for secure token exchange
      const authCode = crypto.randomBytes(32).toString('hex');
      // Store code with token in memory (in production, use Redis)
      (global as any).authCodes = (global as any).authCodes || new Map();
      (global as any).authCodes.set(authCode, { token, expires: Date.now() + 5 * 60 * 1000 });
      res.redirect(`/?auth_code=${authCode}`);
    } catch (err: any) {
      res.redirect("/?error=oauth_error");
    }
  });

  // OAuth token exchange endpoint
  app.post("/api/auth/exchange-code", async (req: Request, res: Response) => {
    try {
      const { authCode } = req.body;
      if (!authCode) {
        return res.status(400).json({ message: "auth_code required" });
      }
      
      const authCodes = (global as any).authCodes || new Map();
      const codeData = authCodes.get(authCode);
      
      if (!codeData || Date.now() > codeData.expires) {
        authCodes.delete(authCode);
        return res.status(400).json({ message: "Invalid or expired auth code" });
      }
      
      // Clean up used code
      authCodes.delete(authCode);
      
      res.json({ token: codeData.token });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Clean up expired auth codes every 5 minutes
  setInterval(() => {
    const authCodes = (global as any).authCodes || new Map();
    const now = Date.now();
    for (const [code, data] of authCodes.entries()) {
      if (now > data.expires) {
        authCodes.delete(code);
      }
    }
  }, 5 * 60 * 1000);

  // DISCUSSIONS
  app.get("/api/classes/:classId/discussions", authMiddleware, async (req, res) => {
    try {
      const disc = discussions;
      const usersTable = users;
      const eqOp = eq;
      const descFn = desc;
      const result = await db.select({
        id: disc.id,
        classId: disc.classId,
        authorId: disc.authorId,
        authorName: usersTable.name,
        authorAvatar: usersTable.avatar,
        title: disc.title,
        content: disc.content,
        isPinned: disc.isPinned,
        replyCount: disc.replyCount,
        createdAt: disc.createdAt,
      })
        .from(disc)
        .leftJoin(usersTable, eqOp(disc.authorId, usersTable.id))
        .where(eqOp(disc.classId, Number(req.params.classId)))
        .orderBy(descFn(disc.isPinned), descFn(disc.createdAt));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/classes/:classId/discussions", authMiddleware, async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !content) return res.status(400).json({ message: "title and content required" });
      // #11: Enforce min/max length on discussion title and content
      if (title.length < 3 || title.length > 200) return res.status(400).json({ message: "title must be 3–200 characters" });
      if (content.length < 10 || content.length > 5000) return res.status(400).json({ message: "content must be 10–5000 characters" });
      // Verify user is the tutor or an enrolled (non-cancelled) student
      const cls = await storage.getClass(Number(req.params.classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      const userId = req.userId;
      if (cls.tutorId !== userId) {
        const enrolled = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(and(
            eq(bookings.studentId, userId),
            eq(bookings.classId, Number(req.params.classId)),
            ne(bookings.status, "cancelled"),
          ))
          .limit(1);
        if (enrolled.length === 0) {
          return res.status(403).json({ message: "You must be enrolled in this class to post a discussion." });
        }
      }
      const disc = discussions;
      const [discussion] = await db.insert(disc).values({
        classId: Number(req.params.classId),
        authorId: req.userId,
        title, content,
      }).returning();
      res.status(201).json(discussion);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/discussions/:id/replies", authMiddleware, async (req, res) => {
    try {
      const replies = discussionReplies;
      const usersTable = users;
      const eqOp = eq;
      const result = await db.select({
        id: replies.id,
        discussionId: replies.discussionId,
        authorId: replies.authorId,
        authorName: usersTable.name,
        authorAvatar: usersTable.avatar,
        content: replies.content,
        createdAt: replies.createdAt,
      })
        .from(replies)
        .leftJoin(usersTable, eqOp(replies.authorId, usersTable.id))
        .where(eqOp(replies.discussionId, Number(req.params.id)));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/discussions/:id/replies", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "content required" });
      if (content.length > 2000) return res.status(400).json({ message: "Reply must be under 2000 characters" });
      const replies = discussionReplies;
      const disc = discussions;
      const eqOp = eq;
      const sqlExpr = sql;
      // Verify user is the tutor or an enrolled student of the discussion's class
      const [parentDiscussion] = await db.select({ classId: disc.classId }).from(disc).where(eqOp(disc.id, Number(req.params.id)));
      if (!parentDiscussion) return res.status(404).json({ message: "Discussion not found" });
      const userId = req.userId;
      const parentClass = await storage.getClass(parentDiscussion.classId);
      if (parentClass && parentClass.tutorId !== userId) {
        const enrolled = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(and(
            eq(bookings.studentId, userId),
            eq(bookings.classId, parentDiscussion.classId),
            ne(bookings.status, "cancelled"),
          ))
          .limit(1);
        if (enrolled.length === 0) {
          return res.status(403).json({ message: "You must be enrolled in this class to reply." });
        }
      }
      const [reply] = await db.insert(replies).values({
        discussionId: Number(req.params.id),
        authorId: req.userId,
        content,
      }).returning();
      // Increment reply count
      await db.update(disc).set({ replyCount: sqlExpr`${disc.replyCount} + 1` })
        .where(eqOp(disc.id, Number(req.params.id)));
      // Notify the discussion author (if different from the replier)
      try {
        const [discussion] = await db.select().from(disc).where(eqOp(disc.id, Number(req.params.id)));
        if (discussion && discussion.authorId !== req.userId) {
          const replier = await storage.getUser(req.userId);
          const discLang = await getUserLang(storage, discussion.authorId);
          const discText = getNotifText("discussion_reply", discLang, { name: replier?.name || "Someone", discussionTitle: discussion.title });
          const notif = await storage.createNotification({
            userId: discussion.authorId,
            type: "system",
            title: discText.title,
            message: discText.message,
            link: `/classes/${discussion.classId}`,
          });
          broadcastToUser(discussion.authorId, { type: "notification", payload: notif });
        }
      } catch {}
      res.status(201).json(reply);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── PEER HELP BOARD ──────────────────────────────────────────────────────

  // Register as a peer helper for a topic in a class
  app.post("/api/peer-helpers", authMiddleware, async (req, res) => {
    try {
      const { classId, topic, quizScore } = req.body;
      if (!classId || !topic) return res.status(400).json({ message: "classId and topic required" });
      if (typeof topic !== "string" || topic.length > 200) return res.status(400).json({ message: "Topic must be under 200 characters" });
      const cls = await storage.getClass(Number(classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      // Must be enrolled in the class to register as helper
      const enrolled = await db.select({ id: bookings.id }).from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
        .limit(1);
      if (enrolled.length === 0) return res.status(403).json({ message: "You must be enrolled in this class" });
      const helper = await storage.createPeerHelper({ userId: req.userId, classId: Number(classId), topic: topic.trim(), quizScore: quizScore ? Number(quizScore) : undefined });
      res.status(201).json(helper);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Remove peer helper registration
  app.delete("/api/peer-helpers/:id", authMiddleware, async (req, res) => {
    try {
      await storage.deletePeerHelper(Number(req.params.id), req.userId);
      res.json({ message: "Removed" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // List peer helpers for a class
  app.get("/api/peer-helpers", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.query.classId);
      if (!classId) return res.status(400).json({ message: "classId required" });
      const helpers = await storage.getPeerHelpersByClass(classId);
      res.json(helpers);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Post a peer help request
  app.post("/api/peer-help-requests", authMiddleware, async (req, res) => {
    try {
      const { classId, topic, description } = req.body;
      if (!classId || !topic || !description) return res.status(400).json({ message: "classId, topic, and description required" });
      if (typeof topic !== "string" || topic.length > 200) return res.status(400).json({ message: "Topic must be under 200 characters" });
      if (typeof description !== "string" || description.length < 10 || description.length > 1000) return res.status(400).json({ message: "Description must be 10–1000 characters" });
      const cls = await storage.getClass(Number(classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      // Must be enrolled
      const enrolled = await db.select({ id: bookings.id }).from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, Number(classId)), ne(bookings.status, "cancelled")))
        .limit(1);
      if (enrolled.length === 0) return res.status(403).json({ message: "You must be enrolled in this class" });
      const request = await storage.createPeerHelpRequest({ studentId: req.userId, classId: Number(classId), topic: topic.trim(), description: description.trim() });
      // Auto-match: find a helper registered for this class+topic (exclude the requester)
      const helpers = await storage.getPeerHelpersByClass(Number(classId));
      const match = helpers.find((h: any) => h.topic.toLowerCase() === topic.trim().toLowerCase() && h.userId !== req.userId);
      if (match) {
        await storage.updatePeerHelpRequest(request.id, { status: "matched", helperId: match.userId });
        request.status = "matched";
        request.helperId = match.userId;
        // Notify the matched helper
        const requester = await storage.getUser(req.userId);
        const matchLang = await getUserLang(storage, match.userId);
        const matchText = getNotifText("peer_help_matched", matchLang, { name: requester?.name || "A student", topic, className: cls.title });
        const notif = await storage.createNotification({
          userId: match.userId,
          type: "system",
          title: matchText.title,
          message: matchText.message,
          link: "/student-dashboard",
        });
        broadcastToUser(match.userId, { type: "notification", payload: notif });
      }
      res.status(201).json(request);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get open help requests for a class
  app.get("/api/peer-help-requests", authMiddleware, async (req, res) => {
    try {
      const classId = Number(req.query.classId);
      const status = req.query.status as string | undefined;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const requests = await storage.getPeerHelpRequests(classId, status);
      res.json(requests);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get my own help requests
  app.get("/api/peer-help-requests/mine", authMiddleware, async (req, res) => {
    try {
      const requests = await storage.getPeerHelpRequestsByStudent(req.userId);
      res.json(requests);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Offer to help on an open request (any enrolled student can volunteer)
  app.post("/api/peer-help-requests/:id/offer", authMiddleware, async (req, res) => {
    try {
      const request = await storage.getPeerHelpRequest(Number(req.params.id));
      if (!request) return res.status(404).json({ message: "Request not found" });
      if (request.status !== "open") return res.status(400).json({ message: "Request is already matched or closed" });
      if (request.studentId === req.userId) return res.status(400).json({ message: "You cannot help your own request" });
      // Must be enrolled in the same class
      const enrolled = await db.select({ id: bookings.id }).from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, request.classId), ne(bookings.status, "cancelled")))
        .limit(1);
      if (enrolled.length === 0) return res.status(403).json({ message: "You must be enrolled in this class to offer help" });
      const updated = await storage.updatePeerHelpRequest(Number(req.params.id), { status: "matched", helperId: req.userId });
      // Notify the requester
      const helper = await storage.getUser(req.userId);
      const cls = await storage.getClass(request.classId);
      const offerLang = await getUserLang(storage, request.studentId);
      const offerText = getNotifText("peer_help_offered", offerLang, { name: helper?.name || "A peer", topic: request.topic, className: cls?.title || "your class" });
      const notif = await storage.createNotification({
        userId: request.studentId,
        type: "system",
        title: offerText.title,
        message: offerText.message,
        link: `/messages`,
      });
      broadcastToUser(request.studentId, { type: "notification", payload: notif });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Close / resolve a help request (only the requester)
  app.patch("/api/peer-help-requests/:id/close", authMiddleware, async (req, res) => {
    try {
      const request = await storage.getPeerHelpRequest(Number(req.params.id));
      if (!request) return res.status(404).json({ message: "Request not found" });
      if (request.studentId !== req.userId) return res.status(403).json({ message: "Only the requester can close this" });
      const updated = await storage.updatePeerHelpRequest(Number(req.params.id), { status: "resolved" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── PEER SESSION ROUTES ───────────────────────────────────────────────────

  // Book a peer session (requester or helper of a matched request)
  app.post("/api/peer-sessions", authMiddleware, async (req, res) => {
    try {
      const { requestId, helperId, classId, proposedDate, proposedTime } = req.body;
      if (!helperId || !classId) return res.status(400).json({ message: "helperId and classId required" });
      if (req.userId === Number(helperId)) return res.status(400).json({ message: "You cannot book a session with yourself" });
      // If linked to a request, verify user is involved
      if (requestId) {
        const request = await storage.getPeerHelpRequest(Number(requestId));
        if (!request) return res.status(404).json({ message: "Help request not found" });
        if (request.status !== "matched") return res.status(400).json({ message: "Request must be matched before booking a session" });
        if (request.studentId !== req.userId && request.helperId !== req.userId) {
          return res.status(403).json({ message: "You are not part of this help request" });
        }
      }
      const session = await storage.createPeerSession({
        requestId: requestId ? Number(requestId) : undefined,
        requesterId: req.userId,
        helperId: Number(helperId),
        classId: Number(classId),
        proposedDate: proposedDate || undefined,
        proposedTime: proposedTime || undefined,
      });
      // Notify all coordinators
      const allUsers = await storage.getAllUsers();
      const coordinators = allUsers.filter((u: any) => u.role === "coordinator");
      const requester = await storage.getUser(req.userId);
      const helper = await storage.getUser(Number(helperId));
      const cls = await storage.getClass(Number(classId));
      for (const coord of coordinators) {
        const coordLang = await getUserLang(storage, coord.id);
        const coordText = getNotifText("peer_session_approval_needed", coordLang, { requester: requester?.name || "A student", helper: helper?.name || "a peer", className: cls?.title || "a class" });
        const notif = await storage.createNotification({
          userId: coord.id,
          type: "system",
          title: coordText.title,
          message: coordText.message,
          link: "/admin",
        });
        broadcastToUser(coord.id, { type: "notification", payload: notif });
      }
      res.json(session);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get my peer sessions (student)
  app.get("/api/peer-sessions/mine", authMiddleware, async (req, res) => {
    try {
      const sessions = await storage.getPeerSessionsByUser(req.userId);
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get all peer sessions (coordinator — for approval)
  app.get("/api/peer-sessions/pending", coordinatorMiddleware, async (req, res) => {
    try {
      const sessions = await storage.getPeerSessionsPending();
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Approve a peer session
  app.patch("/api/peer-sessions/:id/approve", coordinatorMiddleware, async (req, res) => {
    try {
      const session = await storage.getPeerSession(Number(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      const { coordinatorNotes } = req.body;
      const updated = await storage.updatePeerSession(Number(req.params.id), {
        status: "approved",
        approvedBy: req.userId,
        coordinatorNotes: coordinatorNotes || undefined,
      });
      // Notify both students
      for (const userId of [session.requesterId, session.helperId]) {
        const approvedLang = await getUserLang(storage, userId);
        const dateTime = session.proposedDate ? ` on ${session.proposedDate}${session.proposedTime ? ' at ' + session.proposedTime : ''}` : '';
        const notes = coordinatorNotes ? ' Note: ' + coordinatorNotes : '';
        const approvedText = getNotifText("peer_session_approved", approvedLang, { dateTime, notes });
        const notif = await storage.createNotification({
          userId,
          type: "system",
          title: approvedText.title,
          message: approvedText.message,
          link: "/student-dashboard",
        });
        broadcastToUser(userId, { type: "notification", payload: notif });
      }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Reject a peer session
  app.patch("/api/peer-sessions/:id/reject", coordinatorMiddleware, async (req, res) => {
    try {
      const session = await storage.getPeerSession(Number(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      const { coordinatorNotes } = req.body;
      const updated = await storage.updatePeerSession(Number(req.params.id), {
        status: "rejected",
        approvedBy: req.userId,
        coordinatorNotes: coordinatorNotes || undefined,
      });
      for (const userId of [session.requesterId, session.helperId]) {
        const rejLang = await getUserLang(storage, userId);
        const reason = coordinatorNotes ? ' Reason: ' + coordinatorNotes : ' Please contact your coordinator for more information.';
        const rejText = getNotifText("peer_session_rejected", rejLang, { reason });
        const notif = await storage.createNotification({
          userId,
          type: "system",
          title: rejText.title,
          message: rejText.message,
          link: "/student-dashboard",
        });
        broadcastToUser(userId, { type: "notification", payload: notif });
      }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Cancel a peer session (either student involved)
  app.patch("/api/peer-sessions/:id/cancel", authMiddleware, async (req, res) => {
    try {
      const session = await storage.getPeerSession(Number(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.requesterId !== req.userId && session.helperId !== req.userId) {
        return res.status(403).json({ message: "Not your session" });
      }
      if (!["pending_approval", "approved"].includes(session.status)) {
        return res.status(400).json({ message: "Session cannot be cancelled in current state" });
      }
      const updated = await storage.updatePeerSession(Number(req.params.id), { status: "cancelled" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── ZOOM MEETING ROUTES ──────────────────────────────────────────────────
  // GET meeting info for a class (teacher sees host_url, students see join_url)
  app.get("/api/live-class/:classId/zoom", authMiddleware, async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId = req.userId;
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      // Enrollment check: only teacher or enrolled students can see the meeting
      if (cls.tutorId !== userId) {
        const userBookings = await storage.getBookings(userId);
        const isEnrolled = userBookings.some((b: any) => b.classId === classId && !["cancelled", "no-show"].includes(b.status));
        if (!isEnrolled) return res.status(403).json({ message: "Not enrolled in this class" });
      }
      if (!cls.zoomMeetingId) return res.json({ exists: false });
      const isHost = cls.tutorId === userId;
      res.json({
        exists: true,
        meetingId: cls.zoomMeetingId,
        joinUrl: cls.zoomMeetingUrl,
        hostUrl: isHost ? cls.zoomHostUrl : null,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST create a Zoom meeting for a class (teacher only)
  app.post("/api/live-class/:classId/zoom", authMiddleware, async (req: Request, res: Response) => {
    try {
      const cls = await storage.getClass(Number(req.params.classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) {
        return res.status(403).json({ message: "Only the class teacher can create a Zoom meeting" });
      }
      // Delete old meeting if one exists
      if (cls.zoomMeetingId) {
        try { await deleteZoomMeeting(cls.zoomMeetingId); } catch (err: any) { console.error("Zoom delete failed:", err.message); }
      }
      // #10: Validate duration before passing to Zoom API
      const durationMinutes = Math.min(Math.max(Math.floor(Number(cls.duration) || 60), 1), 1440);
      const meeting = await createZoomMeeting(cls.title, durationMinutes);
      await storage.updateClass(cls.id, {
        zoomMeetingId: String(meeting.id),
        zoomMeetingUrl: meeting.join_url,
        zoomHostUrl: meeting.start_url,
      });
      res.json({
        exists: true,
        meetingId: String(meeting.id),
        joinUrl: meeting.join_url,
        hostUrl: meeting.start_url,
        password: meeting.password,
      });
    } catch (err: any) {
      if (err.message?.includes("not configured")) return res.status(503).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  });

  // #165: GET cloud recordings for a class's Zoom meeting
  app.get("/api/live-class/:classId/zoom/recordings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const cls = await storage.getClass(Number(req.params.classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      
      // Check if user is owner or enrolled in the class
      const isOwner = cls.tutorId === req.userId;
      const isEnrolled = await db.select().from(bookings)
        .where(and(eq(bookings.studentId, req.userId), eq(bookings.classId, cls.id), ne(bookings.status, "cancelled")))
        .limit(1);
      
      if (!isOwner && !isEnrolled[0]) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!cls.zoomMeetingId) return res.json([]);
      const recordings = await listZoomRecordings(cls.zoomMeetingId);
      res.json(recordings);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // DELETE end/remove a Zoom meeting (teacher only)
  app.delete("/api/live-class/:classId/zoom", authMiddleware, async (req: Request, res: Response) => {
    try {
      const cls = await storage.getClass(Number(req.params.classId));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (cls.tutorId !== req.userId) {
        return res.status(403).json({ message: "Only the class teacher can end a Zoom meeting" });
      }
      if (cls.zoomMeetingId) {
        try { await deleteZoomMeeting(cls.zoomMeetingId); } catch (err: any) { console.error("Zoom delete failed:", err.message); }
        await storage.updateClass(cls.id, { zoomMeetingId: null, zoomMeetingUrl: null, zoomHostUrl: null });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── CSV Export for admin data tables ───────────────────────────────────────
  app.get("/api/admin/export/:type", coordinatorMiddleware, async (req: Request, res: Response) => {
    try {
      const exportType = req.params.type;
      let rows: any[] = [];
      let filename = "";

      switch (exportType) {
        case "users": {
          rows = await storage.getAllUsers();
          filename = "all_users";
          break;
        }
        case "students": {
          const all = await storage.getAllUsers();
          rows = all.filter((u: any) => u.role === "student");
          filename = "students";
          break;
        }
        case "teachers": {
          const all = await storage.getAllUsers();
          rows = all.filter((u: any) => u.role === "tutor");
          filename = "teachers";
          break;
        }
        case "classes": {
          rows = await storage.getClasses();
          filename = "classes";
          break;
        }
        case "bookings": {
          rows = await storage.getAllBookings();
          filename = "bookings";
          break;
        }
        case "reports": {
          rows = await storage.getSafeguardingReports();
          filename = "safeguarding_reports";
          break;
        }
        case "quizzes": {
          rows = await db.select().from(quizzes).orderBy(desc(quizzes.id));
          filename = "quizzes";
          break;
        }
        case "contact-submissions": {
          rows = await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.id));
          filename = "contact_submissions";
          break;
        }
        default:
          return res.status(400).json({ message: `Invalid export type: ${exportType}. Valid types: users, students, teachers, classes, bookings, reports, quizzes, contact-submissions` });
      }

      if (!rows || rows.length === 0) {
        return res.status(200).setHeader("Content-Type", "text/csv").send("No data");
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(","),
        ...rows.map((row: any) =>
          headers.map((h) => {
            const val = row[h];
            const str = Array.isArray(val) ? val.filter(Boolean).join("; ") : String(val ?? "");
            return `"${str.replace(/"/g, '""')}"`;
          }).join(",")
        ),
      ];

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}_export_${dateStr}.csv"`);
      res.send(csvLines.join("\n"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 404 handler for unmatched API routes
  app.use("/api/*path", (_req: Request, res: Response) => {
    res.status(404).json({ error: true, message: "API endpoint not found", code: "NOT_FOUND" });
  });

  return httpServer;
}
