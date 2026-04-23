import { useEffect, useState } from "react";
import { WifiOff, BookOpen, ChevronDown, ChevronUp, X } from "lucide-react";
import { getSavedLessons, type SavedLesson } from "@/lib/offline-db";
import { Link } from "wouter";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); setDismissed(false); };
    const goOffline = async () => {
      setIsOnline(false);
      setDismissed(false);
      try {
        const lessons = await getSavedLessons();
        setSavedLessons(lessons.sort((a, b) => b.savedAt - a.savedAt));
      } catch {}
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Load saved lessons count even when initially offline
    if (!navigator.onLine) {
      goOffline();
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium flex-1">
          You're offline.
          {savedLessons.length > 0
            ? ` ${savedLessons.length} lesson${savedLessons.length > 1 ? "s" : ""} available for offline reading.`
            : " No lessons saved yet."}
        </span>
        {savedLessons.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold underline"
          >
            View {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
        <button onClick={() => setDismissed(true)} className="ml-1 opacity-80 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {expanded && savedLessons.length > 0 && (
        <div className="bg-amber-600 border-t border-amber-400 px-4 py-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold mb-2 opacity-80">SAVED LESSONS</p>
          <div className="space-y-1">
            {savedLessons.map((lesson) => (
              <Link key={lesson.id} href={`/video/${lesson.classId}?offline=1`}>
                <div className="flex items-center gap-2 text-sm py-1 hover:opacity-80 cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{lesson.title}</span>
                  <span className="text-[10px] opacity-60 shrink-0 ml-auto">
                    {new Date(lesson.savedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
