import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

const tables = [
  "users", "classes", "bookings", "messages", "reviews",
  "notifications", "favorites", "user_settings", "course_progress",
  "safeguarding_reports", "contact_submissions", "lessons",
  "quizzes", "quiz_results", "assignments", "assignment_submissions",
  "notes", "certificates", "discussions", "discussion_replies",
  "login_history", "email_verification_tokens", "class_waitlist",
  "password_reset_tokens", "peer_helpers", "peer_help_requests",
  "peer_sessions",
];

console.log("\n📊 Seed data audit — row counts per table:\n");
console.log("Table".padEnd(32) + "Rows");
console.log("─".repeat(45));

for (const t of tables) {
  try {
    const res: any = await db.execute(sql.raw(`SELECT COUNT(*)::int AS n FROM ${t}`));
    const n = res.rows?.[0]?.n ?? res[0]?.n ?? 0;
    const marker = n === 0 ? " ⚠️  EMPTY" : "";
    console.log(t.padEnd(32) + String(n) + marker);
  } catch (err: any) {
    console.log(t.padEnd(32) + `ERROR: ${err.message}`);
  }
}
process.exit(0);
