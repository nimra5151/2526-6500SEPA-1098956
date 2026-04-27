import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, ClipboardList, FileCheck, Loader2, ArrowLeft, SendHorizonal, CheckCircle2, Clock } from "lucide-react";
import { Link } from "wouter";

// #164: Per-class student progress dashboard (tutor view)
export default function ClassProgress() {
  const [, params] = useRoute("/classes/:id/progress");
  const classId = params?.id;
  const { toast } = useToast();
  const [issuingId, setIssuingId] = useState<number | null>(null);

  const { data: cls } = useQuery({
    queryKey: ["/api/classes", classId],
    queryFn: () => authFetch(`/api/classes/${classId}`),
    enabled: !!classId,
  });

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/classes", classId, "student-progress"],
    queryFn: () => authFetch(`/api/classes/${classId}/student-progress`),
    enabled: !!classId,
    staleTime: 30_000,
  });

  const issueCertMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: number }) =>
      authFetch("/api/teacher/issue-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classId: Number(classId) }),
      }),
    onMutate: ({ studentId }) => setIssuingId(studentId),
    onSuccess: (_, { studentId }) => {
      setIssuingId(null);
      toast({
        title: "Certificate issued",
        description: "The certificate has been submitted for coordinator approval. The student has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "certificates"] });
    },
    onError: (err: any, { studentId }) => {
      setIssuingId(null);
      const msg = err?.message || "Failed to issue certificate";
      toast({ title: "Could not issue certificate", description: msg, variant: "destructive" });
    },
  });

  const certStatusBadge = (s: any) => {
    if (!s.hasCertificate) return null;
    const status = s.certificateStatus;
    if (status === "approved") return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1">
        <CheckCircle2 className="w-3 h-3" /> Certificate approved
      </Badge>
    );
    if (status === "pending") return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
        <Clock className="w-3 h-3" /> Certificate pending
      </Badge>
    );
    return (
      <Badge className="bg-slate-100 text-slate-600 text-xs gap-1">
        <Award className="w-3 h-3" /> Certificate issued
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher-dashboard">
          <button className="text-muted-foreground hover:text-foreground" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Student Progress</h1>
          {cls && <p className="text-sm text-muted-foreground">{cls.title}</p>}
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
        Use the <span className="font-medium text-foreground">Issue Certificate</span> button to award a certificate to a student. It will be sent to the coordinator for approval before the student can download it.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No enrolled students found for this class.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s: any) => {
            const lectPct = s.totalLectures > 0 ? Math.round((s.completedLectures / s.totalLectures) * 100) : 0;
            const isIssuing = issuingId === s.studentId;
            return (
              <Card key={s.studentId}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10 shrink-0">
                      {s.avatar && <AvatarImage src={s.avatar} />}
                      <AvatarFallback className="bg-indigo-600 text-white text-sm font-semibold">
                        {s.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name row + badges + action */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{s.name}</span>
                          {certStatusBadge(s)}
                          {s.avgGrade !== null && (
                            <Badge variant="outline" className="text-xs">
                              Avg grade: {s.avgGrade}%
                            </Badge>
                          )}
                        </div>

                        {/* Issue Certificate button */}
                        {s.hasCertificate ? null : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30 shrink-0"
                            disabled={isIssuing || issueCertMutation.isPending}
                            onClick={() => issueCertMutation.mutate({ studentId: s.studentId })}
                          >
                            {isIssuing
                              ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              : <SendHorizonal className="w-3 h-3 mr-1" />
                            }
                            Issue Certificate
                          </Button>
                        )}
                      </div>

                      {/* Lecture progress */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Lectures</span>
                          <span>{s.completedLectures} / {s.totalLectures}</span>
                        </div>
                        <Progress value={lectPct} className="h-1.5" />
                      </div>

                      {/* Quiz + assignments summary */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {s.totalQuizzes > 0 && (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            Quizzes passed: {s.quizPasses}/{s.totalQuizzes}
                          </span>
                        )}
                        {s.totalAssignments > 0 && (
                          <span className="flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            Assignments: {s.assignmentsSubmitted}/{s.totalAssignments}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
