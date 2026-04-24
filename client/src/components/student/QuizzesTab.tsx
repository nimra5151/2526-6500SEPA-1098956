import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, TableRowSkeleton } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { Loader2, BarChart3, CheckCircle, XCircle, X } from 'lucide-react';
import type { QuizResult } from '@shared/schema';

interface QuizzesTabProps {
  myQuizResults: any[];
  quizResultsLoading: boolean;
  quizResultsError: boolean;
  reviewingQuizResult: QuizResult | null;
  setReviewingQuizResult: (v: QuizResult | null) => void;
  reviewQuizData: any;
}

export function QuizzesTab({
  myQuizResults,
  quizResultsLoading,
  quizResultsError,
  reviewingQuizResult,
  setReviewingQuizResult,
  reviewQuizData,
}: QuizzesTabProps) {
  return (
    <div className="space-y-4">
      {quizResultsError && !quizResultsLoading && (
        <p className="text-sm text-destructive px-1">Failed to load quiz results. Please refresh.</p>
      )}
      {quizResultsLoading ? (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-0">
            <table className="w-full">
              <tbody className="divide-y dark:divide-slate-700">
                {[0, 1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : myQuizResults.length === 0 ? (
        <EmptyState icon={BarChart3} title="No quiz attempts yet" description="Take quizzes from your enrolled classes to see results here." action={{ label: 'Browse Classes', href: '/classes' }} />
      ) : (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> My Quiz Results ({myQuizResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Quiz</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {myQuizResults.map((r: any) => (
                    <tr key={r.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{r.quizTitle || `Quiz #${r.quizId}`}</td>
                      <td className="px-6 py-4">
                        <Badge className={
                          (r.score || 0) >= 90 ? 'bg-emerald-100 text-emerald-700'
                          : (r.score || 0) >= 70 ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                        }>
                          {r.score || 0}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {r.passed
                          ? <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>
                          : <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setReviewingQuizResult(r)}>
                            Review
                          </Button>
                          <Link href={`/take-quiz/${r.quizId}`}>
                            <Button size="sm" variant="outline" className="text-xs h-8">Retake</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Review Modal */}
      {reviewingQuizResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReviewingQuizResult(null)}>
          <div role="dialog" aria-modal="true" aria-label="Quiz Review" className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-border/60 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 dark:border-slate-800 sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-base font-semibold text-foreground">{(reviewingQuizResult as any).quizTitle || 'Quiz Review'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={reviewingQuizResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                    {reviewingQuizResult.passed ? 'Passed' : 'Failed'} — {reviewingQuizResult.score}%
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setReviewingQuizResult(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              {!reviewQuizData ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
              ) : (() => {
                let questions: any[] = [];
                let answers: Record<number, number> = {};
                try { questions = typeof reviewQuizData.questions === 'string' ? JSON.parse(reviewQuizData.questions) : (reviewQuizData.questions || []); } catch { questions = []; }
                try { answers = typeof reviewingQuizResult.answers === 'string' ? JSON.parse(reviewingQuizResult.answers as string) : (reviewingQuizResult.answers || {}); } catch { answers = {}; }
                if (questions.length === 0) return <p className="text-center text-slate-500 py-4">No questions available.</p>;
                return questions.map((q: any, idx: number) => {
                  const chosen = (answers as any)[idx];
                  const correct = q.correctAnswer;
                  const isCorrect = chosen === correct;
                  return (
                    <div key={idx} className={`rounded-lg border p-4 ${isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800' : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'}`}>
                      <div className="flex items-start gap-2 mb-3">
                        {isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                        <p className="text-sm font-medium text-foreground">{idx + 1}. {q.question}</p>
                      </div>
                      <div className="space-y-1 ml-6">
                        {(q.options || []).map((opt: string, oi: number) => {
                          const isChosen = chosen === oi;
                          const isCorrectOpt = correct === oi;
                          return (
                            <div key={oi} className={`text-xs px-3 py-1.5 rounded-md border ${
                              isCorrectOpt ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-medium'
                              : isChosen ? 'border-red-400 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isCorrectOpt && '✓ '}{isChosen && !isCorrectOpt && '✗ '}{opt}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button variant="outline" onClick={() => setReviewingQuizResult(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
