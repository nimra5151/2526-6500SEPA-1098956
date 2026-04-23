// IndexedDB wrapper for TutorBridge offline mode
const DB_NAME = "tutorbridge-offline";
const DB_VERSION = 1;

export interface SavedLesson {
  id: number;
  classId: number;
  title: string;
  description: string | null;
  content: string | null;
  sections: unknown;
  savedAt: number;
}

export interface QueuedSubmission {
  id: string;           // local UUID
  assignmentId: number;
  assignmentTitle: string;
  content: string;
  fileUrl: string | null;
  queuedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("lessons")) {
        db.createObjectStore("lessons", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("enrolledClasses")) {
        db.createObjectStore("enrolledClasses", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("submissionQueue")) {
        db.createObjectStore("submissionQueue", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ── Lessons ─────────────────────────────────────────────────────────────────

export async function saveLesson(lesson: Omit<SavedLesson, "savedAt">): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "lessons", "readwrite").put({ ...lesson, savedAt: Date.now() }));
}

export async function getLesson(id: number): Promise<SavedLesson | undefined> {
  const db = await openDB();
  return promisify(tx(db, "lessons", "readonly").get(id));
}

export async function getSavedLessons(): Promise<SavedLesson[]> {
  const db = await openDB();
  return promisify(tx(db, "lessons", "readonly").getAll());
}

export async function deleteLesson(id: number): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "lessons", "readwrite").delete(id));
}

// ── Enrolled Classes cache ───────────────────────────────────────────────────

export async function cacheEnrolledClasses(classes: any[]): Promise<void> {
  const db = await openDB();
  const store = tx(db, "enrolledClasses", "readwrite");
  // Clear old entries first
  await promisify(store.clear());
  for (const cls of classes) {
    tx(db, "enrolledClasses", "readwrite").put(cls);
  }
}

export async function getCachedEnrolledClasses(): Promise<any[]> {
  const db = await openDB();
  return promisify(tx(db, "enrolledClasses", "readonly").getAll());
}

// ── Assignment Submission Queue ──────────────────────────────────────────────

export async function queueSubmission(data: Omit<QueuedSubmission, "id" | "queuedAt">): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = await openDB();
  await promisify(tx(db, "submissionQueue", "readwrite").put({ ...data, id, queuedAt: Date.now() }));
  return id;
}

export async function getQueuedSubmissions(): Promise<QueuedSubmission[]> {
  const db = await openDB();
  return promisify(tx(db, "submissionQueue", "readonly").getAll());
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "submissionQueue", "readwrite").delete(id));
}
