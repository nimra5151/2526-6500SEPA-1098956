import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, ClipboardList, FileCheck, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// #164: Per-class student progress dashboard (tutor view)
export default function ClassProgress() {
  const [, params] = useRoute("/classes/:id/progress");
  const classId = params?.id;

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
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium text-sm">{s.name}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.hasCertificate && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              <Award className="w-3 h-3 mr-1" /> Certified
                            </Badge>
                          )}
                          {s.avgGrade !== null && (
                            <Badge variant="outline" className="text-xs">
                              Avg grade: {s.avgGrade}%
                            </Badge>
                          )}
                        </div>
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
