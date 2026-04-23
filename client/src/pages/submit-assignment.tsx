import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from"wouter";
import { useQuery, useMutation } from"@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { motion } from"framer-motion";
import { authFetch } from"@/lib/api";
import { useToast } from"@/hooks/use-toast";
import { useAuth } from"@/lib/auth";
import { Calendar, FileText, CheckCircle, Loader2, Send, Award, Upload, Paperclip, X, Sparkles, WifiOff } from "lucide-react";
import { queueSubmission } from "@/lib/offline-db";
import type { Assignment, AssignmentSubmission } from"@shared/schema";

export default function SubmitAssignment() {
  const [, params] = useRoute("/submit-assignment/:id");
  const assignmentId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  // #139: auto-save draft to localStorage
  const DRAFT_KEY = `assignment-draft-${assignmentId}`;
  const [content, setContent] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ""; } catch { return ""; }
  });
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // #187: show celebration screen immediately after successful submit
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Persist draft on every content change
  useEffect(() => {
    try { if (content) localStorage.setItem(DRAFT_KEY, content); else localStorage.removeItem(DRAFT_KEY); } catch {}
  }, [content, DRAFT_KEY]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await authFetch("/api/upload/assignment", {
        method:"POST",
        body: formData,
      });
      setFileUrl(data.fileUrl);
      setFileName(data.filename);
      toast({ title:"File uploaded successfully!" });
    } catch (err: any) {
      // #133: clear the file state so user can retry without stale "attached" indicator
      setFileUrl(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title:"Upload failed", description: err.message, variant:"destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: assignment, isLoading } = useQuery<Assignment>({
    queryKey: ["assignment", assignmentId],
    queryFn: () => authFetch(`/api/assignments/${assignmentId}`),
    enabled: !!assignmentId,
  });

  const { data: existingSubmission, refetch } = useQuery<AssignmentSubmission | null>({
    queryKey: ["submission", assignmentId],
    queryFn: () => authFetch(`/api/assignment-submissions/my/${assignmentId}`),
    enabled: !!assignmentId && !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Offline queue: save to IndexedDB if no internet
      if (!navigator.onLine) {
        await queueSubmission({
          assignmentId,
          assignmentTitle: assignment?.title || "Assignment",
          content,
          fileUrl: fileUrl ?? null,
        });
        return { queued: true };
      }
      return authFetch("/api/assignment-submissions", {
        method: "POST",
        body: JSON.stringify({ assignmentId, content, fileUrl }),
      });
    },
    onSuccess: (data: any) => {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      if (data?.queued) {
        toast({
          title: "Saved. Will submit when you're back online.",
          description: "Your assignment has been saved locally and will auto-submit when internet is restored.",
        });
        return;
      }
      setJustSubmitted(true);
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Assignment not found.</p>
      </div>
    );
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  // #187: celebration screen shown immediately after successful submission
  if (justSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Confetti */}
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
                className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-200 dark:shadow-green-900/30"
              >
                <CheckCircle className="w-14 h-14 text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-6 h-6 text-amber-500" />
                Submitted!
                <Sparkles className="w-6 h-6 text-amber-500" />
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-slate-500 mb-8"
              >
                Great work! Your assignment has been delivered to your tutor for grading.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex gap-3 justify-center"
              >
                <Button variant="outline" onClick={() => setLocation("/student-dashboard")}>
                  Back to Dashboard
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => { setJustSubmitted(false); refetch(); }}
                >
                  View Submission
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (existingSubmission) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-10 text-center">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-green-100">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Assignment Submitted</h2>
              <p className="text-slate-500 mb-6">Your work has been submitted successfully.</p>

              {existingSubmission.grade !== null && existingSubmission.grade !== undefined ? (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-6 mb-6">
                  <div className="text-5xl font-bold text-indigo-600 mb-1">{existingSubmission.grade}<span className="text-2xl text-slate-400">/{assignment.maxScore}</span></div>
                  <div className="text-slate-500 text-sm mb-3">Grade</div>
                  {existingSubmission.feedback && (
                    <div className="text-left bg-white dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Instructor Feedback:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{existingSubmission.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 mb-6">Awaiting Grade</Badge>
              )}

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-left mb-6">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your Submission:</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{existingSubmission.content}</p>
              </div>

              <Button variant="outline" onClick={() => setLocation("/student-dashboard")}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{assignment.title}</h1>
          <p className="text-slate-500">{assignment.description}</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Max score: <strong>{assignment.maxScore}</strong></span>
              </div>
              {assignment.dueDate && (
                <div className={`flex items-center gap-2 ${isOverdue ?"text-red-500" :""}`}>
                  <Calendar className="w-4 h-4" />
                  <span>Due: <strong>{new Date(assignment.dueDate).toLocaleDateString()}</strong></span>
                  {isOverdue && <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>}
                </div>
              )}
            </div>

            {assignment.instructions && (
              <div className="mt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Instructions
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{assignment.instructions}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b">
            <CardTitle>Your Submission</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your assignment response here..."
              rows={10}
              className="resize-none"
            />
            <p className="text-xs text-slate-400">{content.length} characters</p>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Upload File (optional)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
              />
              {fileUrl ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400 flex-1 truncate">{fileName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => { setFileUrl(null); setFileName(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ?"Uploading..." :"Choose File"}
                </Button>
              )}
              <p className="text-xs text-slate-400 mt-2">Max 10MB. PDF, Word, ZIP, images supported.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setLocation("/student-dashboard")}>Cancel</Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              if (!content.trim() && !fileUrl) {
                toast({ title: "Please add your answer text or upload a file", variant: "destructive" });
                return;
              }
              submitMutation.mutate();
            }}
            disabled={(!content.trim() && !fileUrl) || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Assignment
          </Button>
        </div>
      </div>
    </div>
  );
}
