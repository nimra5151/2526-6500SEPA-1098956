import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (install prompt + offline fallback)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

// Auto-sync queued assignment submissions when back online
window.addEventListener("online", async () => {
  try {
    const { getQueuedSubmissions, removeFromQueue } = await import("@/lib/offline-db");
    const queue = await getQueuedSubmissions();
    if (queue.length === 0) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    for (const item of queue) {
      try {
        const res = await fetch("/api/assignment-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ assignmentId: item.assignmentId, content: item.content, fileUrl: item.fileUrl }),
        });
        if (res.ok) await removeFromQueue(item.id);
      } catch {}
    }
  } catch {}
});
