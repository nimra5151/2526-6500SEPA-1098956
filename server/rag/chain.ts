import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { db } from "../db";
import { lessons } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RagSource {
  title: string;
  score: number;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
}

// Detect "lesson N" references in user message and directly fetch from DB
async function getDirectLessonContext(message: string, classId?: number): Promise<{ text: string; title: string } | null> {
  const match = message.match(/lesson\s+(\d+)/i);
  if (!match || !classId) return null;
  const lessonNum = parseInt(match[1], 10);

  // Fetch all lessons for this class, ordered by id, and pick the Nth one
  const classLessons = await db.select({
    id: lessons.id,
    title: lessons.title,
    description: lessons.description,
    content: lessons.content,
    sections: lessons.sections,
  }).from(lessons).where(eq(lessons.classId, classId));

  const lesson = classLessons[lessonNum - 1]; // 1-indexed
  if (!lesson) return null;

  const parts: string[] = [];
  if (lesson.title) parts.push(`Lesson ${lessonNum}: ${lesson.title}`);
  if (lesson.description) parts.push(`Description: ${lesson.description}`);
  if (lesson.content) parts.push(`Content: ${lesson.content}`);
  if (lesson.sections && Array.isArray(lesson.sections)) {
    (lesson.sections as string[]).forEach((s) => {
      const text = typeof s === "string" ? s.replace(/\|\|/g, ": ") : JSON.stringify(s);
      parts.push(text);
    });
  }
  return { text: parts.join("\n\n"), title: lesson.title };
}

/**
 * Retrieve relevant course material chunks from Pinecone for a given class and topic.
 * Used to ground quiz/assignment generation in actual lesson content.
 * Returns an empty string if Pinecone is not configured or no relevant content is found.
 */
export async function retrieveClassContext(classId: number, topic: string): Promise<string> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) return "";

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: topic,
    });
    const queryVector = embeddingResponse.data[0].embedding;

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX);

    const searchResult = await index.query({
      vector: queryVector,
      topK: 8,
      includeMetadata: true,
      filter: { classId: String(classId) },
    });

    const matches = searchResult.matches ?? [];
    const chunks = matches
      .filter((m) => (m.score ?? 0) > 0.25)
      .map((m) => m.metadata?.text as string)
      .filter(Boolean);

    console.log(`[RAG:context] classId=${classId} topic="${topic}" chunks=${chunks.length}`);
    return chunks.join("\n\n---\n\n");
  } catch (err: any) {
    console.warn(`[RAG:context] Failed to retrieve context for classId=${classId}:`, err.message);
    return "";
  }
}

export async function ragChat(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  classId?: number
): Promise<RagResult> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error("RAG_NOT_CONFIGURED");
  }

  // 0. Check for direct lesson-by-number references (e.g. "lesson 5")
  const directLesson = await getDirectLessonContext(message, classId);

  // 1. Embed the user's message
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: message,
  });
  const queryVector = embeddingResponse.data[0].embedding;

  // 2. Search Pinecone for relevant lesson chunks
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX);

  const searchResult = await index.query({
    vector: queryVector,
    topK: 5,
    includeMetadata: true,
    ...(classId ? { filter: { classId: String(classId) } } : {}),
  });

  const matches = searchResult.matches ?? [];
  console.log(`[RAG] Query classId=${classId}, directLesson=${directLesson?.title ?? 'none'}, matches=${matches.length}, scores=[${matches.map(m => m.score?.toFixed(3)).join(', ')}]`);

  // 3. Build context — direct lesson content takes priority, then Pinecone matches
  const contextParts: string[] = [];
  const sources: RagSource[] = [];

  if (directLesson) {
    contextParts.push(directLesson.text);
    sources.push({ title: directLesson.title, score: 1.0 });
  }

  const pineconeContext = matches
    .filter((m) => (m.score ?? 0) > 0.3)
    .map((m) => m.metadata?.text as string)
    .filter(Boolean);
  contextParts.push(...pineconeContext);

  // 4. Build sources list (deduplicated by title)
  const seen = new Set<string>(sources.map(s => s.title));
  for (const m of matches) {
    const title = (m.metadata?.title as string) ?? "Lesson";
    if (!seen.has(title) && (m.score ?? 0) > 0.3) {
      seen.add(title);
      sources.push({ title, score: Math.round((m.score ?? 0) * 100) / 100 });
    }
  }

  const context = contextParts.join("\n\n---\n\n");

  // 5. Build system prompt
  const systemPrompt = context.trim()
    ? `You are TutorBridge AI, a helpful and encouraging tutor for orphanage students aged 10–18.
Answer the student's question based on the course materials below.
If the answer is in the materials, use them. If not, answer from your general knowledge but mention it's not covered in the course.
Keep answers clear, simple, and encouraging.

COURSE MATERIALS:
${context}`
    : `You are TutorBridge AI, a helpful and encouraging tutor for orphanage students aged 10–18.
No specific course materials were found for this question.
Answer from your general knowledge. Keep answers clear, simple, and encouraging.`;

  // 6. Call OpenAI with context + history (filter out null/empty content)
  const safeHistory = history
    .filter((m) => m.content && typeof m.content === "string")
    .slice(-8);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...safeHistory,
    { role: "user", content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const answer = completion.choices[0]?.message?.content ?? "I could not generate a response. Please try again.";

  return { answer, sources };
}
