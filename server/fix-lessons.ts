import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

await db.execute(
  sql`ALTER TABLE lessons DROP COLUMN IF EXISTS sections, ADD COLUMN sections jsonb`
);
console.log("✅ lessons.sections converted to jsonb");
process.exit(0);
