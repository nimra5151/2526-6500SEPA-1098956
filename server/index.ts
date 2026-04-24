import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { registerSwagger } from "./swagger";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import path from "path";
import fs from "fs";

// ── Env validation — fail fast if critical vars are missing ───────────────────
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
if (process.env.SESSION_SECRET === "replace_with_64_char_random_string") {
  console.warn("⚠️  WARNING: SESSION_SECRET is using the default placeholder value. Generate a secure random string for production: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
}

const app = express();

// ── Trust proxy (production only, so req.ip is the real client IP behind a proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
const httpServer = createServer(app);

// ── Security middleware ────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "sameorigin" },
  contentSecurityPolicy: isDev ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["https://zoom.us"],
    },
  },
  strictTransportSecurity: isDev ? false : { maxAge: 31536000, includeSubDomains: true },
}));

// Build allowed origins from environment — add your domain(s) to APP_URL
const allowedOrigins: (string | RegExp)[] = [
  "http://localhost:5000",
  "http://localhost:3000",
];
if (process.env.APP_URL) allowedOrigins.push(process.env.APP_URL);

app.use(cors({
  origin: isDev ? true : allowedOrigins,  // in dev, allow all origins for easy local testing
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Gzip / Brotli compression ────────────────────────────────────────────────
app.use(compression({ threshold: 1024 }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ── Input sanitization ────────────────────────────────────────────────────────
// Recursively strip HTML tags and trim strings from all request body fields.
function sanitizeValue(val: unknown): unknown {
  if (typeof val === "string") {
    const decoded = val.replace(/\u003c/gi, "<").replace(/\u003e/gi, ">");
    return decoded.replace(/<[^>]*>/g, "").trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return val;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const sanitized = { ...capturedJsonResponse };
        delete sanitized.token;
        delete sanitized.password;
        logLine += ` :: ${JSON.stringify(sanitized)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await seedDatabase().catch((err) => console.error("Seed error:", err));

  // Auto-ingest all lessons into Pinecone RAG if configured (fire-and-forget)
  if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX && process.env.OPENAI_API_KEY) {
    import("./rag/ingest.js").then(({ ingestAll }) =>
      ingestAll().catch((e: any) => console.error("[RAG] Auto-ingest error:", e.message))
    );
  }

  registerSwagger(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || (
      status === 404 ? "NOT_FOUND" :
      status === 401 ? "UNAUTHORIZED" :
      status === 403 ? "FORBIDDEN" :
      status === 400 ? "BAD_REQUEST" :
      "SERVER_ERROR"
    );

    if (process.env.NODE_ENV !== "production") {
      console.error(`[${status}] ${message}`, err.stack || "");
    } else if (status >= 500) {
      console.error(`[${status}] ${message}`);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ error: true, message, code });
  });

  // In production serve the pre-built client; in development use Vite dev server
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
