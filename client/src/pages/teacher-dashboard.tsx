import { useState, useMemo } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import type { Class, Booking, Review, Notification } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Users, BookOpen, BarChart3, TrendingUp, Award, FileText,
  Eye, Clock, CheckCircle, AlertCircle, XCircle,
  Calendar, MessageSquare,
  Plus, Video, Bell, Wand2, Star, Loader2, X, Download, ClipboardList,
  Flame, Target, Bot, MessageCircle, ChevronRight, Sparkles,
  Flag, GraduationCap, Edit, Archive, RotateCcw, Megaphone, Trash2,
  ExternalLink, Copy, Check, WifiOff, Wifi,
} from 'lucide-react';
import { DashboardSkeleton, StatCard, PageHeader, ClassCardListSkeleton, ListItemSkeleton, EmptyState } from '@/components/skeleton-loader';
import { StaggeredStatGrid } from '@/components/dashboard-ui';
import { OnboardingModal } from '@/components/onboarding-modal';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

export default function TeacherDashboard() {
  const searchStr = useSearch();
  const initialTab = new URLSearchParams(searchStr).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedQuizResult, setSelectedQuizResult] = useState<any>(null);
  const [previewingQuiz, setPreviewingQuiz] = useState<any>(null);
  const [gradingAssignment, setGradingAssignment] = useState<any>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [aiGradeLoading, setAiGradeLoading] = useState(false);
  const [aiGradeSuggestion, setAiGradeSuggestion] = useState('');
  const [studentsClassFilter, setStudentsClassFilter] = useState<number | null>(null);
  const [aiToolsClassId, setAiToolsClassId] = useState<number | null>(null);
  const [aiToolsType, setAiToolsType] = useState<string>('');
  const [aiToolsLoading, setAiToolsLoading] = useState(false);
  const [aiToolsResult, setAiToolsResult] = useState('');
  const [aiToolsCopied, setAiToolsCopied] = useState(false);
  const [flaggingStudent, setFlaggingStudent] = useState<{ studentId: number; className: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [expandedClassLessons, setExpandedClassLessons] = useState<number | null>(null);
  // #84: confirmation dialog state for destructive/expensive actions
  const [confirmArchive, setConfirmArchive] = useState<any>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState<any>(null);
  // Live Session dialog
  const [showLiveDialog, setShowLiveDialog] = useState(false);
  const [copiedClassId, setCopiedClassId] = useState<number | null>(null);
  const [startingClassId, setStartingClassId] = useState<number | null>(null);
  const [endingClassId, setEndingClassId] = useState<number | null>(null);

  // #167: announcement state
  const [announcingClass, setAnnouncingClass] = useState<any>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => authFetch('/api/dashboard/stats'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: myClasses, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', 'my', 'teaching'],
    queryFn: () => authFetch('/api/classes/my/teaching'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: myBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => authFetch('/api/bookings'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: myReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', 'user', user?.id],
    queryFn: () => authFetch(`/api/reviews/user/${user!.id}`),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authFetch('/api/notifications?limit=20'),
    enabled: !!user,
  });

  const classCount = stats?.classCount ?? 0;
  const upcomingCount = stats?.upcomingCount ?? 0;
  const completedCount = stats?.completedCount ?? 0;
  const totalHours = stats?.totalHours ?? 0;
  const avgRating = stats?.avgRating ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;

  const confirmedBookings = (myBookings || []).filter((b: any) => b.status === 'confirmed');
  const completedBookings = (myBookings || []).filter((b: any) => b.status === 'completed');

  const classStatusData = [
    { name: 'Active', value: (myClasses || []).filter((c: any) => c.status === 'active').length, color: '#10B981' },
    { name: 'Completed', value: (myClasses || []).filter((c: any) => c.status === 'completed').length, color: '#3B82F6' },
    { name: 'Cancelled', value: (myClasses || []).filter((c: any) => c.status === 'cancelled').length, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const ratingDistribution = (() => {
    const reviews = myReviews || [];
    const dist = [
      { name: '5 Stars', value: reviews.filter((r: any) => r.rating === 5).length, color: '#10B981' },
      { name: '4 Stars', value: reviews.filter((r: any) => r.rating === 4).length, color: '#3B82F6' },
      { name: '3 Stars', value: reviews.filter((r: any) => r.rating === 3).length, color: '#F59E0B' },
      { name: '2 Stars', value: reviews.filter((r: any) => r.rating === 2).length, color: '#F97316' },
      { name: '1 Star', value: reviews.filter((r: any) => r.rating === 1).length, color: '#EF4444' },
    ];
    return dist.filter(d => d.value > 0);
  })();

  const monthlyData = (() => {
    const allBookings = myBookings || [];
    const months: Record<string, { month: string; bookings: number; completed: number }> = {};
    allBookings.forEach((b: any) => {
      const date = new Date(b.scheduledDate || b.createdAt);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: key, bookings: 0, completed: 0 };
      months[key].bookings++;
      if (b.status === 'completed') months[key].completed++;
    });
    return Object.values(months).slice(-6);
  })();

  // ── Impact metrics ──────────────────────────────────────────────────────
  const uniqueStudentIds = new Set<number>();
  (myBookings || []).forEach((b: any) => { if (b.studentId) uniqueStudentIds.add(b.studentId); });
  const totalStudentsHelped = uniqueStudentIds.size;
  const hoursVolunteered = Math.round(completedBookings.reduce((acc: number, b: any) => acc + (b.duration || 60), 0) / 60);
  // pendingGradesCount computed after allSubmissions query (below)

  const handleExport = <T extends Record<string, unknown>>(data: T[], filename: string) => {
    if (!data || data.length === 0) {
      toast({ title: 'Nothing to export', description: 'No data available for this export.', variant: 'destructive' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: myQuizzes = [] } = useQuery({
    queryKey: ['quizzes', 'my'],
    queryFn: () => authFetch('/api/quizzes'),
    enabled: !!user,
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['assignments', 'my'],
    queryFn: () => authFetch('/api/assignments'),
    enabled: !!user,
  });

  // Get all quiz results for my quizzes — single batch request instead of per-quiz N+1
  const { data: allQuizResults = [] } = useQuery({
    queryKey: ['quiz-results', 'my-quizzes'],
    queryFn: () => authFetch('/api/quiz-results/my-quizzes'),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Get all assignment submissions for my assignments — single batch request instead of per-assignment N+1
  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['submissions', 'my-assignments'],
    queryFn: () => authFetch('/api/assignment-submissions/my-assignments'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const pendingGradesCount = (allSubmissions as any[]).filter((s: any) => s.grade === null || s.grade === undefined).length;

  const myClassIds = useMemo(() => (myClasses || []).map((c: any) => c.id), [myClasses]);

  // Fetch all discussions from my classes
  const { data: allDiscussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ['discussions', 'my-classes', myClassIds],
    queryFn: async () => {
      const results: any[] = [];
      for (const cls of (myClasses || [])) {
        try {
          const r = await authFetch(`/api/classes/${cls.id}/discussions?limit=20`);
          if (Array.isArray(r)) {
            r.forEach((d: any) => results.push({ ...d, className: cls.title, classId: cls.id }));
          }
        } catch (err) { console.error('Failed to fetch discussions for class', cls.id, err); }
      }
      return results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: (myClasses || []).length > 0,
  });

  const { data: myCertificates = [] } = useQuery<any[]>({
    queryKey: ['teacher', 'certificates'],
    queryFn: () => authFetch('/api/teacher/certificates'),
    enabled: !!user,
  });

  const { data: myLessons = [] } = useQuery({
    queryKey: ['lessons', 'my'],
    queryFn: () => authFetch('/api/lessons'),
    enabled: !!user,
  });

  const gradeMutation = useMutation({
    mutationFn: ({ assignmentId, submissionId, grade, feedback }: { assignmentId: number; submissionId: number; grade: number; feedback: string }) =>
      authFetch(`/api/assignments/${assignmentId}/grade-with-email`, {
        method: 'POST',
        body: JSON.stringify({ submissionId, grade, feedback }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'my-assignments'] });
      setGradingAssignment(null);
      setGradeValue('');
      setFeedbackValue('');
      setAiGradeSuggestion('');
      if (data?.emailSent === false) {
        toast({ title: 'Grade saved, but email notification failed.', description: 'The grade was recorded. The student was not emailed — check your email configuration.', variant: 'destructive' });
      } else {
        toast({ title: 'Grade submitted and student notified.' });
      }
    },
    onError: (err: Error) => toast({ title: 'Failed to submit grade', description: err.message, variant: 'destructive' }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => authFetch(`/api/lessons/${lessonId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', 'my'] });
      toast({ title: 'Lesson deleted.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to delete lesson', description: err.message, variant: 'destructive' }),
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId: number) => authFetch(`/api/quizzes/${quizId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-results', 'my-quizzes'] });
      toast({ title: 'Quiz deleted.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to delete quiz', description: err.message, variant: 'destructive' }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => authFetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'my'] });
      toast({ title: 'Assignment deleted.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to delete assignment', description: err.message, variant: 'destructive' }),
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      authFetch(`/api/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      toast({ title: 'Session status updated.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' }),
  });

  const flagStudentMutation = useMutation({
    mutationFn: ({ studentId, className, reason }: { studentId: number; className: string; reason: string }) =>
      authFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'safety_concern',
          targetType: 'user',
          targetId: studentId,
          description: reason || `Student concern raised for Student #${studentId} in class "${className}".`,
        }),
      }),
    onSuccess: () => {
      setFlaggingStudent(null);
      setFlagReason('');
      toast({ title: 'Concern flagged. Coordinators have been notified.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to submit flag', description: err.message, variant: 'destructive' }),
  });

  const startZoomMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      toast({ title: 'Zoom meeting started! Share the link with your students.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to start meeting', description: err.message, variant: 'destructive' }),
  });

  const endZoomMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      toast({ title: 'Zoom meeting ended.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to end meeting', description: err.message, variant: 'destructive' }),
  });

  const duplicateLessonMutation = useMutation({
    mutationFn: (lesson: any) =>
      authFetch('/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: `${lesson.title} (Copy)`,
          description: lesson.description,
          content: lesson.content,
          duration: lesson.duration,
          difficulty: lesson.difficulty,
          classId: lesson.classId,
          sections: lesson.sections,
          attachments: lesson.attachments,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', 'my'] });
      toast({ title: 'Lesson duplicated with all attachments.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to duplicate lesson', description: err.message, variant: 'destructive' }),
  });

  // #167: announcement mutation
  const announceMutation = useMutation({
    mutationFn: ({ classId, title, message }: { classId: number; title: string; message: string }) =>
      authFetch(`/api/classes/${classId}/announce`, { method: 'POST', body: JSON.stringify({ title, message }) }),
    onSuccess: (data: any) => {
      const failed = (data.total || 0) - (data.sent || 0);
      if (failed > 0) {
        toast({ title: `Delivered to ${data.sent} of ${data.total} students`, description: `${failed} student${failed !== 1 ? 's' : ''} could not be notified.`, variant: 'destructive' });
      } else {
        toast({ title: `Announcement delivered to ${data.sent} of ${data.total} student${data.total !== 1 ? 's' : ''}.` });
      }
      setAnnouncingClass(null); setAnnounceTitle(''); setAnnounceMessage('');
    },
    onError: (err: Error) => toast({ title: 'Announcement failed', description: err.message, variant: 'destructive' }),
  });

  const editClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; description: string; status: string } }) =>
      authFetch(`/api/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      setEditingClass(null);
      toast({ title: 'Class updated successfully.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update class', description: err.message, variant: 'destructive' }),
  });

  const archiveClassMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      toast({ title: 'Class archived.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to archive class', description: err.message, variant: 'destructive' }),
  });

  const saveAiNoteMutation = useMutation({
    mutationFn: ({ topic, content, classId }: { topic: string; content: string; classId?: number }) =>
      authFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ topic, content, classId, tags: ['ai-generated'] }),
      }),
    onSuccess: () => toast({ title: 'AI result saved as a note.' }),
    onError: (err: Error) => toast({ title: 'Failed to save note', description: err.message, variant: 'destructive' }),
  });

  const returnAssignmentMutation = useMutation({
    mutationFn: ({ submissionId, studentId: _studentId, assignmentTitle: _assignmentTitle, feedback }: { submissionId: number; studentId: number; assignmentTitle: string; feedback: string }) =>
      // Backend now handles saving feedback and notifying the student atomically
      authFetch(`/api/assignment-submissions/${submissionId}/feedback`, {
        method: 'PATCH',
        body: JSON.stringify({ feedback }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'my-assignments'] });
      setGradingAssignment(null);
      setGradeValue('');
      setFeedbackValue('');
      setAiGradeSuggestion('');
      toast({ title: 'Assignment returned. Feedback saved and student notified.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to return assignment', description: err.message, variant: 'destructive' }),
  });

  const handleAiGrade = async () => {
    if (!gradingAssignment) return;
    setAiGradeLoading(true);
    setAiGradeSuggestion('');
    try {
      const result = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `You are grading a student assignment. Assignment title: "${gradingAssignment.assignmentTitle}". Student submission: "${gradingAssignment.content || '(file submission only)'}". Suggest a grade out of 100 and brief constructive feedback. Reply in exactly this format:\nGrade: [number]\nFeedback: [2-3 sentences]`,
        }),
      });
      setAiGradeSuggestion(result.message || result.reply || 'No suggestion available.');
    } catch {
      setAiGradeSuggestion('__error__'); // #83: sentinel so UI can show retry button
    } finally {
      setAiGradeLoading(false);
    }
  };

  const handleAiTools = async (cls: any, type: 'quiz' | 'summarize' | 'activities') => {
    setAiToolsClassId(cls.id);
    setAiToolsType(type);
    setAiToolsLoading(true);
    setAiToolsResult('');
    const prompts: Record<string, string> = {
      quiz: `Generate 5 multiple-choice quiz questions for a class titled "${cls.title}" (${cls.category || 'general'}, ${cls.skillLevel || 'beginner'} level). Format each as:\nQ: [question]\nA) [option] B) [option] C) [option] D) [option]\nAnswer: [letter]`,
      summarize: `Summarize the key learning objectives and topics for a class titled "${cls.title}" in the subject "${cls.category || 'general'}" at ${cls.skillLevel || 'beginner'} level. Give 5 concise bullet points.`,
      activities: `Suggest 5 engaging teaching activities for a class titled "${cls.title}" (${cls.category || 'general'}, ${cls.skillLevel || 'beginner'} level) suitable for orphanage students in an online tutoring session. Keep each activity practical and low-cost.`,
    };
    try {
      const result = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompts[type] }),
      });
      setAiToolsResult(result.message || result.reply || 'No response from AI.');
    } catch {
      setAiToolsResult('AI tools unavailable. Please check your OpenAI configuration.');
    } finally {
      setAiToolsLoading(false);
    }
  };

  // ── Per-class analytics — memoized to avoid O(classes × results) on every render
  const classAnalytics = useMemo(() => (myClasses || []).map((cls: any) => {
    const classQuizResults = (allQuizResults as any[]).filter((r: any) => r.quizClassId === cls.id);
    const avgScore = classQuizResults.length > 0
      ? Math.round(classQuizResults.reduce((s: number, r: any) => s + (r.score || 0), 0) / classQuizResults.length)
      : null;
    const classAssignmentIds = (myAssignments as any[]).filter((a: any) => a.classId === cls.id).map((a: any) => a.id);
    const classSubs = (allSubmissions as any[]).filter((s: any) => classAssignmentIds.includes(s.assignmentId));
    const gradedCount = classSubs.filter((s: any) => s.grade !== null && s.grade !== undefined).length;
    return {
      id: cls.id,
      title: cls.title,
      enrolled: cls.enrolledCount || 0,
      avgScore,
      quizAttempts: classQuizResults.length,
      submissionCount: classSubs.length,
      gradedCount,
    };
  }), [myClasses, allQuizResults, myAssignments, allSubmissions]);

  const isLoading = statsLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* #181: First-time onboarding modal for tutors */}
      <OnboardingModal userId={user?.id} userName={user?.name || 'Teacher'} role="tutor" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Teaching Dashboard"
          description={`Welcome back, ${user?.name || 'Teacher'}! Here's your teaching overview.`}
        />

        {/* 5 stat cards */}
        <StaggeredStatGrid columns={5}>
          <StatCard label="My Classes" value={classCount} icon={BookOpen} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400" trend={`${(myClasses || []).filter((c: any) => c.status === 'active').length} active`} />
          <StatCard label="Total Students" value={totalStudents} icon={Users} iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-600 dark:text-violet-400" trend="Unique students" />
          <StatCard label="Teaching Hours" value={`${Math.round(totalHours)}h`} icon={Clock} iconBg="bg-sky-100 dark:bg-sky-900/30" iconColor="text-sky-600 dark:text-sky-400" trend={`${completedCount} sessions`} />
          <StatCard label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : 'N/A'} icon={Star} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" trend={`${(myReviews || []).length} reviews`} />
          <StatCard label="Sessions Done" value={completedCount} icon={CheckCircle} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" trend={completedCount > 0 ? 'Great work!' : 'Get started'} />
        </StaggeredStatGrid>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1">
            <TabsList className="mb-6 bg-card border border-border/60 dark:border-slate-800 shadow-sm h-10 p-1 rounded-lg w-max min-w-full sm:min-w-0">
              <TabsTrigger value="overview" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="my-classes" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">My Classes</TabsTrigger>
              <TabsTrigger value="schedule" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Schedule</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Analytics</TabsTrigger>
              <TabsTrigger value="reviews" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Reviews</TabsTrigger>
              <TabsTrigger value="quiz-results" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Quiz Results</TabsTrigger>
              <TabsTrigger value="assignments" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                Assignments
                {pendingGradesCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {pendingGradesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="discussions" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Discussions</TabsTrigger>
              <TabsTrigger value="students" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Students</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'New Class', icon: Plus, href: '/classes/create', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                { label: 'New Lesson', icon: FileText, href: '/create-lesson', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
                { label: 'New Quiz', icon: CheckCircle, href: '/create-quiz', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                { label: 'New Assignment', icon: ClipboardList, href: '/create-assignment', color: 'bg-violet-600 hover:bg-violet-700 text-white' },
              ].map(action => (
                <Link key={action.label} href={action.href}>
                  <Button className={`w-full h-14 flex-col gap-1 text-xs font-medium ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                    {action.label}
                  </Button>
                </Link>
              ))}
              <Button
                className="w-full h-14 flex-col gap-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white relative"
                onClick={() => setShowLiveDialog(true)}
              >
                {(myClasses as any[] || []).some((c: any) => c.zoomMeetingId) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
                <Video className="w-5 h-5" />
                Live Session
              </Button>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Students Helped', value: totalStudentsHelped, icon: Users, bg: 'bg-indigo-50 dark:bg-indigo-950/30', color: 'text-indigo-600' },
                { label: 'Hours Volunteered', value: `${hoursVolunteered}h`, icon: Flame, bg: 'bg-orange-50 dark:bg-orange-950/30', color: 'text-orange-500' },
                { label: 'Quiz Attempts', value: (allQuizResults as any[]).length, icon: Target, bg: 'bg-sky-50 dark:bg-sky-950/30', color: 'text-sky-600' },
                {
                  label: 'Certificates Issued',
                  value: (myCertificates as any[]).filter((c: any) => c.status === 'approved').length,
                  icon: GraduationCap,
                  bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                  color: 'text-emerald-600',
                  sub: (myCertificates as any[]).filter((c: any) => c.status === 'pending').length > 0
                    ? `${(myCertificates as any[]).filter((c: any) => c.status === 'pending').length} pending approval`
                    : undefined,
                },
                { label: 'Pending Grades', value: pendingGradesCount, icon: ClipboardList, bg: 'bg-amber-50 dark:bg-amber-950/30', color: 'text-amber-600' },
              ].map(stat => (
                <Card key={stat.label} className={`border border-border/60 dark:border-slate-800 shadow-sm ${stat.bg}`}>
                  <CardContent className="p-5 flex items-center gap-3">
                    <stat.icon className={`w-8 h-8 shrink-0 ${stat.color}`} />
                    <div>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                      {(stat as any).sub && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">{(stat as any).sub}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800">
                  <CardTitle>Booking Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" strokeOpacity={0.5} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="#6366F1" 
                          fillOpacity={1} 
                          fill="url(#colorBookings)"
                          name="Bookings"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completed" 
                          stroke="#10B981" 
                          fill="none"
                          name="Completed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-slate-500">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No booking activity yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800">
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {ratingDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ratingDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {ratingDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-slate-500">
                      <div className="text-center">
                        <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No reviews yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800">
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {(notifications || []).length > 0 ? (
                  <div className="space-y-3">
                    {(notifications || []).slice(0, 5).map((notif: Notification) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.isRead) {
                            authFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' })
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
                              })
                              .catch(() => {});
                          }
                          if (notif.link) setLocation(notif.link);
                        }}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${notif.link ? 'cursor-pointer hover:bg-muted/40' : ''} hover:border-indigo-200 dark:hover:border-indigo-900`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${notif.isRead ? 'bg-slate-300' : 'bg-indigo-600'}`} />
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {notif.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {notif.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(notif.createdAt as unknown as string).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          notif.type === 'booking' ? 'bg-blue-100 text-blue-700' :
                          notif.type === 'review' ? 'bg-amber-100 text-amber-700' :
                          notif.type === 'message' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {notif.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No notifications yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-classes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">My Classes</h3>
              {(myClasses || []).length > 0 && (
                <Button variant="outline" size="sm" onClick={() => handleExport(myClasses, 'my-classes')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
            {classesLoading ? (
              <div className="grid gap-4">
                {[0, 1, 2].map(i => <ClassCardListSkeleton key={i} />)}
              </div>
            ) : (myClasses || []).length > 0 ? (
              <div className="grid gap-4">
                {(myClasses || []).map((cls: Class) => (
                  <div key={cls.id} className="space-y-1">
                  <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg text-foreground">
                              {cls.title}
                            </h4>
                            <Badge className={
                              cls.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              cls.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {cls.status}
                            </Badge>
                            <Badge className="bg-slate-100 text-slate-700">
                              {cls.courseType}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                            {cls.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {cls.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {cls.enrolledCount || 0}/{cls.maxStudents || 10} students
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {cls.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {cls.viewCount || 0} views
                            </span>
                            {cls.scheduleDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(cls.scheduleDate).toLocaleDateString()}
                                {cls.scheduleTime && ` at ${cls.scheduleTime}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedClass(cls)}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> Details
                          </Button>
                          <Link href={`/classes/${cls.id}`}>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                              <Eye className="w-3.5 h-3.5 mr-1.5" /> View Page
                            </Button>
                          </Link>
                          <Link href={`/create-lesson?classId=${cls.id}`}>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                              <FileText className="w-3.5 h-3.5 mr-1.5" /> + Lesson
                            </Button>
                          </Link>
                          <Link href={`/create-quiz?classId=${cls.id}`}>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> + Quiz
                            </Button>
                          </Link>
                          <Link href={`/create-assignment?classId=${cls.id}`}>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20">
                              <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> + Assignment
                            </Button>
                          </Link>
                          {/* Zoom meeting */}
                          {cls.zoomMeetingId ? (
                            <>
                              {cls.zoomMeetingUrl && (
                                <a href={cls.zoomMeetingUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="w-full h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/20">
                                    <Video className="w-3.5 h-3.5 mr-1.5" /> Join Meeting
                                  </Button>
                                </a>
                              )}
                              <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                                disabled={endZoomMutation.isPending}
                                onClick={() => endZoomMutation.mutate(cls.id)}>
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> End Meeting
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                              disabled={startZoomMutation.isPending}
                              onClick={() => startZoomMutation.mutate(cls.id)}>
                              <Video className="w-3.5 h-3.5 mr-1.5" /> Start Meeting
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Class action menu */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setEditingClass(cls); setEditTitle(cls.title); setEditDescription(cls.description || ''); setEditStatus(cls.status || 'active'); }}>
                          <Edit className="w-3 h-3 mr-1.5" /> Edit Class
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setStudentsClassFilter(cls.id); setActiveTab('students'); }}>
                          <Users className="w-3 h-3 mr-1.5" /> View Students
                        </Button>
                        {/* #164: link to per-class progress dashboard */}
                        <Link href={`/classes/${cls.id}/progress`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-950/20">
                            <TrendingUp className="w-3 h-3 mr-1.5" /> Progress
                          </Button>
                        </Link>
                        {/* #167: announce to enrolled students */}
                        <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/20"
                          onClick={() => { setAnnouncingClass(cls); setAnnounceTitle(''); setAnnounceMessage(''); }}>
                          <Megaphone className="w-3 h-3 mr-1.5" /> Announce
                        </Button>
                        <Link href={`/create-lesson?classId=${cls.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:border-sky-900 dark:hover:bg-sky-950/20">
                            <FileText className="w-3 h-3 mr-1.5" /> Add Lesson
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setActiveTab('analytics')}>
                          <BarChart3 className="w-3 h-3 mr-1.5" /> View Analytics
                        </Button>
                        {cls.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
                            disabled={archiveClassMutation.isPending}
                            onClick={() => setConfirmArchive(cls)}>
                            {/* #84: opens confirmation dialog instead of window.confirm */}
                            <Archive className="w-3 h-3 mr-1.5" /> Archive Class
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Teaching Tools */}
                  <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI Teaching Tools</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300"
                        disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'quiz'}
                        onClick={() => handleAiTools(cls, 'quiz')}>
                        {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'quiz'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                        Generate Quiz Questions
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-sky-200 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300"
                        disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'summarize'}
                        onClick={() => handleAiTools(cls, 'summarize')}>
                        {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'summarize'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          : <Bot className="w-3.5 h-3.5 mr-1.5" />}
                        Summarize Lesson
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300"
                        disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'activities'}
                        onClick={() => handleAiTools(cls, 'activities')}>
                        {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'activities'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                        Suggest Activities
                      </Button>
                    </div>
                    {aiToolsClassId === cls.id && aiToolsResult && (
                      <div className="space-y-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-card border border-indigo-100 dark:border-indigo-900 rounded-lg p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {aiToolsResult}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                            disabled={saveAiNoteMutation.isPending}
                            onClick={() => saveAiNoteMutation.mutate({
                              topic: `AI ${aiToolsType === 'quiz' ? 'Quiz Questions' : aiToolsType === 'summarize' ? 'Summary' : 'Activities'}: ${cls.title}`,
                              content: aiToolsResult,
                              classId: cls.id,
                            })}>
                            {saveAiNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Save as Note
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(aiToolsResult).then(() => {
                                setAiToolsCopied(true);
                                setTimeout(() => setAiToolsCopied(false), 2000);
                              });
                            }}>
                            {aiToolsCopied ? 'Copied!' : 'Copy'}
                          </Button>
                          {aiToolsType === 'quiz' && (
                            <a href={`/create-quiz?classId=${cls.id}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                                Create Quiz
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lessons expandable */}
                  <div className="rounded-xl border border-border/60 dark:border-slate-700 bg-card/50 overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      onClick={() => setExpandedClassLessons(expandedClassLessons === cls.id ? null : cls.id)}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Lessons ({(myLessons as any[]).filter((l: any) => l.classId === cls.id).length})
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform text-slate-400 ${expandedClassLessons === cls.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedClassLessons === cls.id && (
                      <div className="border-t border-slate-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                        {(myLessons as any[]).filter((l: any) => l.classId === cls.id).length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-400 italic">No lessons yet. <Link href={`/create-lesson?classId=${cls.id}`}><span className="text-indigo-600 hover:underline cursor-pointer">Create one</span></Link></p>
                        ) : (
                          (myLessons as any[]).filter((l: any) => l.classId === cls.id).map((lesson: any) => (
                            <div key={lesson.id} className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{lesson.difficulty || 'beginner'} · {lesson.duration || 0} min</p>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/create-lesson?classId=${lesson.classId}&lessonId=${lesson.id}`}>
                                  <Button size="sm" variant="outline" className="h-7 text-xs">
                                    <Edit className="w-3 h-3 mr-1" /> Edit
                                  </Button>
                                </Link>
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  disabled={duplicateLessonMutation.isPending}
                                  onClick={() => setConfirmDuplicate(lesson)}>
                                  Duplicate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  disabled={deleteLessonMutation.isPending}
                                  onClick={() => {
                                    if (window.confirm(`Delete "${lesson.title}"? This cannot be undone.`)) {
                                      deleteLessonMutation.mutate(lesson.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Classes Yet</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">Create your first class to start teaching!</p>
                  <Link href="/create-lesson">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Class
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── STUDENTS ──────────────────────────────────────────────────────── */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Students by Class</h3>
              <select
                className="border border-border/60 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-card text-slate-700 dark:text-slate-300 w-full sm:w-auto"
                value={studentsClassFilter ?? ''}
                onChange={e => setStudentsClassFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Classes</option>
                {(myClasses || []).map((cls: Class) => (
                  <option key={cls.id} value={cls.id}>{cls.title}</option>
                ))}
              </select>
            </div>

            {(() => {
              const studentMap: Record<string, { studentId: number; studentName: string | null; classId: number; className: string; sessionCount: number }> = {};
              (myBookings || []).forEach((b: any) => {
                if (!b.studentId) return;
                const cls = (myClasses || []).find((c: any) => c.id === b.classId);
                const key = `${b.classId}-${b.studentId}`;
                if (!studentMap[key]) {
                  studentMap[key] = { studentId: b.studentId, studentName: b.studentName || null, classId: b.classId, className: cls?.title || `Class #${b.classId}`, sessionCount: 0 };
                }
                studentMap[key].sessionCount++;
              });
              const rows = Object.values(studentMap).filter(s =>
                studentsClassFilter === null || s.classId === studentsClassFilter
              );

              if (rows.length === 0) {
                return (
                  <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Students Yet</h3>
                      <p className="text-slate-600 dark:text-slate-400">Students will appear here once they book sessions with you.</p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b dark:border-slate-700">
                    <CardTitle className="text-xl text-foreground">
                      {rows.length} Student{rows.length !== 1 ? 's' : ''}
                      {studentsClassFilter ? ` in selected class` : ` across all classes`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                          {rows.map(row => (
                            <tr key={`${row.classId}-${row.studentId}`} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{row.studentName?.charAt(0).toUpperCase() || 'S'}</span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground">{row.studentName || `Student #${row.studentId}`}</p>
                                    <Link href={`/profile/${row.studentId}`}>
                                      <span className="text-xs text-indigo-600 hover:underline cursor-pointer">View Profile</span>
                                    </Link>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{row.className}</td>
                              <td className="px-6 py-4">
                                <Badge className="bg-indigo-100 text-indigo-700">{row.sessionCount} session{row.sessionCount !== 1 ? 's' : ''}</Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={`/profile/${row.studentId}`}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/20">
                                      <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> View Progress
                                    </Button>
                                  </Link>
                                  <Link href="/messages">
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/20">
                                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Send Message
                                    </Button>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
                                    onClick={() => setFlaggingStudent({ studentId: row.studentId, className: row.className })}
                                  >
                                    <Flag className="w-3.5 h-3.5 mr-1.5" /> Flag for Coordinator
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {bookingsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
              </div>
            ) : (
              <>
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-border/40 dark:border-slate-800">
                    <CardTitle>Upcoming Sessions ({confirmedBookings.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {confirmedBookings.length > 0 ? (
                      <div className="space-y-3">
                        {confirmedBookings.map((booking: Booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">
                                  {(booking as any).classTitle || `Session #${booking.id}`}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(booking.scheduledDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {booking.scheduledTime && ` at ${booking.scheduledTime}`}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Duration: {booking.duration || 60} min · {(booking as any).studentName || `Student #${booking.studentId}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className="bg-blue-100 text-blue-700">
                                <Clock className="w-3 h-3 mr-1" />
                                {booking.status}
                              </Badge>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                disabled={updateBookingStatusMutation.isPending}
                                onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: 'completed' })}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 text-xs"
                                disabled={updateBookingStatusMutation.isPending}
                                onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: 'no-show' })}>
                                <XCircle className="w-3.5 h-3.5 mr-1" /> No-Show
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No upcoming sessions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-border/40 dark:border-slate-800">
                    <CardTitle>Completed Sessions ({completedBookings.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {completedBookings.length > 0 ? (
                      <div className="space-y-3">
                        {completedBookings.slice(0, 10).map((booking: Booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border transition-colors">
                            <div>
                              <h4 className="font-semibold text-foreground">
                                  {(booking as any).classTitle || `Session #${booking.id}`}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(booking.scheduledDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {booking.scheduledTime && ` at ${booking.scheduledTime}`}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">{booking.duration || 60} min · {(booking as any).studentName || `Student #${booking.studentId}`}</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No completed sessions yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {reviewsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
              </div>
            ) : (myReviews || []).length > 0 ? (
              <>
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-border/40 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <CardTitle>Reviews ({(myReviews || []).length})</CardTitle>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="text-xl font-bold text-foreground">
                          {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
                        </span>
                        <span className="text-sm text-slate-500">average</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {(myReviews || []).map((review: Review) => (
                        <div key={review.id} className="p-4 rounded-lg border hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                  {((review as any).reviewerName || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-semibold text-foreground">
                                {(review as any).reviewerName || 'Anonymous'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-slate-600 dark:text-slate-400">
                              {review.comment}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500">
                              {new Date(review.createdAt as unknown as string).toLocaleDateString()}
                            </p>
                            <Link href="/messages">
                              <Button size="sm" variant="outline" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/20">
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                Reply via Message
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Reviews Yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Reviews from your students will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quiz-results" className="space-y-6">
            {/* My Created Quizzes */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground">My Quizzes ({(myQuizzes as any[]).length})</CardTitle>
                  <Link href="/create-quiz">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                      <Plus className="w-4 h-4" /> New Quiz
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(myQuizzes as any[]).length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No quizzes created yet. Click "New Quiz" to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {(myQuizzes as any[]).map((quiz: any) => {
                      const quizLink = `${window.location.origin}/take-quiz/${quiz.id}`;
                      const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
                      return (
                        <div key={quiz.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                          <div>
                            <p className="font-semibold text-foreground">{quiz.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{questionCount} question{questionCount !== 1 ? 's' : ''}{quiz.timeLimit ? ` · ${quiz.timeLimit} min` : ''}{quiz.passingScore ? ` · Pass: ${quiz.passingScore}%` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(quizLink);
                                toast({ title: 'Link copied!', description: 'Share this link with your students.' });
                              }}
                            >
                              <FileText className="w-3.5 h-3.5" /> Copy Link
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs"
                              onClick={() => setPreviewingQuiz(quiz)}>
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              disabled={deleteQuizMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete "${quiz.title}"? This will also delete all student results for this quiz.`)) {
                                  deleteQuizMutation.mutate(quiz.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Submissions */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground">Student Submissions ({(allQuizResults as any[]).length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExport(allQuizResults as any[], 'quiz-results')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(allQuizResults as any[]).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No quiz results yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Quiz</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Score</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Passed</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Submitted</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {(allQuizResults as any[]).map((result: any) => (
                          <tr key={result.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{result.studentName || `Student #${result.studentId}`}</div>
                              <div className="text-xs text-slate-400">ID: {result.studentId}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">{result.quizTitle}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={
                                (result.score || 0) >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : (result.score || 0) >= 70 ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              }>
                                {result.score || 0}%
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {result.passed ? (
                                <Badge className="bg-emerald-100 text-emerald-700">Passed</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Failed</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                const quiz = (myQuizzes as any[]).find((q: any) => q.id === result.quizId);
                                const parseQuestions = (raw: any): any[] => {
                                  if (!raw) return [];
                                  if (Array.isArray(raw)) return raw;
                                  if (typeof raw === 'object') return [raw];
                                  try {
                                    const parsed = JSON.parse(raw);
                                    if (Array.isArray(parsed)) return parsed;
                                    if (parsed && typeof parsed === 'object') return [parsed];
                                  } catch {}
                                  return [];
                                };
                                const questions: any[] = parseQuestions(quiz?.questions);
                                const storedAnswers: Record<string, number> = (() => {
                                  if (!result.answers) return {};
                                  if (typeof result.answers === 'object' && !Array.isArray(result.answers)) return result.answers as Record<string, number>;
                                  try { return JSON.parse(result.answers); } catch { return {}; }
                                })();
                                const correctAnswers = questions.filter((q: any, idx: number) => storedAnswers[idx] === q.correctAnswer).length;
                                setSelectedQuizResult({ ...result, student: result.studentName || `Student #${result.studentId}`, studentId: result.studentId, quiz: result.quizTitle, correctAnswers, totalQuestions: questions.length, questions, storedAnswers, timeTaken: '—', submittedAt: result.completedAt ? new Date(result.completedAt).toLocaleString() : '—', className: '' });
                              }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ANALYTICS ────────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Per-class analytics table */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" /> Class Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {classAnalytics.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No classes yet" description="Create classes to see performance analytics." action={{ label: 'Create Class', href: '/classes/create' }} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Class</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Enrolled</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Avg Quiz Score</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Quiz Attempts</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Submissions</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Graded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {classAnalytics.map((cls: any) => (
                          <tr key={cls.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <Link href={`/classes/${cls.id}`}>
                                <span className="font-medium text-indigo-600 hover:underline cursor-pointer">{cls.title}</span>
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{cls.enrolled}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {cls.avgScore !== null ? (
                                <div className="flex items-center gap-2">
                                  <Badge className={cls.avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' : cls.avgScore >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                                    {cls.avgScore}%
                                  </Badge>
                                  <Progress value={cls.avgScore} className="h-1.5 w-16" />
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">No data</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{cls.quizAttempts}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{cls.submissionCount}</td>
                            <td className="px-6 py-4">
                              {cls.submissionCount > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{cls.gradedCount}/{cls.submissionCount}</span>
                                  <Progress value={(cls.gradedCount / cls.submissionCount) * 100} className="h-1.5 w-16" />
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avg score chart */}
            {classAnalytics.filter((c: any) => c.avgScore !== null).length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Average Quiz Score by Class
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={classAnalytics.filter((c: any) => c.avgScore !== null).map((c: any) => ({ name: c.title.length > 16 ? c.title.slice(0, 16) + '…' : c.title, score: c.avgScore }))}>
                      <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" strokeOpacity={0.5} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Avg Score']} />
                      <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── DISCUSSIONS ──────────────────────────────────────────────────── */}
          <TabsContent value="discussions" className="space-y-4">
            {discussionsLoading ? (
              <div className="space-y-3">{[0, 1, 2, 3].map(i => <ListItemSkeleton key={i} />)}</div>
            ) : (allDiscussions as any[]).length === 0 ? (
              <EmptyState icon={MessageSquare} title="No discussions yet" description="When students post in your class discussions, they will appear here." action={{ label: 'Browse Classes', href: '/classes' }} />
            ) : (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    All Class Discussions ({(allDiscussions as any[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y dark:divide-slate-700">
                    {(allDiscussions as any[]).map((disc: any) => (
                      <div key={disc.id} className="px-6 py-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {disc.isPinned && <Badge className="bg-amber-100 text-amber-700 text-xs">Pinned</Badge>}
                              <p className="font-medium text-foreground truncate">{disc.title}</p>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{disc.content}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">{disc.className}</span>
                              <span>{disc.replyCount || 0} replies</span>
                              <span>{disc.createdAt ? new Date(disc.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <Link href={`/classes/${disc.classId}`}>
                            <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs">
                              <ChevronRight className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            {/* My Created Assignments */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground">My Assignments ({(myAssignments as any[]).length})</CardTitle>
                  <Link href="/create-assignment">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                      <Plus className="w-4 h-4" /> New Assignment
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(myAssignments as any[]).length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No assignments created yet. Click "New Assignment" to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {(myAssignments as any[]).map((asgn: any) => {
                      const link = `${window.location.origin}/submit-assignment/${asgn.id}`;
                      const isOverdue = asgn.dueDate && new Date(asgn.dueDate) < new Date();
                      return (
                        <div key={asgn.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{asgn.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {asgn.dueDate && (
                                <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(asgn.dueDate).toLocaleDateString()}
                                  {isOverdue && <Badge className="bg-red-100 text-red-700 text-xs ml-1">Overdue</Badge>}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">Max: {asgn.maxScore || 100} pts</span>
                              {asgn.classId && <span className="text-xs text-indigo-500">Linked to class</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                              onClick={() => { navigator.clipboard.writeText(link); toast({ title: 'Link copied!', description: 'Share this with your students.' }); }}>
                              <FileText className="w-3.5 h-3.5" /> Copy Link
                            </Button>
                            <Link href={`/create-assignment?assignmentId=${asgn.id}`}>
                              <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              disabled={deleteAssignmentMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete "${asgn.title}"? This cannot be undone.`)) {
                                  deleteAssignmentMutation.mutate(asgn.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Submissions */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground">Student Assignments ({(allSubmissions as any[]).length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExport(allSubmissions as any[], 'assignments')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(allSubmissions as any[]).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No assignment submissions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Assignment</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Grade</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Submitted</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {(allSubmissions as any[]).map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{sub.studentName || `Student #${sub.studentId}`}</div>
                              <div className="text-xs text-slate-400">ID: {sub.studentId}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">{sub.assignmentTitle}</div>
                              {sub.fileUrl && (
                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">View File</a>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={
                                sub.grade !== null && sub.grade !== undefined
                                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                              }>
                                {sub.grade !== null && sub.grade !== undefined ? 'Graded' : 'Pending Review'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {sub.grade !== null && sub.grade !== undefined ? `${sub.grade}/${sub.maxScore ?? 100}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                size="sm"
                                className={sub.grade === null || sub.grade === undefined ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
                                variant={sub.grade !== null && sub.grade !== undefined ? 'outline' : 'default'}
                                onClick={() => {
                                  setGradingAssignment(sub);
                                  setGradeValue(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
                                  setFeedbackValue(sub.feedback || '');
                                }}
                              >
                                {sub.grade === null || sub.grade === undefined ? 'Grade Now' : 'View Grade'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedClass && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedClass(null)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-foreground">Class Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{selectedClass.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{selectedClass.description || 'No description provided.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Category</p>
                    <p className="text-foreground">{selectedClass.category || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Skill Level</p>
                    <Badge className="bg-indigo-100 text-indigo-700">{selectedClass.skillLevel || 'N/A'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Course Type</p>
                    <Badge className="bg-slate-100 text-slate-700">{selectedClass.courseType || 'N/A'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Duration</p>
                    <p className="text-foreground">{selectedClass.duration || 0} minutes</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Max Students</p>
                    <p className="text-foreground">{selectedClass.maxStudents || 'Unlimited'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Enrolled</p>
                    <p className="text-foreground">{selectedClass.enrolledCount || 0} students</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Language</p>
                    <p className="text-foreground">{selectedClass.language || 'English'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Views</p>
                    <p className="text-foreground flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedClass.viewCount || 0}
                    </p>
                  </div>
                </div>

                {(selectedClass.scheduleDate || selectedClass.scheduleTime) && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-medium text-slate-500 mb-1">Schedule</p>
                    <p className="text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {selectedClass.scheduleDate ? new Date(selectedClass.scheduleDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                      {selectedClass.scheduleTime && ` at ${selectedClass.scheduleTime}`}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Link href={`/classes/${selectedClass.id}`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Eye className="w-4 h-4 mr-2" />
                      View on Site
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setSelectedClass(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedQuizResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedQuizResult(null)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-card border-b dark:border-slate-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Quiz Results - {selectedQuizResult.student}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{selectedQuizResult.quiz}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuizResult(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{selectedQuizResult.score}%</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Final Score</div>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedQuizResult.correctAnswers}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Correct Answers</div>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedQuizResult.totalQuestions}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Questions</div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="text-3xl font-bold text-foreground">{selectedQuizResult.timeTaken}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Time Taken</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Submitted: {selectedQuizResult.submittedAt} | Class: {selectedQuizResult.className}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Question Breakdown</h3>
                  {selectedQuizResult.questions && selectedQuizResult.questions.length > 0 ? (
                    <div className="space-y-4">
                      {selectedQuizResult.questions.map((q: any, i: number) => {
                        const studentAnswer = selectedQuizResult.storedAnswers?.[i];
                        const isCorrect = studentAnswer === q.correctAnswer;
                        return (
                          <div key={i} className="border dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className={`px-4 py-3 flex items-center justify-between ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                              <span className="font-semibold text-foreground text-sm">Q{i + 1}: {q.question}</span>
                              {isCorrect ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0 ml-2"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Correct</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0 ml-2"><XCircle className="w-3.5 h-3.5 mr-1" /> Incorrect</Badge>
                              )}
                            </div>
                            <div className="px-4 py-3 space-y-1.5">
                              {q.options.map((opt: string, oi: number) => (
                                <div key={oi} className={`text-sm px-3 py-1.5 rounded flex items-center gap-2 ${
                                  oi === q.correctAnswer ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium' :
                                  oi === studentAnswer && !isCorrect ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                                  'text-slate-600 dark:text-slate-400'
                                }`}>
                                  <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0 bg-slate-200 dark:bg-slate-700">{String.fromCharCode(65 + oi)}</span>
                                  {opt}
                                  {oi === q.correctAnswer && <CheckCircle className="w-3.5 h-3.5 ml-auto text-emerald-600" />}
                                  {oi === studentAnswer && !isCorrect && <XCircle className="w-3.5 h-3.5 ml-auto text-red-500" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Question details not available.</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleExport([selectedQuizResult], `quiz-result-${selectedQuizResult.student.replace(/\s/g, '-')}`)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Results
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedQuizResult(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {gradingAssignment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setGradingAssignment(null)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-card border-b dark:border-slate-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {gradingAssignment.grade !== null && gradingAssignment.grade !== undefined ? 'Assignment Grade' : 'Grade Assignment'}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {gradingAssignment.studentName || `Student #${gradingAssignment.studentId}`} — {gradingAssignment.assignmentTitle || 'Assignment'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setGradingAssignment(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Submitted: {gradingAssignment.submittedAt ? new Date(gradingAssignment.submittedAt).toLocaleString() : '—'}
                  </div>
                  {gradingAssignment.content && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Student's Submission</p>
                      <div className="prose prose-sm dark:prose-invert max-w-none bg-card border dark:border-slate-700 rounded-lg p-4 text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {gradingAssignment.content}
                      </div>
                    </div>
                  )}
                  {gradingAssignment.fileUrl && (
                    <a href={gradingAssignment.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Attached File
                      </Button>
                    </a>
                  )}
                  {!gradingAssignment.content && !gradingAssignment.fileUrl && (
                    <p className="text-sm text-slate-500 italic">No submission content available.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Grading</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Grade (0–{gradingAssignment.maxScore ?? 100})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={gradingAssignment.maxScore ?? 100}
                        value={gradeValue}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const max = gradingAssignment.maxScore ?? 100;
                          if (e.target.value === '' || (val >= 0 && val <= max)) setGradeValue(e.target.value);
                        }}
                        placeholder="Enter grade..."
                        className="max-w-xs"
                      />
                      {gradeValue !== '' && (Number(gradeValue) < 0 || Number(gradeValue) > (gradingAssignment.maxScore ?? 100)) && (
                        <p className="text-xs text-red-500 mt-1">Grade must be between 0 and {gradingAssignment.maxScore ?? 100}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Feedback
                      </label>
                      <textarea
                        value={feedbackValue}
                        onChange={e => setFeedbackValue(e.target.value)}
                        placeholder="Provide detailed feedback..."
                        className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg min-h-[150px] bg-card text-foreground"
                      />
                    </div>

                    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-violet-600" />
                          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">AI Grade Suggestion</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900"
                          onClick={handleAiGrade}
                          disabled={aiGradeLoading}
                          title="Get AI grade suggestion"
                        >
                          {aiGradeLoading ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Analyzing...</>
                          ) : (
                            <><Bot className="w-3.5 h-3.5 mr-1.5" />Get AI Suggestion</>
                          )}
                        </Button>
                      </div>
                      {aiGradeSuggestion === '__error__' ? (
                        /* #83: AI failed — show error + retry */
                        <div className="space-y-2">
                          <p className="text-xs text-red-500 dark:text-red-400">AI suggestion unavailable. Check your OpenAI configuration.</p>
                          <Button size="sm" variant="outline" className="text-xs border-violet-300 text-violet-700 hover:bg-violet-100" onClick={handleAiGrade} disabled={aiGradeLoading}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
                          </Button>
                        </div>
                      ) : aiGradeSuggestion ? (
                        <div className="space-y-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none bg-card rounded-lg p-3 text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-violet-100 dark:border-violet-900">
                            {aiGradeSuggestion}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 text-xs"
                            onClick={() => {
                              const gradeMatch = aiGradeSuggestion.match(/Grade:\s*(\d+)/i);
                              const feedbackMatch = aiGradeSuggestion.match(/Feedback:\s*([\s\S]+)/i);
                              if (gradeMatch) setGradeValue(gradeMatch[1]);
                              if (feedbackMatch) setFeedbackValue(feedbackMatch[1].trim());
                              toast({ title: 'AI suggestion applied to grade and feedback fields.' });
                            }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Apply Suggestion
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-violet-500 dark:text-violet-400">
                          Click "Get AI Suggestion" to receive an AI-generated grade and feedback based on the student's submission.
                        </p>
                      )}
                    </div>

                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                    onClick={() => {
                      setGradeValue('100');
                      setFeedbackValue(`Excellent work on "${gradingAssignment?.assignmentTitle || 'this assignment'}"! Your submission has been reviewed and fully approved. Well done — keep it up!`);
                      toast({ title: 'Quick Approve applied. Review and submit to confirm.' });
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Quick Approve (100/100)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
                    disabled={returnAssignmentMutation.isPending || !feedbackValue.trim()} // #80: disabled when no feedback
                    onClick={() => {
                      if (!feedbackValue.trim()) {
                        toast({ title: 'Add feedback first', description: 'Write your revision notes in the Feedback field before returning.', variant: 'destructive' });
                        return;
                      }
                      if (gradingAssignment) {
                        returnAssignmentMutation.mutate({
                          submissionId: gradingAssignment.id,
                          studentId: gradingAssignment.studentId,
                          assignmentTitle: gradingAssignment.assignmentTitle,
                          feedback: feedbackValue,
                        });
                      }
                    }}
                  >
                    {returnAssignmentMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
                    Return for Revision
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!gradeValue || gradeMutation.isPending || Number(gradeValue) < 0 || Number(gradeValue) > (gradingAssignment.maxScore ?? 100)}
                    onClick={() => {
                      if (gradeValue && gradingAssignment) {
                        gradeMutation.mutate({
                          assignmentId: gradingAssignment.assignmentId,
                          submissionId: gradingAssignment.id,
                          grade: Number(gradeValue),
                          feedback: feedbackValue,
                        });
                      }
                    }}
                  >
                    {gradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {gradingAssignment.grade !== null && gradingAssignment.grade !== undefined ? 'Update Grade' : 'Submit Grade & Email Student'}
                  </Button>
                  <Button variant="outline" onClick={() => setGradingAssignment(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Class Modal */}
        {editingClass && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setEditingClass(null)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Edit className="w-5 h-5 text-indigo-500" />
                  Edit Class
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setEditingClass(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Class Title</label>
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="e.g. Introduction to Algebra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Describe what students will learn..."
                    rows={4}
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-card text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full border dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-card text-slate-700 dark:text-slate-300"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled (Archived)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!editTitle.trim() || editClassMutation.isPending}
                    onClick={() => {
                      if (editTitle.trim() && editingClass) {
                        editClassMutation.mutate({ id: editingClass.id, data: { title: editTitle.trim(), description: editDescription.trim(), status: editStatus } });
                      }
                    }}
                  >
                    {editClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flag Student Modal */}
        {flaggingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => { setFlaggingStudent(null); setFlagReason(''); }}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-500" />
                  Flag Student Concern
                </h2>
                <Button variant="ghost" size="sm" onClick={() => { setFlaggingStudent(null); setFlagReason(''); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You are flagging a concern for <strong>Student #{flaggingStudent.studentId}</strong> in class <strong>"{flaggingStudent.className}"</strong>. This report will be sent to platform coordinators for review.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    placeholder="Describe the concern..."
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg min-h-[100px] bg-card text-foreground text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={flagStudentMutation.isPending}
                    onClick={() => flagStudentMutation.mutate({
                      studentId: flaggingStudent.studentId,
                      className: flaggingStudent.className,
                      reason: flagReason,
                    })}
                  >
                    {flagStudentMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Flag className="w-4 h-4 mr-2" />}
                    Submit Concern
                  </Button>
                  <Button variant="outline" onClick={() => { setFlaggingStudent(null); setFlagReason(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Session Dialog */}
      {showLiveDialog && (
        <div
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLiveDialog(false); }}
        >
          <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(90vh, 640px)' }}>
            {/* Fixed header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" /> Live Sessions
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Start or manage Zoom sessions for your classes</p>
              </div>
              <button onClick={() => setShowLiveDialog(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!myClasses || (myClasses as any[]).filter((c: any) => c.status === 'active').length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active classes found.</p>
                  <p className="text-xs mt-1">Create an active class first to start a live session.</p>
                </div>
              ) : (
                (myClasses as any[]).filter((c: any) => c.status === 'active').map((cls: any) => {
                  const hasZoom = !!cls.zoomMeetingId;
                  const isCopied = copiedClassId === cls.id;
                  const isThisStarting = startingClassId === cls.id;
                  const isThisEnding = endingClassId === cls.id;

                  return (
                    <div
                      key={cls.id}
                      className={`rounded-xl border p-4 space-y-3 transition-colors ${
                        hasZoom
                          ? 'border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20'
                          : 'border-border bg-card'
                      }`}
                    >
                      {/* Class name + status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{cls.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{cls.enrolledCount || 0} students enrolled</p>
                        </div>
                        {hasZoom ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 shrink-0">
                            <Wifi className="w-3 h-3" /> Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <WifiOff className="w-3 h-3" /> No session
                          </span>
                        )}
                      </div>

                      {/* Join link row (only when active) */}
                      {hasZoom && cls.zoomMeetingUrl && (
                        <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border">
                          <code className="text-xs text-blue-600 dark:text-blue-400 truncate flex-1">{cls.zoomMeetingUrl}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(cls.zoomMeetingUrl);
                              setCopiedClassId(cls.id);
                              setTimeout(() => setCopiedClassId(null), 2000);
                            }}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            title="Copy student join link"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {!hasZoom ? (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isThisStarting}
                            onClick={async () => {
                              setStartingClassId(cls.id);
                              try {
                                const result = await authFetch(`/api/live-class/${cls.id}/zoom`, { method: 'POST' });
                                queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
                                toast({ title: `Session started for "${cls.title}"! Opening Zoom…` });
                                if (result?.hostUrl) {
                                  window.open(result.hostUrl, '_blank', 'noopener,noreferrer');
                                }
                              } catch (err: any) {
                                toast({ title: 'Failed to start session', description: err.message, variant: 'destructive' });
                              } finally {
                                setStartingClassId(null);
                              }
                            }}
                          >
                            {isThisStarting
                              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting…</>
                              : <><Video className="w-3.5 h-3.5 mr-1.5" /> Start Session</>}
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => window.open(cls.zoomHostUrl || cls.zoomMeetingUrl, '_blank', 'noopener,noreferrer')}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Zoom (Host)
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isThisEnding}
                              onClick={async () => {
                                setEndingClassId(cls.id);
                                try {
                                  await authFetch(`/api/live-class/${cls.id}/zoom`, { method: 'DELETE' });
                                  queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
                                  toast({ title: `Session ended for "${cls.title}".` });
                                } catch (err: any) {
                                  toast({ title: 'Failed to end session', description: err.message, variant: 'destructive' });
                                } finally {
                                  setEndingClassId(null);
                                }
                              }}
                            >
                              {isThisEnding
                                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Ending…</>
                                : <><WifiOff className="w-3.5 h-3.5 mr-1.5" /> End Session</>}
                            </Button>
                          </>
                        )}
                      </div>

                      {hasZoom && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ Students in this class have been notified and can join from their dashboard.
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Fixed footer */}
            <div className="px-5 py-4 border-t shrink-0 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLiveDialog(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* #84: Archive confirmation dialog */}
      {confirmArchive && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-base">Archive Class?</h3>
            <p className="text-sm text-muted-foreground">
              "{confirmArchive.title}" will be hidden from students. This can be reversed by editing the class status.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmArchive(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => { archiveClassMutation.mutate(confirmArchive.id); setConfirmArchive(null); }}>
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* #84: Duplicate lesson confirmation dialog */}
      {confirmDuplicate && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-base">Duplicate Lesson?</h3>
            <p className="text-sm text-muted-foreground">
              A copy of "{confirmDuplicate.title}" will be created in the same class.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDuplicate(null)}>Cancel</Button>
              <Button size="sm" onClick={() => { duplicateLessonMutation.mutate(confirmDuplicate); setConfirmDuplicate(null); }}>
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* #167: Announcement modal */}
      {announcingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" /> Send Announcement
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setAnnouncingClass(null)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Send a notification to all students enrolled in <strong>{announcingClass.title}</strong>.
            </p>
            <div className="space-y-3">
              <Input
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
                placeholder="Announcement title"
                maxLength={120}
              />
              <Textarea
                value={announceMessage}
                onChange={(e) => setAnnounceMessage(e.target.value)}
                placeholder="Write your announcement..."
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAnnouncingClass(null)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={!announceTitle.trim() || !announceMessage.trim() || announceMutation.isPending}
                onClick={() => announceMutation.mutate({ classId: announcingClass.id, title: announceTitle.trim(), message: announceMessage.trim() })}
              >
                {announceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Megaphone className="w-4 h-4 mr-1" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Preview Modal (teacher read-only) ── */}
      {previewingQuiz && (() => {
        const questions: any[] = (() => { try { return Array.isArray(previewingQuiz.questions) ? previewingQuiz.questions : JSON.parse(previewingQuiz.questions || '[]'); } catch { return []; } })();
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewingQuiz(null)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-card border-b dark:border-slate-700 p-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-foreground">{previewingQuiz.title}</h2>
                    <Badge className="bg-indigo-100 text-indigo-700">Preview</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                    {previewingQuiz.timeLimit && <span>{previewingQuiz.timeLimit} min time limit</span>}
                    {previewingQuiz.passingScore && <span>Passing: {previewingQuiz.passingScore}%</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPreviewingQuiz(null)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-6 space-y-5">
                {previewingQuiz.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{previewingQuiz.description}</p>
                )}
                {questions.length === 0 ? (
                  <p className="text-slate-400 italic text-sm">This quiz has no questions yet.</p>
                ) : questions.map((q: any, i: number) => (
                  <div key={i} className="border dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">Q{i + 1}: {q.question}</span>
                      <span className="text-xs text-slate-400">{q.points ?? 1} pt{(q.points ?? 1) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="px-5 py-3 space-y-2">
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${oi === q.correctAnswer ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                          <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 font-semibold ${oi === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          {oi === q.correctAnswer && (
                            <span className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                              <CheckCircle className="w-4 h-4" /> Correct Answer
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const link = `${window.location.origin}/take-quiz/${previewingQuiz.id}`;
                      navigator.clipboard.writeText(link);
                      toast({ title: 'Link copied!', description: 'Share this link with your students.' });
                    }}
                  >
                    <FileText className="w-4 h-4" /> Copy Student Link
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewingQuiz(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
