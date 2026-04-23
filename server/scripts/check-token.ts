import "dotenv/config";
import { db } from "../db";
import { emailVerificationTokens } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const rows = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, 13));
  console.log("tokens in DB:", JSON.stringify(rows, null, 2));
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
