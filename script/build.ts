import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("⏳ Building client (Vite)...");
execSync("npx vite build", { cwd: root, stdio: "inherit" });

console.log("⏳ Building server (esbuild)...");
execSync(
  `npx esbuild server/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.cjs --external:pg-native --external:better-sqlite3 --external:@pinecone-database/pinecone --packages=external`,
  { cwd: root, stdio: "inherit" }
);

console.log("✅ Build complete → dist/public (client) + dist/index.cjs (server)");
