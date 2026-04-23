import { useState, useEffect } from"react";
import { useRoute, useLocation } from"wouter";
import { useQuery, useMutation } from"@tanstack/react-query";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { motion, AnimatePresence } from"framer-motion";
import { authFetch } from"@/lib/api";
import { useToast } from"@/hooks/use-toast";
import type { Quiz, QuizResult } from"@shared/schema";

interface QuizSubmitPayload {
  quizId: number;
  answers: string;
  score: number;
  passed: boolean;
}
import { useAuth } from"@/lib/auth";
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight, ArrowLeft, Loader2, AlertTriangle } from"lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export default function TakeQuiz() {
  const [, params] = useRoute("/take-quiz/:id");
  const quizId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const STORAGE_KEY = `quiz-draft-${quizId}`;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    try { const saved = localStorage.getItem(`quiz-draft-${quizId}`); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptLimitReached, setAttemptLimitReached] = useState<{ attemptsUsed: number; maxAttempts: number } | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: ["quiz", quizId],
    queryFn: () => authFetch(`/api/quizzes/${quizId}`),
    enabled: !!quizId,
  });

  const { data: existingResult } = useQuery<QuizResult | null>({
    queryKey: ["quiz-result", quizId],
    queryFn: () => authFetch(`/api/quiz-results/my/${quizId}`),
    enabled: !!quizId && !!user,
    staleTime: 60_000,
  });

  // Fetch all attempts for this quiz to get the real attempt count
  const { data: allMyResults } = useQuery<QuizResult[]>({
    queryKey: ["all-quiz-results"],
    queryFn: () => authFetch("/api/quiz-results/my"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const attemptCount = Array.isArray(allMyResults)
    ? allMyResults.filter((r) => r.quizId === quizId).length
    : existingResult ? 1 : 0;

  const submitMutation = useMutation({
    mutationFn: (data: QuizSubmitPayload) =>
      authFetch("/api/quiz-results", {
        method:"POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setResult({ score: data.score, passed: data.passed, total: questions.reduce((s: number, q: Question) => s + q.points, 0) });
      setSubmitted(true);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    },
    onError: (err: unknown) => {
      // #137: safely extract attemptsUsed from server error response without unsafe field access
      const errMsg = err instanceof Error ? err.message : String(err);
      const parsed = (() => { try { return JSON.parse(errMsg); } catch { return null; } })();
      const attemptsUsed = parsed?.attemptsUsed ?? (err as any)?.attemptsUsed;
      if (typeof attemptsUsed === "number") {
        setAttemptLimitReached({ attemptsUsed, maxAttempts: parsed?.maxAttempts ?? (err as any)?.maxAttempts ?? 0 });
      } else {
        toast({ title:"Submit failed", description: errMsg, variant:"destructive" });
      }
    },
  });

  const questions: Question[] = (() => {
    if (!quiz?.questions) return [];
    try {
      return typeof quiz.questions ==="string" ? JSON.parse(quiz.questions) : quiz.questions;
    } catch { return []; }
  })();

  useEffect(() => {
    if (quiz?.timeLimit && quizStarted && !submitted) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz, quizStarted, submitted]);

  useEffect(() => {
    if (timeLeft === null || !quizStarted || submitted || submitMutation.isPending) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setInterval(() => setTimeLeft(t => (t ?? 0) - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, quizStarted, submitted, submitMutation.isPending]);

  // Persist answers to localStorage
  useEffect(() => {
    if (!submitted && Object.keys(selectedAnswers).length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedAnswers)); } catch {}
    }
  }, [selectedAnswers, submitted, STORAGE_KEY]);

  // Warn before leaving with unsaved answers
  useEffect(() => {
    if (submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.keys(selectedAnswers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitted, selectedAnswers]);

  useEffect(() => {
    if (existingResult) {
      setSubmitted(true);
      const qs = questions;
      setResult({
        score: existingResult.score ?? 0,
        passed: existingResult.passed ?? false,
        total: qs.reduce((s: number, q: Question) => s + q.points, 0),
      });
    }
  }, [existingResult, quiz]);

  const handleSubmit = () => {
    const totalScore = questions.reduce((score: number, q: Question, idx: number) => {
      return selectedAnswers[idx] === q.correctAnswer ? score + q.points : score;
    }, 0);
    const totalPoints = questions.reduce((s: number, q: Question) => s + q.points, 0);
    const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    const passed = scorePercent >= (quiz?.passingScore || 70);
    submitMutation.mutate({
      quizId,
      answers: JSON.stringify(selectedAnswers),
      score: scorePercent,
      passed,
    });
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Quiz not found.</p>
      </div>
    );
  }

  if (attemptLimitReached) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg border-0 shadow-xl text-center">
          <CardContent className="p-10">
            <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-amber-100">
              <AlertTriangle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Attempt Limit Reached</h2>
            <p className="text-slate-500 mb-4">
              You have used all {attemptLimitReached.maxAttempts} attempt{attemptLimitReached.maxAttempts !== 1 ?"s" :""} for this quiz.
            </p>
            <Button variant="outline" onClick={() => setLocation("/student-dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && result) {
    // #187: celebration screen with animated confetti dots and bouncing icon
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Confetti — only when passed */}
        {result.passed && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => {
              const colors = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#a855f7'];
              const left = (i * 4.17) % 100;
              const delay = (i % 8) * 0.1;
              const duration = 2 + (i % 3) * 0.5;
              return (
                <motion.div
                  key={i}
                  initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
                  animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
                  transition={{ duration, delay, ease: 'easeIn', repeat: Infinity, repeatDelay: 1.5 }}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{ left: `${left}%`, backgroundColor: colors[i % colors.length] }}
                />
              );
            })}
          </div>
        )}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type:"spring", stiffness: 200, damping: 18 }}
          className="w-full max-w-lg relative z-10"
        >
          <Card className="border-0 shadow-2xl text-center">
            <CardContent className="p-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type:"spring", stiffness: 260, damping: 14 }}
                className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${result.passed ?"bg-green-100" :"bg-red-100"}`}
              >
                {result.passed
                  ? <Trophy className="w-12 h-12 text-green-600" />
                  : <XCircle className="w-12 h-12 text-red-500" />}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-slate-900 dark:text-white mb-2"
              >
                {result.passed ?"Quiz Passed! 🎉" :"Quiz Failed"}
              </motion.h2>
              <p className="text-slate-500 mb-6">
                {result.passed ?"Great job! You've successfully completed this quiz." : `You need ${quiz.passingScore || 70}% to pass. Keep practising!`}
              </p>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type:"spring", stiffness: 180 }}
                className="text-6xl font-bold mb-2 text-indigo-600"
              >
                {result.score}%
              </motion.div>
              <p className="text-slate-400 text-sm mb-2">Score</p>
              <Badge className={result.passed ?"bg-green-100 text-green-800" :"bg-red-100 text-red-800"}>
                {result.passed ?"PASSED" :"FAILED"}
              </Badge>
              <div className="mt-4 text-sm text-slate-500">Passing score: {quiz.passingScore || 70}%</div>
              <div className="flex gap-3 mt-8 justify-center">
                <Button variant="outline" onClick={() => setLocation("/student-dashboard")}>
                  Back to Dashboard
                </Button>
                {!result.passed && (!quiz.maxAttempts || attemptCount < quiz.maxAttempts) && (
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                    setSubmitted(false);
                    setResult(null);
                    setSelectedAnswers({});
                    setCurrentQuestion(0);
                    setTimeLeft(null);
                  }}>
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">This quiz has no questions yet.</p>
      </div>
    );
  }

  const q = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isLast = currentQuestion === questions.length - 1;

  // Show quiz start screen if not started
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                {quiz.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {quiz.description}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{questions.length}</div>
                  <div className="text-slate-600 dark:text-slate-400">Questions</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{quiz.passingScore || 70}%</div>
                  <div className="text-slate-600 dark:text-slate-400">Passing Score</div>
                </div>
                {quiz.timeLimit && (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{quiz.timeLimit} min</div>
                    <div className="text-slate-600 dark:text-slate-400">Time Limit</div>
                  </div>
                )}
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg"
                onClick={() => setQuizStarted(true)}
              >
                Begin Quiz
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate pr-4">{quiz.title}</h1>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${timeLeft < 60 ?"bg-red-100 text-red-700" :"bg-slate-100 text-slate-700"}`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>·</span>
            <span>{q.points} point{q.points !== 1 ?"s" :""}</span>
          </div>
          {/* #184: animated progress bar with smooth transition between questions */}
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease:"easeInOut" }}
            />
          </div>
        </div>

        {/* Question Card with animated transition between questions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease:"easeOut" }}
          >
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-8">
                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-6 leading-relaxed">
                  {q.question}
                </p>
                <div className="space-y-3">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestion] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: optIdx }))}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-sm ${
                          isSelected
                            ?"border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                            :"border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-3 ${isSelected ?"bg-indigo-500 text-white" :"bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(p => p - 1)}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  i === currentQuestion
                    ?"bg-indigo-600 text-white"
                    : selectedAnswers[i] !== undefined
                    ?"bg-indigo-100 text-indigo-700"
                    :"bg-slate-200 text-slate-500"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Submit Quiz
            </Button>
          ) : (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setCurrentQuestion(p => p + 1)}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
