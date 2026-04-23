import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Tables are empty (post-truncate), so it's safe to drop+recreate columns
// that are changing type from text/text[] to jsonb.
const migrations: Array<{ table: string; column: string; type: string }> = [
  { table: "classes", column: "certificate_criteria", type: "jsonb" },
  { table: "user_settings", column: "availability_schedule", type: "jsonb" },
  { table: "lessons", column: "sections", type: "jsonb" },
  { table: "lessons", column: "attachments", type: "jsonb" },
  { table: "quizzes", column: "questions", type: "jsonb" },
  { table: "assignments", column: "rubric", type: "jsonb" },
];

for (const m of migrations) {
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE ${m.table} DROP COLUMN IF EXISTS ${m.column}, ADD COLUMN ${m.column} ${m.type}`
      )
    );
    console.log(`✅ ${m.table}.${m.column} -> ${m.type}`);
  } catch (err: any) {
    console.warn(`⚠️  ${m.table}.${m.column}: ${err.message}`);
  }
}

// quizzes.questions was NOT NULL originally; re-add NOT NULL if needed (quizzes empty)
try {
  await db.execute(
    sql.raw(`ALTER TABLE quizzes ALTER COLUMN questions SET NOT NULL`)
  );
  console.log(`✅ quizzes.questions set NOT NULL`);
} catch (err: any) {
  console.warn(`⚠️  quizzes.questions NOT NULL: ${err.message}`);
}

process.exit(0);
