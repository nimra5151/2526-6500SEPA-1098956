import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Lightbulb,
  X,
  Minimize2,
  Bot,
  User as UserIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface RagSource {
  title: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: RagSource[];
}

interface RagChatResponse {
  answer: string;
  sources: RagSource[];
}

interface AIChatResponse {
  reply: string;
}

interface AIStudyBuddyProps {
  classTitle?: string;
  classId?: number;
  onClose?: () => void;
}

export function AIStudyBuddy({ classTitle, classId, onClose }: AIStudyBuddyProps) {
  const { user } = useAuth();
  const storageKey = user?.id && classId ? `ai_chat_${user.id}_${classId}` : null;

  const initialMessage: Message = {
    id: "1",
    role: "assistant",
    content: `Hi! I'm your AI Study Buddy powered by RAG. I can answer questions using the actual lesson content from "${classTitle || 'your classes'}". Ask me anything!`,
    timestamp: new Date().toISOString(),
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatWidth, setChatWidth] = useState(384);
  const [chatScrollHeight, setChatScrollHeight] = useState(384);
  const resizeOrigin = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: chatWidth, h: chatScrollHeight };
    const onMove = (ev: MouseEvent) => {
      if (!resizeOrigin.current) return;
      const dx = resizeOrigin.current.x - ev.clientX;
      const dy = resizeOrigin.current.y - ev.clientY;
      setChatWidth(Math.min(720, Math.max(300, resizeOrigin.current.w + dx)));
      setChatScrollHeight(Math.min(640, Math.max(200, resizeOrigin.current.h + dy)));
    };
    const onUp = () => {
      resizeOrigin.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [chatWidth, chatScrollHeight]);

  // Load saved conversation history from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setConversationHistory(JSON.parse(saved) as Array<{ role: string; content: string }>);
    } catch {}
  }, [storageKey]);

  const suggestedQuestions = [
    "Can you explain this concept in simpler terms?",
    "What are the key points I should remember?",
    "Can you give me practice questions?",
    "How can I improve my understanding?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const MAX_INPUT = 1000;

  const clearConversation = () => {
    setMessages([{ ...initialMessage, timestamp: new Date().toISOString() }]);
    setConversationHistory([]);
    setExpandedSources(new Set());
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (input.length > MAX_INPUT) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const { authFetch } = await import("@/lib/api");
      const safeHistory = conversationHistory
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8);

      let answer: string;
      let sources: RagSource[] = [];

      try {
        const data = await authFetch("/api/ai/rag-chat", {
          method: "POST",
          body: JSON.stringify({
            message: currentInput,
            classId,
            history: safeHistory,
          }),
        }) as RagChatResponse;
        answer = data.answer;
        sources = data.sources ?? [];
      } catch (ragErr: unknown) {
        const msg = (ragErr as Error)?.message || "";
        if (msg.includes("503")) {
          // RAG not configured — fall back to basic AI chat
          const fallback = await authFetch("/api/ai/chat", {
            method: "POST",
            body: JSON.stringify({
              message: currentInput,
              classTitle,
              conversationHistory,
            }),
          }) as AIChatResponse;
          answer = fallback.reply;
        } else {
          throw ragErr;
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date().toISOString(),
        sources: sources.length > 0 ? sources : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationHistory((prev) => {
        const next = [...prev, { role: "user", content: currentInput }, { role: "assistant", content: answer }];
        if (storageKey) {
          try {
            const serialized = JSON.stringify(next.slice(-20));
            try {
              let used = 0;
              for (const k of Object.keys(localStorage)) used += (localStorage.getItem(k) || "").length;
              if (used > 4 * 1024 * 1024) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("ai_chat_"))
                  .slice(0, 5)
                  .forEach((k) => localStorage.removeItem(k));
              }
            } catch {}
            localStorage.setItem(storageKey, serialized);
          } catch {}
        }
        return next;
      });
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      const errMsg = (err as Error)?.message || "";
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errMsg.includes("429") || errMsg.toLowerCase().includes("too many")
          ? "Too many requests. Please wait a minute and try again."
          : errMsg.includes("503") || errMsg.toLowerCase().includes("not configured")
          ? "AI features are not configured on this server."
          : "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center hover:opacity-90 transition-opacity relative"
        >
          <Bot className="w-7 h-7 text-white" />
          <motion.div
            className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50"
      style={{ width: Math.min(chatWidth, window.innerWidth - 48) }}
    >
      <div
        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-purple-500/60 hover:bg-purple-500 cursor-nw-resize flex items-center justify-center z-10 select-none"
        onMouseDown={startResize}
        title="Drag to resize"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
        </svg>
      </div>
      <Card className="border-2 shadow-2xl bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="relative">
                <Bot className="w-5 h-5 text-primary" />
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span>AI Study Buddy</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="h-8 w-8 p-0"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="p-4" style={{ height: chatScrollHeight }} ref={scrollRef}>
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col gap-1 mb-4 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                          : "bg-white dark:bg-slate-800 text-foreground border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-[10px] mt-1 opacity-60">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Sources panel for RAG responses */}
                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <div className="ml-11 w-full max-w-[calc(75%+2rem)]">
                      <button
                        onClick={() => toggleSources(message.id)}
                        className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        <BookOpen className="w-3 h-3" />
                        {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
                        {expandedSources.has(message.id) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedSources.has(message.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 space-y-1 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 border border-purple-100 dark:border-purple-800">
                              {message.sources.map((src, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-foreground truncate">{src.title}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {Math.round(src.score * 100)}% match
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 mb-4"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md">
                  <div className="flex gap-1">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </ScrollArea>

          {messages.length === 1 && (
            <div className="px-4 pb-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-3"
                    onClick={() => setInput(question)}
                  >
                    <Lightbulb className="w-3 h-3 mr-1" />
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t">
            <div className="space-y-1">
              {input.length > MAX_INPUT - 100 && (
                <p className={`text-xs text-right ${input.length >= MAX_INPUT ? "text-destructive" : "text-muted-foreground"}`}>
                  {input.length}/{MAX_INPUT}
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
                  placeholder="Ask me anything…"
                  className="flex-1"
                  disabled={isLoading}
                  maxLength={MAX_INPUT}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="bg-primary neon-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Answers grounded in lesson content via RAG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </motion.div>
  );
}
