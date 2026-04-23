// One-off script: TRUNCATE all tables so seed.ts can repopulate fresh data.
// Usage:  npx tsx server/reset-db.ts
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  console.log("Resetting database — truncating all tables...");

  await db.execute(sql`
    TRUNCATE TABLE
      users, classes, bookings, reviews, notifications,
      safeguarding_reports, lessons, quizzes, assignments,
      quiz_results, assignment_submissions, course_progress,
      certificates, notes, discussions, discussion_replies,
      favorites, contact_submissions, peer_helpers,
      peer_help_requests, peer_sessions, messages,
      login_history, user_settings, class_waitlist
    RESTART IDENTITY CASCADE;
  `);

  console.log("✅ All tables cleared. Restart server to re-seed.");
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
