import "dotenv/config";
import { sendVerificationEmail } from "../email";

async function run() {
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("APP_URL:", process.env.APP_URL);
  console.log("Sending verification email...");
  try {
    await sendVerificationEmail("worknimra24@gmail.com", "TestUser", "fake-token-12345");
    console.log("SUCCESS — email sent");
  } catch (err: any) {
    console.error("FAILED:", err.message);
  }
  process.exit(0);
}
run();
