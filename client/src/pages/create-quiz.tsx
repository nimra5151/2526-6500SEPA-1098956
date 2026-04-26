import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, Save, Sparkles, Wand2, CheckCircle, XCircle, BookOpen
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Class } from '@shared/schema';

interface QuizQuestion {
  question: string;
  type?: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export default function CreateQuiz() {
  const [quiz, setQuiz] = useState<{
    title: string;
    description: string;
    timeLimit: string;
    passingScore: number;
    maxAttempts: string;
  }>({
    title: '',
    description: '',
    timeLimit: '',
    passingScore: 70,
    maxAttempts: '',
  });

  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    }
  ]);

  const search = useSearch();
  const [classId, setClassId] = useState(() => new URLSearchParams(search).get('classId') || '');
  const [myClasses, setMyClasses] = useState<Class[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    authFetch("/api/classes/my/teaching").then(setMyClasses).catch(() => toast({ title: "Failed to load classes", variant: "destructive" }));
  }, []);

  const handleSaveQuiz = async () => {
    if (!quiz.title || questions.length === 0) {
      toast({ title:"Please add a title and at least one question", variant:"destructive" });
      return;
    }
    const invalidQ = questions.findIndex(q => q.correctAnswer === undefined || q.correctAnswer === null || q.options.filter(Boolean).length < 2);
    if (invalidQ !== -1) {
      toast({ title: `Question ${invalidQ + 1} is incomplete`, description: "Each question needs at least 2 options and a correct answer selected.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await authFetch("/api/quizzes", {
        method:"POST",
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          questions: JSON.stringify(questions),
          timeLimit: quiz.timeLimit ? parseInt(quiz.timeLimit) : null,
          passingScore: quiz.passingScore,
          classId: classId ? Number(classId) : null,
          maxAttempts: quiz.maxAttempts ? parseInt(quiz.maxAttempts) : null,
        }),
      });
      toast({ title:"Quiz saved successfully!" });
      setLocation("/teacher-dashboard");
    } catch (err: Error | unknown) {
      toast({ title: (err as Error).message || "Failed to save quiz", variant:"destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateQuestionsWithAI = async () => {
    if (!quiz.title) {
      toast({ title:"Please enter a quiz title/topic first", variant:"destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const body: Record<string, unknown> = { topic: quiz.title, questionCount: 5 };
      if (classId) body.classId = Number(classId);

      const data = await authFetch("/api/ai/quiz-generate", {
        method:"POST",
        body: JSON.stringify(body),
      });
      if (data.questions && Array.isArray(data.questions)) {
        const hasExisting = questions.some(q => q.question.trim());
        if (hasExisting && !window.confirm("AI will replace your current questions. Continue?")) {
          setAiGenerating(false);
          return;
        }
        setQuestions(data.questions.map((q: QuizQuestion, i: number) => ({
          id: Date.now() + i,
          question: q.question,
          type:"multiple-choice",
          options: q.options || ["","","",""],
          correctAnswer: q.correctAnswer || 0,
          points: q.points || 1,
        })));
        const ragNote = data._ragUsed ? " (grounded in course material)" : "";
        toast({ title: `Generated ${data.questions.length} questions with AI${ragNote}!` });
      }
    } catch (err: Error | unknown) {
      toast({ title:"AI generation failed", description: (err as Error).message, variant:"destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Create Quiz
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Generate questions automatically with AI or create manually
            </p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveQuiz} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ?"Saving..." :"Save Quiz"}
          </Button>
        </div>

        <div className="mb-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">AI-Powered Quiz Generation</h3>
                {classId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-xs font-medium">
                    <BookOpen className="w-3 h-3" /> RAG — Course material
                  </span>
                )}
              </div>
              <p className="text-white/80">
                {classId
                  ? "Questions will be generated from the actual lesson content of the selected course"
                  : "Let AI auto-generate multiple-choice questions, set difficulty levels, and create balanced assessments"}
              </p>
            </div>
            <Button
              onClick={generateQuestionsWithAI}
              className="bg-white text-indigo-600 hover:bg-white/90"
              size="lg"
              disabled={aiGenerating}
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Generate Quiz
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Quiz Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Quiz Title *</Label>
                  <Input
                    value={quiz.title}
                    onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                    placeholder="e.g., React Hooks Quiz"
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Time Limit (minutes)</Label>
                    <Input
                      type="number"
                      value={quiz.timeLimit}
                      onChange={(e) => setQuiz({ ...quiz, timeLimit: e.target.value })}
                      placeholder="30"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      value={quiz.passingScore}
                      onChange={(e) => setQuiz({ ...quiz, passingScore: Number(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Max Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quiz.maxAttempts}
                      onChange={(e) => setQuiz({ ...quiz, maxAttempts: e.target.value })}
                      placeholder="Unlimited"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Questions</CardTitle>
                  <Button
                    onClick={generateQuestionsWithAI}
                    disabled={aiGenerating}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {aiGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={q.id} className="p-6 border rounded-xl space-y-4 dark:border-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge>Question {qIndex + 1}</Badge>
                      <div className="flex items-center gap-2">
                        {/* #104: question type selector */}
                        <select
                          value={q.type || 'multiple-choice'}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex] = {
                              ...updated[qIndex],
                              type: e.target.value,
                              options: e.target.value === 'true-false' ? ['True', 'False'] : (updated[qIndex].options.length >= 2 ? updated[qIndex].options : ['', '', '', '']),
                              correctAnswer: 0,
                            };
                            setQuestions(updated);
                          }}
                          className="text-xs px-2 py-1 border rounded bg-background"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="true-false">True / False</option>
                        </select>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Points:</span>
                        <Input
                          type="number"
                          value={q.points}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex].points = Number(e.target.value);
                            setQuestions(updated);
                          }}
                          className="w-20"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIndex].question = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder="Enter your question..."
                      className="font-medium"
                    />

                    <div className="space-y-3">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const updated = [...questions];
                              updated[qIndex].correctAnswer = oIndex;
                              setQuestions(updated);
                            }}
                            className={`p-2 rounded-lg border-2 transition-colors ${
                              q.correctAnswer === oIndex
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {q.correctAnswer === oIndex ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          {/* #104: lock true/false labels; editable for MC */}
                          {(q.type || 'multiple-choice') === 'true-false' ? (
                            <span className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted">{option}</span>
                          ) : (
                            <Input
                              value={option}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[qIndex].options[oIndex] = e.target.value;
                                setQuestions(updated);
                              }}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {/* #109: inline question preview */}
                    {q.question && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">Preview</p>
                        <p className="font-medium">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => opt ? (
                            <div key={oi} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                              q.correctAnswer === oi ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-medium' : 'text-muted-foreground'
                            }`}>
                              <span>{String.fromCharCode(65 + oi)}.</span> {opt}
                              {q.correctAnswer === oi && <CheckCircle className="w-3 h-3 ml-auto" />}
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setQuestions([...questions, {
                    id: Date.now(),
                    question: '',
                    type: 'multiple-choice',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    points: 1
                  }])}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Quiz Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Points:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {questions.reduce((sum, q) => sum + q.points, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Time Limit:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{quiz.timeLimit || 'N/A'} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Passing Score:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{quiz.passingScore}%</span>
                </div>
                <div className="pt-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Attach to Course (optional)</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">— None —</option>
                    {myClasses.map((c: Class) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
