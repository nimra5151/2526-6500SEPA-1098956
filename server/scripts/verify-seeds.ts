import "dotenv/config";
import { db } from "../db";
import { users } from "../../shared/schema";
import { inArray } from "drizzle-orm";

async function run() {
  const seedEmails = [
    "sarah@tutorbridge.org",
    "james@example.com",
    "amara@example.com",
    "priya@example.com",
    "kofi@example.com",
    "nia@example.com",
  ];
  const result = await db.update(users)
    .set({ isVerified: true })
    .where(inArray(users.email, seedEmails))
    .returning({ email: users.email });
  console.log("Verified:", result.map(r => r.email).join(", "));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
