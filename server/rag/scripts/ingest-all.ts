import "dotenv/config";
import { ingestAll } from "../ingest";

ingestAll()
  .then(() => {
    console.log("[RAG] All content ingested successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[RAG] Ingestion failed:", err.message);
    process.exit(1);
  });
