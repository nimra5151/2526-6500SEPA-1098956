import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL || "";
// #19: Enforce SSL for remote/Neon PostgreSQL connections
const ssl = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
  ? undefined
  : { rejectUnauthorized: false };

const pool = new pg.Pool({
  connectionString,
  ssl,
  max: 20, // #29: Raised from 5 to handle moderate concurrent load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// #20: Handle unexpected connection errors to prevent silent crashes
pool.on("error", (err) => {
  console.error("[db] Unexpected pool client error:", err.message);
});

export const db = drizzle(pool, { schema });
