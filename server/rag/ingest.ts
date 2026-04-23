import OpenAI from "openai";
import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { db } from "../db";
import { lessons, classes } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getPineconeIndex() {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX must be set in .env");
  }
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pc.index(process.env.PINECONE_INDEX);
}

// Split text into overlapping chunks
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// Build full text from a lesson row
function lessonToText(lesson: Pick<typeof lessons.$inferSelect, "title" | "description" | "content" | "sections">): string {
  const parts: string[] = [];
  if (lesson.title) parts.push(`Title: ${lesson.title}`);
  if (lesson.description) parts.push(`Description: ${lesson.description}`);
  if (lesson.content) parts.push(`Content: ${lesson.content}`);
  if (lesson.sections) {
    const secs = lesson.sections as string[];
    if (Array.isArray(secs)) {
      secs.forEach((s) => {
        const text = typeof s === "string" ? s.replace(/\|\|/g, ": ") : JSON.stringify(s);
        parts.push(text);
      });
    }
  }
  return parts.join("\n\n");
}

export async function ingestLesson(lessonId: number): Promise<void> {
  if (!process.env.PINECONE_API_KEY) return; // silently skip if not configured

  const [lesson] = await db.select({
    id: lessons.id,
    classId: lessons.classId,
    title: lessons.title,
    description: lessons.description,
    content: lessons.content,
    sections: lessons.sections,
  }).from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

  const fullText = lessonToText(lesson);
  if (!fullText.trim()) {
    console.log(`[RAG] Lesson ${lessonId} has no text content — skipping`);
    return;
  }

  const index = getPineconeIndex();
  const chunks = chunkText(fullText);

  // Embed all chunks in one API call (batch)
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  const records: PineconeRecord[] = chunks.map((chunk, i) => ({
    id: `lesson-${lessonId}-chunk-${i}`,
    values: embeddingResponse.data[i].embedding,
    metadata: {
      lessonId: String(lessonId),
      classId: String(lesson.classId),
      title: lesson.title,
      text: chunk,
    },
  }));

  await index.upsert({ records });
  console.log(`[RAG] Ingested lesson ${lessonId} "${lesson.title}" — ${records.length} chunk(s)`);
}

export async function ingestClass(classId: number): Promise<void> {
  if (!process.env.PINECONE_API_KEY) return;

  const [cls] = await db.select({
    id: classes.id,
    title: classes.title,
    description: classes.description,
  }).from(classes).where(eq(classes.id, classId));
  if (!cls) throw new Error(`Class ${classId} not found`);

  // Fetch all lessons for this class (used for both metadata summary and individual ingestion)
  const classLessons = await db.select({
    id: lessons.id,
    title: lessons.title,
  }).from(lessons).where(eq(lessons.classId, classId));

  // Ingest class overview with description AND course structure metadata
  const index = getPineconeIndex();
  const lessonList = classLessons.map((l, i) => `  ${i + 1}. ${l.title}`).join("\n");
  const overviewText = [
    `Class: ${cls.title}`,
    cls.description?.trim() ? `\nDescription: ${cls.description}` : "",
    `\nThis course has ${classLessons.length} lesson${classLessons.length !== 1 ? "s" : ""} in total.`,
    classLessons.length > 0 ? `\nLessons:\n${lessonList}` : "",
  ].filter(Boolean).join("\n");

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: [overviewText],
  });
  const record: PineconeRecord = {
    id: `class-${classId}-description`,
    values: embeddingResponse.data[0].embedding,
    metadata: {
      classId: String(classId),
      title: `${cls.title} (Overview)`,
      text: overviewText,
    },
  };
  await index.upsert({ records: [record] });
  console.log(`[RAG] Ingested class ${classId} "${cls.title}" overview (${classLessons.length} lessons)`);

  // Ingest all lessons for this class
  for (const lesson of classLessons) {
    await ingestLesson(lesson.id);
  }
}

export async function ingestAll(): Promise<void> {
  const allClasses = await db.select({ id: classes.id, title: classes.title }).from(classes).orderBy(classes.id);
  console.log(`[RAG] Starting ingestion of ${allClasses.length} classes...`);
  for (let i = 0; i < allClasses.length; i++) {
    const cls = allClasses[i];
    console.log(`[RAG] Processing class ${i + 1}/${allClasses.length}: ${cls.title}`);
    try {
      await ingestClass(cls.id);
    } catch (err: any) {
      console.error(`[RAG] Failed to ingest class ${cls.id}: ${err.message}`);
    }
  }
  console.log("[RAG] Ingestion complete.");
}
