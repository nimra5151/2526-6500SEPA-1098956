import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Booking, QuizResult } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Certificate } from '@/components/certificate';
import { OnboardingModal } from '@/components/onboarding-modal';
import { DashboardSkeleton, StatCard, EmptyState, PageHeader, CourseCardSkeleton, ListItemSkeleton, TableRowSkeleton } from '@/components/skeleton-loader';
import { StaggeredStatGrid, ChartCard } from '@/components/dashboard-ui';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, Clock, Award, Calendar,
  Play, CheckCircle, Flame, Trophy,
  ChevronRight, XCircle, Heart, Loader2,
  X, Plus, FileText, Download, Bookmark,
  ClipboardList, BarChart3, Star, Zap, Target,
  Users2, MessageCircle, HelpCircle, TrendingUp,
  AlertCircle, Medal, MessageSquare, Eye, Sparkles,
  HandHelping, Send, UserCheck, CalendarClock,
} from 'lucide-react';

const BADGE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNote, setNewNote] = useState<{ classId: string; topic: string; content: string; tags: string }>({ classId: '', topic: '', content: '', tags: '' });
  const [goalPerWeek, setGoalPerWeek] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('tutorbridge_weekly_goal') || '2', 10); } catch { return 2; }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingQuizResult, setReviewingQuizResult] = useState<QuizResult | null>(null);
  // Load weeklyGoal + recentlyViewedClasses from settings API
  const { data: userSettings } = useQuery<any>({
    queryKey: ['/api/settings'],
    queryFn: () => authFetch('/api/settings'),
  });
  useEffect(() => {
    if (!userSettings) return;
    if (typeof userSettings.weeklyGoal === 'number') {
      setGoalPerWeek(userSettings.weeklyGoal);
    }
  }, [userSettings?.weeklyGoal]);

  // Fetch recently viewed class details from the server using stored IDs
  const recentlyViewedIds: number[] = Array.isArray(userSettings?.recentlyViewedClasses) ? userSettings.recentlyViewedClasses : [];
  const { data: recentlyViewedClasses = [] } = useQuery<any[]>({
    queryKey: ['/api/classes/recently-viewed', recentlyViewedIds.join(',')],
    queryFn: async () => {
      if (!recentlyViewedIds.length) return [];
      const results = await Promise.all(
        recentlyViewedIds.map((id: number) => authFetch(`/api/classes/${id}`).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: !!user && recentlyViewedIds.length > 0,
    staleTime: 60_000,
  });
  // Peer Help Board state
  const [peerHelpClassId, setPeerHelpClassId] = useState<string>('');
  const [peerHelpTopic, setPeerHelpTopic] = useState('');
  const [peerHelpDesc, setPeerHelpDesc] = useState('');
  const [peerHelpSubmitting, setPeerHelpSubmitting] = useState(false);
  const [helperTopic, setHelperTopic] = useState('');
  const [helperClassId, setHelperClassId] = useState<string>('');
  // Peer session booking state
  const [bookingRequestId, setBookingRequestId] = useState<number | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => authFetch('/api/dashboard/stats'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: enrolledClasses = [], isLoading: classesLoading, isError: classesError } = useQuery({
    queryKey: ['/api/classes/my/enrolled'],
    queryFn: () => authFetch('/api/classes/my/enrolled'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: bookings = [], isLoading: bookingsLoading, isError: bookingsError } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: () => authFetch('/api/bookings'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['/api/favorites'],
    queryFn: () => authFetch('/api/favorites'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['/api/progress'],
    queryFn: () => authFetch('/api/progress'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: notesData = [] } = useQuery({
    queryKey: ['/api/notes'],
    queryFn: () => authFetch('/api/notes'),
    enabled: !!user,
    staleTime: 60_000,
  });
  const notes: any[] = notesData;

  const { data: myQuizResults = [], isLoading: quizResultsLoading, isError: quizResultsError } = useQuery({
    queryKey: ['/api/quiz-results/my'],
    queryFn: () => authFetch('/api/quiz-results/my'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: mySubmissions = [], isLoading: submissionsLoading, isError: submissionsError } = useQuery({
    queryKey: ['/api/assignment-submissions/my'],
    queryFn: () => authFetch('/api/assignment-submissions/my'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: classAssignments = [], isLoading: classAssignmentsLoading } = useQuery({
    queryKey: ['/api/assignments/for-student'],
    queryFn: () => authFetch('/api/assignments/for-student'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['/api/certificates/my'],
    queryFn: () => authFetch('/api/certificates/my'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: deadlines = [], isLoading: deadlinesLoading, isError: deadlinesError } = useQuery({
    queryKey: ['/api/students/me/deadlines'],
    queryFn: () => authFetch('/api/students/me/deadlines'),
    enabled: !!user,
  });

  const { data: myTutors = [], isLoading: tutorsLoading, isError: tutorsError } = useQuery({
    queryKey: ['/api/students/me/tutors'],
    queryFn: () => authFetch('/api/students/me/tutors'),
    enabled: !!user,
  });

  const { data: reviewQuizData } = useQuery({
    queryKey: ['quiz', reviewingQuizResult?.quizId],
    queryFn: () => authFetch(`/api/quizzes/${reviewingQuizResult!.quizId}`),
    enabled: !!reviewingQuizResult?.quizId,
    staleTime: 60_000,
  });

  // Peer Help Board queries
  const { data: myPeerRequests = [], refetch: refetchMyRequests } = useQuery<any[]>({
    queryKey: ['/api/peer-help-requests/mine'],
    queryFn: () => authFetch('/api/peer-help-requests/mine'),
    enabled: !!user && activeTab === 'peer-help',
    staleTime: 30_000,
  });

  const { data: boardRequests = [], refetch: refetchBoard } = useQuery<any[]>({
    queryKey: ['/api/peer-help-requests', peerHelpClassId],
    queryFn: () => authFetch(`/api/peer-help-requests?classId=${peerHelpClassId}&status=open`),
    enabled: !!peerHelpClassId && activeTab === 'peer-help',
    staleTime: 30_000,
  });

  const { data: classHelpers = [] } = useQuery<any[]>({
    queryKey: ['/api/peer-helpers', peerHelpClassId],
    queryFn: () => authFetch(`/api/peer-helpers?classId=${peerHelpClassId}`),
    enabled: !!peerHelpClassId && activeTab === 'peer-help',
    staleTime: 30_000,
  });

  const { data: myOfferedRequests = [], refetch: refetchMyOffers } = useQuery<any[]>({
    queryKey: ['/api/peer-help-requests/my-offers', (enrolledClasses as any[]).map((c: any) => c.id).join(',')],
    queryFn: async () => {
      const classIds: number[] = (enrolledClasses as any[]).map((c: any) => c.id);
      if (!classIds.length) return [];
      const results = await Promise.all(
        classIds.map((id: number) => authFetch(`/api/peer-help-requests?classId=${id}&status=matched`).catch(() => []))
      );
      const allMatched = (results as any[][]).flat();
      return allMatched.filter((r: any) => r.helperId === user?.id);
    },
    enabled: !!user && activeTab === 'peer-help' && (enrolledClasses as any[]).length > 0,
    staleTime: 30_000,
  });

  const { data: mySessions = [], refetch: refetchSessions } = useQuery<any[]>({
    queryKey: ['/api/peer-sessions/mine'],
    queryFn: () => authFetch('/api/peer-sessions/mine'),
    enabled: !!user && activeTab === 'peer-help',
    staleTime: 30_000,
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['/api/classes'],
    queryFn: () => fetch('/api/classes').then(r => r.json()),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: serverRecommended = [] } = useQuery<any[]>({
    queryKey: ['/api/classes/recommended'],
    queryFn: () => authFetch('/api/classes/recommended?limit=6'),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => authFetch(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({ title: 'Booking cancelled successfully' });
    },
    onError: (err: Error) => toast({ title: 'Failed to cancel booking', description: err.message, variant: 'destructive' }),
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (classId: number) => authFetch(`/api/favorites/${classId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({ title: 'Removed from favorites' });
    },
    onError: (err: Error) => toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' }),
  });

  const saveNoteMutation = useMutation({
    mutationFn: (noteData: { classId?: string; topic: string; content: string; tags: string[] }) => authFetch('/api/notes', { method: 'POST', body: JSON.stringify(noteData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setIsCreatingNote(false);
      setNewNote({ classId: '', topic: '', content: '', tags: '' });
      toast({ title: 'Note saved!' });
    },
    onError: (err: Error) => toast({ title: 'Failed to save note', description: err.message, variant: 'destructive' }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => authFetch(`/api/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notes'] }),
    onError: () => toast({ title: 'Failed to delete note', variant: 'destructive' }),
  });

  const submitReviewMutation = useMutation({
    mutationFn: (data: { revieweeId: number; classId: number; rating: number; comment: string }) => authFetch('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setReviewingBooking(null);
      setReviewRating(5);
      setReviewComment('');
      toast({ title: 'Review submitted! Thank you for your feedback.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to submit review', description: err.message, variant: 'destructive' }),
  });

  const enrolledCount = stats?.enrolledClasses ?? (enrolledClasses as any[]).length;
  const upcomingBookings = Array.isArray(bookings) ? bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') : [];
  const completedBookings = Array.isArray(bookings) ? bookings.filter((b: any) => b.status === 'completed') : [];
  const totalHours = Array.isArray(bookings) ? bookings.reduce((acc: number, b: any) => acc + (Number(b.duration) || 0), 0) / 60 : 0;

  // Build class → aggregated progress map (sum across all lecture rows per class)
  const progressMap: Record<number, { classId: number; completedLectures: number; totalLectures: number; totalWatchSeconds: number; completed: boolean }> = {};
  (progress as any[]).forEach((p: any) => {
    if (!progressMap[p.classId]) {
      progressMap[p.classId] = { classId: p.classId, completedLectures: 0, totalLectures: p.totalLectures || 0, totalWatchSeconds: 0, completed: false };
    }
    const m = progressMap[p.classId];
    if (p.completed) m.completedLectures += 1;
    m.totalWatchSeconds += (p.watchTimeSeconds || 0);
    if (p.totalLectures) m.totalLectures = Math.max(m.totalLectures, p.totalLectures);
  });
  Object.values(progressMap).forEach((m: any) => {
    m.completed = m.totalLectures > 0 && m.completedLectures >= m.totalLectures;
  });

  function getCompletionPct(cls: any) {
    const p = progressMap[cls.id];
    if (!p) return 0;
    if (p.totalLectures > 0) return Math.min(100, Math.round((p.completedLectures / p.totalLectures) * 100));
    if (cls.duration) return Math.min(100, Math.round((p.totalWatchSeconds / (cls.duration * 60)) * 100));
    return p.completed ? 100 : 0;
  }

  // ── Study streak ──────────────────────────────────────────────────────────
  const studyStreak = (() => {
    const dateSet = new Set(
      completedBookings.map((b: any) => new Date(b.scheduledDate).toDateString())
    );
    let streak = 0;
    const d = new Date();
    while (dateSet.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  // ── Sessions this week vs goal ────────────────────────────────────────────
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const sessionsThisWeek = completedBookings.filter((b: any) => {
    const d = new Date(b.scheduledDate);
    return !isNaN(d.getTime()) && d >= weekStart;
  }).length;

  // ── Achievements / Badges ─────────────────────────────────────────────────
  const passedQuizzes = (myQuizResults as any[]).filter((r: any) => r.passed);
  const badges = [
    { id: 'first-session', icon: Star, label: 'First Session', desc: 'Complete your first tutoring session', earned: completedBookings.length >= 1, color: 'text-amber-500' },
    { id: 'dedicated', icon: Flame, label: 'Dedicated Learner', desc: 'Complete 5+ sessions', earned: completedBookings.length >= 5, color: 'text-orange-500' },
    { id: 'quiz-starter', icon: Zap, label: 'Quiz Starter', desc: 'Pass your first quiz', earned: passedQuizzes.length >= 1, color: 'text-sky-500' },
    { id: 'quiz-master', icon: Trophy, label: 'Quiz Master', desc: 'Pass 5+ quizzes', earned: passedQuizzes.length >= 5, color: 'text-indigo-500' },
    { id: 'certified', icon: Award, label: 'Certified', desc: 'Earn a certificate', earned: (certificates as any[]).length >= 1, color: 'text-emerald-500' },
    { id: 'explorer', icon: BookOpen, label: 'Course Explorer', desc: 'Enrol in 3+ courses', earned: (enrolledClasses as any[]).length >= 3, color: 'text-rose-500' },
  ];

  // ── Analytics: sessions by month ─────────────────────────────────────────
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sessionsByMonth: Record<string, number> = {};
  completedBookings.forEach((b: any) => {
    const key = monthNames[new Date(b.scheduledDate).getMonth()];
    sessionsByMonth[key] = (sessionsByMonth[key] || 0) + 1;
  });
  const sessionChartData = monthNames
    .filter(m => sessionsByMonth[m])
    .map(m => ({ month: m, sessions: sessionsByMonth[m] }));

  // ── Analytics: quiz scores ────────────────────────────────────────────────
  const quizChartData = (myQuizResults as any[])
    .slice(-10)
    .map((r: any, i: number) => ({
      name: r.quizTitle ? r.quizTitle.slice(0, 12) : `Q${i + 1}`,
      score: r.score || 0,
      pass: r.passed ? 1 : 0,
    }));

  // ── Analytics: subject distribution ──────────────────────────────────────
  const subjectMap: Record<string, number> = {};
  (enrolledClasses as any[]).forEach((cls: any) => {
    const cat = cls.category || 'Other';
    subjectMap[cat] = (subjectMap[cat] || 0) + 1;
  });
  const subjectChartData = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));

  // ── Analytics: assignment grades ─────────────────────────────────────────
  const gradeChartData = (mySubmissions as any[])
    .filter((s: any) => s.grade !== null && s.grade !== undefined)
    .slice(-8)
    .map((s: any, i: number) => ({
      name: s.assignmentTitle ? s.assignmentTitle.slice(0, 12) : `A${i + 1}`,
      grade: s.grade,
      max: s.maxScore || 100,
    }));

  const enrolledIds = new Set((enrolledClasses as any[]).map((c: any) => c.id));
  const learningCategories = new Set((enrolledClasses as any[]).map((c: any) => c.category).filter(Boolean));
  const clientRecommended = (allClasses as any[])
    .filter((c: any) => !enrolledIds.has(c.id) && c.status !== 'draft')
    .sort((a: any, b: any) => {
      const aMatch = learningCategories.has(a.category) ? 1 : 0;
      const bMatch = learningCategories.has(b.category) ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return (b.enrolledCount || 0) - (a.enrolledCount || 0);
    })
    .slice(0, 6);
  const recommendedClasses = (serverRecommended as any[]).length > 0 ? serverRecommended : clientRecommended;

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Enrolled Courses', value: enrolledCount, icon: BookOpen, iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', trend: `${(enrolledClasses as any[]).length} active` },
    { label: 'Study Hours', value: `${Math.round(totalHours * 10) / 10}h`, icon: Clock, iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', trend: `${completedBookings.length} sessions done` },
    { label: 'Study Streak', value: `${studyStreak}d`, icon: Flame, iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', trend: studyStreak > 0 ? 'Keep it up!' : 'Start today!' },
    { label: 'Certificates', value: (certificates as any[]).length, icon: Award, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', trend: `${badges.filter(b => b.earned).length} badges earned` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* #181: First-time onboarding modal */}
      <OnboardingModal userId={user?.id} userName={user?.name || 'Student'} role="student" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="My Dashboard"
          description={`Welcome back, ${user?.name || 'Student'}! Keep up the great work.`}
        />

        {/* Error banners */}
        {(statsError || classesError || bookingsError) && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Some dashboard data failed to load. Please refresh the page.
          </div>
        )}

        {/* Stat cards */}
        <StaggeredStatGrid columns={4}>
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </StaggeredStatGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1">
          <TabsList className="mb-6 bg-card border border-border/60 dark:border-slate-800 shadow-sm h-10 p-1 rounded-lg w-max min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              My Courses
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Bookings
            </TabsTrigger>
            <TabsTrigger value="library" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Library
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tutors" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              My Tutors
            </TabsTrigger>
            <TabsTrigger value="peer-help" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Peer Help
            </TabsTrigger>
          </TabsList>
          </div>

          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Book a Session', icon: Calendar, href: '/classes', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                { label: 'Browse Classes', icon: BookOpen, href: '/classes', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
                { label: 'My Certificates', icon: Award, onClick: () => setActiveTab('bookings'), color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                { label: 'Message Tutor', icon: MessageCircle, href: '/messages', color: 'bg-violet-600 hover:bg-violet-700 text-white' },
              ].map((action) => (
                action.href ? (
                  <Link key={action.label} href={action.href}>
                    <Button className={`w-full h-14 flex-col gap-1 text-xs font-medium ${action.color}`}>
                      <action.icon className="w-5 h-5" />
                      {action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button key={action.label} className={`h-14 flex-col gap-1 text-xs font-medium ${action.color}`} onClick={action.onClick}>
                    <action.icon className="w-5 h-5" />
                    {action.label}
                  </Button>
                )
              ))}
            </div>

            {/* Weekly Goal */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">Weekly Goal</span>
                    <Badge className={sessionsThisWeek >= goalPerWeek ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {sessionsThisWeek}/{goalPerWeek} sessions
                    </Badge>
                  </div>
                  {editingGoal ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" min="1" max="14" className="w-16 h-7 text-xs text-center"
                        value={goalPerWeek}
                        onChange={e => setGoalPerWeek(Math.max(1, parseInt(e.target.value) || 1))} />
                      <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                        localStorage.setItem('tutorbridge_weekly_goal', String(goalPerWeek));
                        authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ weeklyGoal: goalPerWeek }) }).catch(() => {});
                        setEditingGoal(false);
                        toast({ title: 'Goal updated!' });
                      }}>Save</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 h-7" onClick={() => setEditingGoal(true)}>Edit goal</Button>
                  )}
                </div>
                <Progress value={Math.min(100, (sessionsThisWeek / goalPerWeek) * 100)} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">
                  {sessionsThisWeek >= goalPerWeek
                    ? '🎉 Goal achieved this week! Amazing work.'
                    : `${goalPerWeek - sessionsThisWeek} more session${goalPerWeek - sessionsThisWeek !== 1 ? 's' : ''} to reach your goal.`}
                </p>
              </CardContent>
            </Card>

            {/* Recently Viewed Classes */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" /> Recently Viewed
                </CardTitle>
                {recentlyViewedClasses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 h-7"
                    onClick={() => {
                      authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ recentlyViewedClasses: [] }) }).catch(() => {});
                      queryClient.setQueryData(['/api/settings'], (old: any) => old ? { ...old, recentlyViewedClasses: [] } : old);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-5">
                {recentlyViewedClasses.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No recently viewed classes yet. <Link href="/classes" className="text-indigo-600 hover:underline">Browse classes</Link> to get started.</p>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                    {recentlyViewedClasses.map((rc: any) => (
                      <Link key={rc.id} href={`/classes/${rc.id}`}>
                        <div className="shrink-0 w-44 group cursor-pointer">
                          <div className="relative h-24 rounded-lg overflow-hidden bg-indigo-100 dark:bg-indigo-900 mb-2">
                            {rc.thumbnailUrl ? (
                              <img
                                src={rc.thumbnailUrl}
                                alt={rc.title}
                                width={320}
                                height={180}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-indigo-400" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-indigo-600 transition-colors">
                            {rc.title}
                          </p>
                          {rc.tutorName && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{rc.tutorName}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Path */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {(enrolledClasses as any[]).length === 0 ? (
                  <EmptyState icon={TrendingUp} title="No courses yet" description="Enrol in classes to build your learning path." action={{ label: 'Browse Classes', href: '/classes' }} />
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-4">
                      {(enrolledClasses as any[]).map((cls: any, i: number) => {
                        const pct = getCompletionPct(cls);
                        const isDone = pct === 100;
                        const isActive = !isDone && pct > 0;
                        return (
                          <div key={cls.id} className="relative flex items-start gap-4 pl-12">
                            <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white'
                              : isActive ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-card border-slate-300 dark:border-slate-600 text-slate-400'
                            }`}>
                              {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{cls.title}</p>
                                <span className={`text-xs font-semibold shrink-0 ${isDone ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {isDone ? 'Complete' : isActive ? `${pct}%` : 'Not started'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mb-1.5">{cls.category} · {cls.skillLevel}</p>
                              {!isDone && <Progress value={pct} className="h-1" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Continue Learning */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Play className="w-4 h-4 text-indigo-600" /> Continue Learning
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-indigo-600" onClick={() => setActiveTab('courses')}>
                    View all <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {classesLoading ? (
                  <div className="p-4 space-y-2">
                    {[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}
                  </div>
                ) : (enrolledClasses as any[]).length === 0 ? (
                  <EmptyState icon={BookOpen} title="No courses yet" description="Browse and enrol in classes to start learning." action={{ label: 'Browse Classes', href: '/classes' }} />
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(enrolledClasses as any[]).slice(0, 5).map((cls: any) => {
                      const pct = getCompletionPct(cls);
                      const p = progressMap[cls.id];
                      return (
                        <div key={cls.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            {cls.thumbnailUrl
                              ? <img src={cls.thumbnailUrl} alt={cls.title} width={48} height={48} loading="lazy" className="w-full h-full object-cover" />
                              : <BookOpen className="w-5 h-5 text-indigo-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{cls.title}</p>
                            <p className="text-xs text-slate-500 mb-2">{cls.category} · {cls.skillLevel}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-xs text-slate-400 shrink-0">{pct}%</span>
                            </div>
                          </div>
                          <Link href={`/classes/${cls.id}`}>
                            <Button size="sm" variant="outline" className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {p?.completed ? 'Review' : pct > 0 ? 'Continue' : 'Start'}
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3-col: Sessions + Deadlines + Summary */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Upcoming Sessions */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" /> Upcoming Sessions
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600" onClick={() => setActiveTab('bookings')}>
                      View all <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {upcomingBookings.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-slate-500">No upcoming sessions</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {upcomingBookings.slice(0, 4).map((b: any) => (
                        <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{b.classTitle || b.className || `Session #${b.id}`}</p>
                            <p className="text-xs text-slate-500">{new Date(b.scheduledDate).toLocaleDateString()}{b.scheduledTime && ` · ${b.scheduledTime}`}</p>
                          </div>
                          <Badge variant="outline" className={b.status === 'confirmed' ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-amber-500 text-amber-700 dark:text-amber-400'}>
                            {b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" /> Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {deadlinesError && !deadlinesLoading && (
                    <p className="text-sm text-destructive px-4 pt-3">Failed to load deadlines.</p>
                  )}
                  {deadlinesLoading ? (
                    <div className="p-4 space-y-2">{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</div>
                  ) : (deadlines as any[]).length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-slate-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                      No deadlines in the next 14 days
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(deadlines as any[]).slice(0, 4).map((d: any) => {
                        const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                        return (
                          <div key={d.id} className="px-6 py-3">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{d.title}</p>
                            <p className="text-xs text-slate-500 truncate">{d.className}</p>
                            <Badge className={`mt-1 text-xs ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : daysLeft <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days left`}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Learning Summary */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold">Learning Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {[
                    { label: 'Courses Enrolled', value: enrolledCount },
                    { label: 'Sessions Completed', value: completedBookings.length },
                    { label: 'Total Study Hours', value: `${Math.round(totalHours * 10) / 10}h` },
                    { label: 'Quizzes Passed', value: passedQuizzes.length },
                    { label: 'Certificates Earned', value: (certificates as any[]).length },
                    { label: 'Study Streak', value: `${studyStreak} day${studyStreak !== 1 ? 's' : ''}` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-0.5 border-b border-border/40 dark:border-slate-800 last:border-0">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
                      <span className="text-sm font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Medal className="w-4 h-4 text-amber-500" /> Achievements
                  <Badge className="bg-indigo-100 text-indigo-700">{badges.filter(b => b.earned).length}/{badges.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                      badge.earned
                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-50'
                    }`}>
                      <badge.icon className={`w-7 h-7 mb-2 ${badge.earned ? badge.color : 'text-slate-400'}`} />
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{badge.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{badge.desc}</p>
                      {badge.earned && <Badge className="mt-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5">Earned</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommended Next Class */}
            {recommendedClasses.length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" /> Recommended For You
                    </CardTitle>
                    <Link href="/classes">
                      <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                        Browse all <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedClasses.slice(0, 6).map((cls: any) => (
                      <Link key={cls.id} href={`/classes/${cls.id}`}>
                        <div className="group border border-border/60 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-md cursor-pointer">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                              {cls.thumbnailUrl
                                ? <img src={cls.thumbnailUrl} alt={cls.title} width={40} height={40} loading="lazy" className="w-full h-full object-cover" />
                                : <BookOpen className="w-5 h-5 text-indigo-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-indigo-600 transition-colors">{cls.title}</p>
                              <p className="text-xs text-slate-500">{cls.category} · {cls.skillLevel || 'All levels'}</p>
                            </div>
                          </div>
                          {cls.tutorName && (
                            <p className="text-xs text-slate-400 mb-2 truncate">by {cls.tutorName}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{cls.enrolledCount || 0} enrolled</span>
                            {(cls.averageRating > 0 || cls.tutorRating > 0) && (
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                {Number(cls.averageRating || cls.tutorRating || 0).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Certificates */}
            {(certificates as any[]).length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" /> My Certificates
                    <Badge className="bg-emerald-100 text-emerald-700">{(certificates as any[]).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(certificates as any[]).map((cert: any) => (
                      <div key={cert.id} className="border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 bg-emerald-50/50 dark:bg-emerald-950/10">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{cert.courseName || cert.className || 'Course'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Issued'}</p>
                            {cert.verificationCode && (
                              <Link href={`/verify/${cert.verificationCode}`}>
                                <span className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Verify →</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── MY COURSES ───────────────────────────────────────────────────── */}
          <TabsContent value="courses">
            {classesLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2, 3, 4, 5].map(i => <CourseCardSkeleton key={i} />)}
              </div>
            ) : (enrolledClasses as any[]).length === 0 ? (
              <EmptyState icon={BookOpen} title="No enrolled courses" description="Find and enrol in classes to get started." action={{ label: 'Browse Classes', href: '/classes' }} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(enrolledClasses as any[]).map((cls: any) => {
                  const pct = getCompletionPct(cls);
                  const p = progressMap[cls.id];
                  return (
                    <Card key={cls.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                      <div className="relative h-44 overflow-hidden bg-indigo-100 dark:bg-indigo-900">
                        {cls.thumbnailUrl
                          ? <img src={cls.thumbnailUrl} alt={cls.title} width={320} height={180} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-indigo-400" /></div>}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <Badge className="bg-white/90 text-slate-800 text-xs">{cls.courseType}</Badge>
                          {p?.completed && <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>}
                        </div>
                        {/* #182: Coursera-style radial progress ring on the thumbnail */}
                        <div className="absolute bottom-3 right-3">
                          <div className="relative w-14 h-14">
                            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                              <circle cx="28" cy="28" r="24" fill="rgba(15,23,42,0.55)" />
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke="rgba(255,255,255,0.25)"
                                strokeWidth="4"
                              />
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke={p?.completed ? '#10b981' : '#818cf8'}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 24}
                                strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(100, Math.max(0, pct)) / 100)}
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                              {pct}%
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{cls.title}</h3>
                        <p className="text-xs text-slate-500 mb-3">{cls.category} · {cls.skillLevel}</p>
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span><span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <Link href={`/classes/${cls.id}`}>
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm">
                            {p?.completed ? 'Rewatch' : pct > 0 ? 'Continue' : 'Start Learning'}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── BOOKINGS ─────────────────────────────────────────────────────── */}
          <TabsContent value="bookings" className="space-y-4">
            {bookingsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
              </div>
            ) : !Array.isArray(bookings) || (bookings as any[]).length === 0 ? (
              <EmptyState icon={Calendar} title="No bookings yet" description="Book a class to see your sessions here." />
            ) : (
              <div className="space-y-3">
                {(bookings as any[]).map((b: any) => (
                  <Card key={b.id} className="border border-border/60 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-medium text-foreground text-sm">{b.classTitle || b.className || `Session #${b.id}`}</h4>
                            <Badge className={
                              b.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : b.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : b.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }>{b.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(b.scheduledDate).toLocaleDateString()}</span>
                            {b.scheduledTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.scheduledTime}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.duration || 60} min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {b.status === 'completed' && (
                            <>
                              <Certificate
                                studentName={user?.name || 'Student'}
                                courseName={b.classTitle || b.className || 'Completed Course'}
                                completionDate={new Date(b.scheduledDate).toLocaleDateString()}
                              />
                              <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 h-8 text-xs"
                                onClick={() => { setReviewingBooking(b); setReviewRating(5); setReviewComment(''); }}>
                                <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Rate
                              </Button>
                            </>
                          )}
                          {(b.status === 'confirmed' || b.status === 'pending') && (
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 text-xs"
                              onClick={() => cancelBookingMutation.mutate(b.id)} disabled={cancelBookingMutation.isPending}>
                              {cancelBookingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><XCircle className="w-3.5 h-3.5 mr-1" />Cancel</>}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── LIBRARY (Favorites + Notes) ───────────────────────────────── */}
          <TabsContent value="library" className="space-y-8">
            {/* Saved Classes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" /> Saved Classes
                </h2>
                <Link href="/classes"><Button variant="ghost" size="sm" className="text-xs text-indigo-600">Browse more</Button></Link>
              </div>
              {favoritesLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[0, 1, 2].map(i => <CourseCardSkeleton key={i} />)}
                </div>
              ) : !Array.isArray(favorites) || (favorites as any[]).length === 0 ? (
                <EmptyState icon={Heart} title="No saved classes" description="Bookmark classes you like while browsing." action={{ label: 'Browse Classes', href: '/classes' }} />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(favorites as any[]).map((fav: any) => {
                    const cls = fav.class || { title: fav.classTitle, category: fav.classCategory, thumbnailUrl: fav.classThumbnail, id: fav.classId };
                    return (
                      <Card key={fav.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <div className="h-36 overflow-hidden bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center relative">
                          {cls.thumbnailUrl
                            ? <img src={cls.thumbnailUrl} alt={cls.title || 'Class'} width={320} height={180} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            : <Heart className="w-10 h-10 text-rose-300" />}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">{cls.title || `Class #${fav.classId}`}</h3>
                          {cls.category && <p className="text-xs text-slate-500 mb-3">{cls.category}</p>}
                          <div className="flex gap-2">
                            <Link href={`/classes/${fav.classId || cls.id}`} className="flex-1">
                              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">View Class</Button>
                            </Link>
                            <Button variant="outline" size="icon" className="w-8 h-8 shrink-0"
                              onClick={() => removeFavoriteMutation.mutate(fav.classId || cls.id)} disabled={removeFavoriteMutation.isPending}>
                              {removeFavoriteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-800" />

            {/* My Notes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> My Notes
                </h2>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs" onClick={() => setIsCreatingNote(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Note
                </Button>
              </div>
              {notes.length === 0 ? (
                <EmptyState icon={FileText} title="No notes yet" description="Create notes to keep track of what you learn." action={{ label: 'Create Note', onClick: () => setIsCreatingNote(true) }} />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note: any) => {
                    const tagList: string[] = note.tags ?? [];
                    return (
                      <Card key={note.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-foreground truncate">{note.topic || note.course || 'Untitled'}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{new Date(note.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-slate-400 hover:text-red-500 ml-2"
                              onClick={() => deleteNoteMutation.mutate(note.id)} disabled={deleteNoteMutation.isPending}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap mb-3">{note.content}</p>
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tagList.map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs px-1.5">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* My Submitted Files */}
            {(mySubmissions as any[]).filter((s: any) => s.fileUrl).length > 0 && (
              <>
                <div className="border-t border-slate-200 dark:border-slate-800" />
                <section>
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Download className="w-4 h-4 text-violet-500" /> My Submitted Files
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(mySubmissions as any[]).filter((s: any) => s.fileUrl).map((sub: any) => (
                      <Card key={sub.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{sub.assignmentTitle || `Assignment #${sub.assignmentId}`}</p>
                            <p className="text-xs text-slate-500">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Submitted'}</p>
                            {sub.grade !== null && sub.grade !== undefined && (
                              <Badge className="mt-1 text-xs bg-emerald-100 text-emerald-700">Grade: {sub.grade}/{sub.maxScore || 100}</Badge>
                            )}
                          </div>
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0"><Download className="w-3 h-3 mr-1" />Open</Button>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          {/* ── QUIZZES ──────────────────────────────────────────────────────── */}
          <TabsContent value="quizzes" className="space-y-4">
            {/* #74: surface error; #75: don't show empty state while loading */}
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
            ) : (myQuizResults as any[]).length === 0 ? (
              <EmptyState icon={BarChart3} title="No quiz attempts yet" description="Take quizzes from your enrolled classes to see results here." action={{ label: 'Browse Classes', href: '/classes' }} />
            ) : (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" /> My Quiz Results ({(myQuizResults as any[]).length})
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
                        {(myQuizResults as any[]).map((r: any) => (
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
          </TabsContent>

          {/* ── ASSIGNMENTS ──────────────────────────────────────────────────── */}
          <TabsContent value="assignments" className="space-y-4">

            {/* ── Upcoming Deadlines ── */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-rose-500" /> Upcoming Deadlines
                  {!deadlinesLoading && (deadlines as any[]).length > 0 && (
                    <Badge className="bg-rose-100 text-rose-700 ml-1">{(deadlines as any[]).length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {deadlinesLoading ? (
                  <div className="p-4 space-y-2">{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</div>
                ) : deadlinesError ? (
                  <p className="text-sm text-destructive px-6 py-4">Failed to load deadlines. Please refresh.</p>
                ) : (deadlines as any[]).length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-slate-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                    No upcoming deadlines in the next 14 days
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(deadlines as any[]).map((d: any) => {
                      const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                      const isUrgent = daysLeft <= 2;
                      return (
                        <div key={d.id} className={`flex items-center justify-between px-6 py-4 ${isUrgent ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'} transition-colors`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{d.title}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{d.className}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Due: {new Date(d.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <Badge className={`ml-4 shrink-0 text-xs ${daysLeft === 0 ? 'bg-red-100 text-red-700' : daysLeft === 1 ? 'bg-red-100 text-red-700' : daysLeft <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days left`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Pending / To-Do Assignments ── */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Pending Assignments
                  {!classAssignmentsLoading && (classAssignments as any[]).filter((a: any) => !a.submitted).length > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 ml-1">
                      {(classAssignments as any[]).filter((a: any) => !a.submitted).length} to do
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {classAssignmentsLoading ? (
                  <div className="divide-y dark:divide-slate-700">
                    {[0, 1, 2].map(i => <div key={i} className="px-6 py-4 animate-pulse"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" /><div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div>)}
                  </div>
                ) : (classAssignments as any[]).filter((a: any) => !a.submitted).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
                    <p className="text-sm">All caught up! No pending assignments.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {(classAssignments as any[]).filter((a: any) => !a.submitted).map((asgn: any) => (
                      <div key={asgn.id} className="flex items-center justify-between px-6 py-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{asgn.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-slate-500">
                            {asgn.dueDate && (
                              <span className={`flex items-center gap-1 ${asgn.isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                Due: {new Date(asgn.dueDate).toLocaleDateString()}
                                {asgn.isOverdue && <Badge className="bg-red-100 text-red-700 text-xs ml-1">Overdue</Badge>}
                              </span>
                            )}
                            <span>Max: {asgn.maxScore || 100} pts</span>
                            {asgn.allowLateSubmission === false && asgn.isOverdue && (
                              <Badge className="bg-red-100 text-red-700 text-xs">Late submissions closed</Badge>
                            )}
                          </div>
                          {asgn.instructions && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{asgn.instructions}</p>
                          )}
                        </div>
                        <Link href={`/submit-assignment/${asgn.id}`}>
                          <Button size="sm" className={`shrink-0 gap-1.5 ${asgn.isOverdue ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                            <Send className="w-3.5 h-3.5" /> Submit
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Submitted Assignments ── */}
            {submissionsError && !submissionsLoading && (
              <p className="text-sm text-destructive px-1">Failed to load submissions. Please refresh.</p>
            )}
            {submissionsLoading ? (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-0">
                  <table className="w-full">
                    <tbody className="divide-y dark:divide-slate-700">
                      {[0, 1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (mySubmissions as any[]).length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-600" /> Submitted ({(mySubmissions as any[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Assignment</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Grade</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Feedback</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Submitted</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">File</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {(mySubmissions as any[]).map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{sub.assignmentTitle || `Assignment #${sub.assignmentId}`}</td>
                            <td className="px-6 py-4">
                              {sub.grade !== null && sub.grade !== undefined
                                ? <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>
                                : <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {sub.grade !== null && sub.grade !== undefined ? `${sub.grade} / ${sub.maxScore || 100}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                              {sub.feedback || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4">
                              {sub.fileUrl
                                ? <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="h-8 text-xs"><Download className="w-3 h-3 mr-1" />File</Button></a>
                                : <span className="text-xs text-slate-400">No file</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── ANALYTICS ────────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Study Sessions per Month */}
            {sessionChartData.length === 0 ? (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6">
                  <EmptyState icon={BarChart3} title="No session data yet" description="Complete sessions to see your activity chart." />
                </CardContent>
              </Card>
            ) : (
              <ChartCard title="Study Sessions Over Time" icon={TrendingUp} iconColor="text-indigo-600 dark:text-indigo-400" height={220}>
                <AreaChart data={sessionChartData}>
                  <defs>
                    <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#sessGrad)" strokeWidth={2} name="Sessions" />
                </AreaChart>
              </ChartCard>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quiz Score History */}
              {quizChartData.length === 0 ? (
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardContent className="p-6">
                    <EmptyState icon={Zap} title="No quiz data yet" description="Take quizzes to see your scores here." />
                  </CardContent>
                </Card>
              ) : (
                <ChartCard title="Quiz Score History" icon={Zap} iconColor="text-sky-600 dark:text-sky-400" height={200}>
                  <BarChart data={quizChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {quizChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.pass ? '#10b981' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartCard>
              )}

              {/* Subject Distribution */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" /> Subject Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {subjectChartData.length === 0 ? (
                    <EmptyState icon={BookOpen} title="No subjects yet" description="Enrol in courses to see subject breakdown." />
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={subjectChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                            {subjectChartData.map((_, i) => (
                              <Cell key={i} fill={BADGE_COLORS[i % BADGE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {subjectChartData.map((s, i) => (
                          <div key={s.name} className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }} />
                            <span className="text-slate-600 dark:text-slate-400 truncate">{s.name}</span>
                            <span className="ml-auto font-semibold text-slate-800 dark:text-slate-200">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assignment Grade History */}
            {gradeChartData.length === 0 ? (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6">
                  <EmptyState icon={ClipboardList} title="No graded assignments yet" description="Submit assignments to track your grades here." />
                </CardContent>
              </Card>
            ) : (
              <ChartCard title="Assignment Grade History" icon={ClipboardList} iconColor="text-violet-600 dark:text-violet-400" height={200}>
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, name: string) => [`${v}`, name === 'grade' ? 'Your Grade' : 'Max']} />
                  <Bar dataKey="grade" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="grade" />
                </BarChart>
              </ChartCard>
            )}

            {/* Stats Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg Quiz Score', value: (myQuizResults as any[]).length > 0 ? `${Math.round((myQuizResults as any[]).reduce((s: number, r: any) => s + (r.score || 0), 0) / (myQuizResults as any[]).length)}%` : 'N/A', icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
                { label: 'Pass Rate', value: (myQuizResults as any[]).length > 0 ? `${Math.round((passedQuizzes.length / (myQuizResults as any[]).length) * 100)}%` : 'N/A', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Sessions Attended', value: completedBookings.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                { label: 'Pending Reviews', value: (mySubmissions as any[]).filter((s: any) => s.grade === null || s.grade === undefined).length, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
              ].map(stat => (
                <Card key={stat.label} className={`border border-border/60 dark:border-slate-800 shadow-sm ${stat.bg}`}>
                  <CardContent className="p-5 flex items-center gap-3">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── MY TUTORS ────────────────────────────────────────────────────── */}
          <TabsContent value="tutors" className="space-y-4">
            {tutorsError && !tutorsLoading && (
              <p className="text-sm text-destructive px-1">Failed to load tutors. Please refresh.</p>
            )}
            {tutorsLoading ? (
              <div className="space-y-3">{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</div>
            ) : (myTutors as any[]).length === 0 ? (
              <EmptyState icon={Users2} title="No tutors yet" description="Enrol in classes to connect with volunteer tutors." action={{ label: 'Browse Classes', href: '/classes' }} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(myTutors as any[]).map((tutor: any) => (
                  <Card key={tutor.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center overflow-hidden shrink-0">
                          {tutor.avatar
                            ? <img src={tutor.avatar} alt={tutor.name} width={56} height={56} loading="lazy" className="w-full h-full object-cover" />
                            : <span className="text-indigo-700 dark:text-indigo-300 font-bold text-xl">{tutor.name?.charAt(0)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{tutor.name}</h3>
                          {tutor.rating && Number(tutor.rating) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span>{Number(tutor.rating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {tutor.bio && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{tutor.bio}</p>}
                      {tutor.classes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {tutor.classes.map((cls: any) => (
                            <Badge key={cls.id} variant="secondary" className="text-xs">{cls.title}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Link href={`/messages?with=${tutor.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" /> Message
                          </Button>
                        </Link>
                        <Link href={`/profile/${tutor.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs">Profile</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PEER HELP BOARD ───────────────────────────────────────────────── */}
          <TabsContent value="peer-help" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <HandHelping className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Peer Help Board</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ask peers for help, or offer your knowledge to others</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Post a Help Request */}
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    Post a Help Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                    <select
                      className="w-full text-sm border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 bg-card text-foreground"
                      value={peerHelpClassId}
                      onChange={e => setPeerHelpClassId(e.target.value)}
                    >
                      <option value="">Select a class…</option>
                      {(enrolledClasses as any[]).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Topic</label>
                    <Input
                      placeholder="e.g. Quadratic equations, Python loops…"
                      value={peerHelpTopic}
                      onChange={e => setPeerHelpTopic(e.target.value.slice(0, 200))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Describe your question</label>
                    <Textarea
                      placeholder="What exactly are you struggling with? The more detail, the better help you'll get."
                      value={peerHelpDesc}
                      onChange={e => setPeerHelpDesc(e.target.value.slice(0, 1000))}
                      className="text-sm min-h-[90px]"
                    />
                    <p className="text-[10px] text-slate-400 text-right mt-1">{peerHelpDesc.length}/1000</p>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!peerHelpClassId || !peerHelpTopic.trim() || peerHelpDesc.length < 10 || peerHelpSubmitting}
                    onClick={async () => {
                      setPeerHelpSubmitting(true);
                      try {
                        const res = await authFetch('/api/peer-help-requests', {
                          method: 'POST',
                          body: JSON.stringify({ classId: Number(peerHelpClassId), topic: peerHelpTopic.trim(), description: peerHelpDesc.trim() }),
                        }) as any;
                        toast({ title: res.status === 'matched' ? 'Request posted — a peer helper was matched!' : 'Request posted! Waiting for a peer helper.', variant: 'default' });
                        setPeerHelpTopic('');
                        setPeerHelpDesc('');
                        refetchMyRequests();
                        refetchBoard();
                      } catch (e: any) {
                        toast({ title: e.message || 'Failed to post request', variant: 'destructive' });
                      } finally {
                        setPeerHelpSubmitting(false);
                      }
                    }}
                  >
                    {peerHelpSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Post Request
                  </Button>
                </CardContent>
              </Card>

              {/* Volunteer as a Helper */}
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    Offer to Help Peers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Scored well on a topic? Register as a peer helper — you'll be auto-matched when someone needs help.
                  </p>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                    <select
                      className="w-full text-sm border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 bg-card text-foreground"
                      value={helperClassId}
                      onChange={e => setHelperClassId(e.target.value)}
                    >
                      <option value="">Select a class…</option>
                      {(enrolledClasses as any[]).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Topic you can help with</label>
                    <Input
                      placeholder="e.g. Algebra, JavaScript promises…"
                      value={helperTopic}
                      onChange={e => setHelperTopic(e.target.value.slice(0, 200))}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                    disabled={!helperClassId || !helperTopic.trim()}
                    onClick={async () => {
                      try {
                        await authFetch('/api/peer-helpers', {
                          method: 'POST',
                          body: JSON.stringify({ classId: Number(helperClassId), topic: helperTopic.trim() }),
                        });
                        toast({ title: 'Registered as peer helper!', description: `You'll be matched when someone needs help with "${helperTopic}".` });
                        setHelperTopic('');
                        queryClient.invalidateQueries({ queryKey: ['/api/peer-helpers', helperClassId] });
                      } catch (e: any) {
                        toast({ title: e.message || 'Failed to register', variant: 'destructive' });
                      }
                    }}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Register as Helper
                  </Button>

                  {/* Show existing helpers for selected class */}
                  {helperClassId && classHelpers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current helpers in this class:</p>
                      {classHelpers.slice(0, 5).map((h: any) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                            {h.helperName?.[0] || '?'}
                          </div>
                          <span className="font-medium">{h.helperName}</span>
                          <span className="text-slate-400">· {h.topic}</span>
                          {h.quizScore && <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-0">{h.quizScore}%</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Open Help Requests Board */}
            {peerHelpClassId && (
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-indigo-500" />
                    Open Requests in This Class
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {boardRequests.filter((r: any) => r.studentId !== user?.id).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No open requests right now — check back later.</p>
                  ) : (
                    <div className="space-y-3">
                      {boardRequests.filter((r: any) => r.studentId !== user?.id).map((req: any) => (
                        <div key={req.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{req.topic}</span>
                              <Badge className="text-[10px] h-4 bg-amber-100 text-amber-700 border-0">open</Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                            <p className="text-[10px] text-slate-400 mt-1">by {req.studentName} · {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs h-8"
                            onClick={async () => {
                              try {
                                await authFetch(`/api/peer-help-requests/${req.id}/offer`, { method: 'POST' });
                                toast({
                                  title: 'Offer submitted — pending coordinator approval',
                                  description: `${req.studentName} has been notified. Once they book a session, a coordinator must approve it before it begins.`,
                                });
                                refetchBoard();
                                refetchSessions();
                                refetchMyOffers();
                              } catch (e: any) {
                                toast({ title: e.message || 'Failed', variant: 'destructive' });
                              }
                            }}
                          >
                            <HandHelping className="w-3 h-3 mr-1" />
                            Help
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* My Pending Offers (helper view — offers awaiting requester to book) */}
            {myOfferedRequests.length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HandHelping className="w-4 h-4 text-amber-500" />
                    My Pending Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myOfferedRequests.map((req: any) => (
                      <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{req.topic}</span>
                            <Badge className="text-[10px] h-4 border-0 bg-amber-100 text-amber-700">
                              Pending coordinator approval
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Requested by {req.studentName} · waiting for them to book a session
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Requests */}
            {myPeerRequests.length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">My Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myPeerRequests.map((req: any) => (
                      <div key={req.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{req.topic}</span>
                            <Badge className={`text-[10px] h-4 border-0 ${
                              req.status === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                              req.status === 'resolved' ? 'bg-slate-100 text-slate-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {req.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                          {req.status === 'matched' && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> A peer helper has been matched — book a session below!
                            </p>
                          )}
                          {/* Inline booking form for matched requests */}
                          {req.status === 'matched' && bookingRequestId === req.id && (
                            <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Propose a date & time for your session</p>
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  className="flex-1 text-xs border border-border/60 dark:border-slate-700 rounded-md px-2 py-1.5 bg-card text-foreground"
                                  value={sessionDate}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={e => setSessionDate(e.target.value)}
                                />
                                <input
                                  type="time"
                                  className="flex-1 text-xs border border-border/60 dark:border-slate-700 rounded-md px-2 py-1.5 bg-card text-foreground"
                                  value={sessionTime}
                                  onChange={e => setSessionTime(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700"
                                  disabled={!sessionDate || !sessionTime || sessionSubmitting}
                                  onClick={async () => {
                                    setSessionSubmitting(true);
                                    try {
                                      await authFetch('/api/peer-sessions', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                          requestId: req.id,
                                          helperId: req.helperId,
                                          classId: req.classId,
                                          proposedDate: sessionDate,
                                          proposedTime: sessionTime,
                                        }),
                                      });
                                      toast({ title: 'Session request sent!', description: 'Waiting for coordinator approval.' });
                                      setBookingRequestId(null);
                                      setSessionDate('');
                                      setSessionTime('');
                                      refetchSessions();
                                    } catch (e: any) {
                                      toast({ title: e.message || 'Failed to book session', variant: 'destructive' });
                                    } finally {
                                      setSessionSubmitting(false);
                                    }
                                  }}
                                >
                                  {sessionSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CalendarClock className="w-3 h-3 mr-1" />}
                                  Confirm
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setBookingRequestId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {req.status === 'matched' && bookingRequestId !== req.id && (
                            <Button
                              size="sm"
                              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => { setBookingRequestId(req.id); setSessionDate(''); setSessionTime(''); }}
                            >
                              <CalendarClock className="w-3 h-3 mr-1" />
                              Book Session
                            </Button>
                          )}
                          {req.status === 'open' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 text-slate-400 hover:text-red-500"
                              onClick={async () => {
                                try {
                                  await authFetch(`/api/peer-help-requests/${req.id}/close`, { method: 'PATCH' });
                                  toast({ title: 'Request closed' });
                                  refetchMyRequests();
                                } catch (e: any) {
                                  toast({ title: e.message || 'Failed', variant: 'destructive' });
                                }
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Close
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Peer Sessions */}
            {mySessions.length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-indigo-500" />
                    My Peer Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(mySessions as any[]).map((s: any) => {
                      const isRequester = s.requesterId === user?.id;
                      const peerName = isRequester ? s.helperName : s.requesterName;
                      const statusColors: Record<string, string> = {
                        pending_approval: 'bg-amber-100 text-amber-700',
                        approved: 'bg-emerald-100 text-emerald-700',
                        rejected: 'bg-red-100 text-red-700',
                        completed: 'bg-slate-100 text-slate-600',
                        cancelled: 'bg-slate-100 text-slate-500',
                      };
                      return (
                        <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{s.className}</span>
                              <Badge className={`text-[10px] h-4 border-0 ${statusColors[s.status] || 'bg-slate-100 text-slate-600'}`}>
                                {s.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {isRequester ? 'Helper' : 'Helping'}: <span className="font-medium">{peerName}</span>
                            </p>
                            {(s.proposedDate || s.proposedTime) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {s.proposedDate} {s.proposedTime && `at ${s.proposedTime}`}
                              </p>
                            )}
                            {s.coordinatorNotes && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Note: {s.coordinatorNotes}</p>
                            )}
                          </div>
                          {['pending_approval', 'approved'].includes(s.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 text-xs h-8 text-slate-400 hover:text-red-500"
                              onClick={async () => {
                                try {
                                  await authFetch(`/api/peer-sessions/${s.id}/cancel`, { method: 'PATCH' });
                                  toast({ title: 'Session cancelled' });
                                  refetchSessions();
                                } catch (e: any) {
                                  toast({ title: e.message || 'Failed', variant: 'destructive' });
                                }
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
                try { answers = typeof reviewingQuizResult.answers === 'string' ? JSON.parse(reviewingQuizResult.answers) : (reviewingQuizResult.answers || {}); } catch { answers = {}; }
                if (questions.length === 0) return <p className="text-center text-slate-500 py-4">No questions available.</p>;
                return questions.map((q: any, idx: number) => {
                  const chosen = answers[idx];
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

      {/* Leave Review Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReviewingBooking(null)}>
          <div role="dialog" aria-modal="true" aria-label="Rate Your Session" className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border/60 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 dark:border-slate-800">
              <h3 className="text-base font-semibold text-foreground">Rate Your Session</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setReviewingBooking(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Session: <span className="font-medium text-foreground">{(reviewingBooking as any).classTitle || (reviewingBooking as any).className || `Session #${reviewingBooking.id}`}</span></p>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wide">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)}
                      className={`w-9 h-9 rounded-lg text-lg transition-colors ${n <= reviewRating ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">{reviewRating}/5</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Comment <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <Textarea placeholder="Share your experience with this tutor..." rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setReviewingBooking(null)}>Skip</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={submitReviewMutation.isPending}
                onClick={() => submitReviewMutation.mutate({
                  revieweeId: reviewingBooking.tutorId,
                  classId: reviewingBooking.classId,
                  rating: reviewRating,
                  comment: reviewComment,
                })}
              >
                {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {isCreatingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsCreatingNote(false)}>
          <div role="dialog" aria-modal="true" aria-label="New Note" className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border/60 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 dark:border-slate-800">
              <h3 className="text-base font-semibold text-foreground">New Note</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsCreatingNote(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Course <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <select
                  className="w-full border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-card text-foreground"
                  value={newNote.classId}
                  onChange={(e) => setNewNote({ ...newNote, classId: e.target.value })}
                >
                  <option value="">No course selected</option>
                  {(enrolledClasses as any[]).map((cls: any) => (
                    <option key={cls.id} value={String(cls.id)}>{cls.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Topic</label>
                <Input placeholder="e.g. Introduction to Algebra" value={newNote.topic} onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Notes</label>
                <Textarea placeholder="Write your notes here..." rows={5} value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Tags <span className="normal-case font-normal text-slate-400">(comma-separated)</span></label>
                <Input placeholder="algebra, equations, maths" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setIsCreatingNote(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!newNote.content || saveNoteMutation.isPending}
                onClick={() => {
                  const tagsArray = newNote.tags ? newNote.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                  saveNoteMutation.mutate({ topic: newNote.topic, content: newNote.content, tags: tagsArray, ...(newNote.classId ? { classId: newNote.classId } : {}) });
                }}
              >
                {saveNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Help + Feedback buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <Link href="/help-center">
          <Button size="icon" variant="outline" className="w-11 h-11 rounded-full shadow-lg border-slate-300 dark:border-slate-600 bg-card hover:bg-indigo-50 dark:hover:bg-indigo-950/30" title="Help Centre">
            <HelpCircle className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </Button>
        </Link>
        <Link href="/contact">
          <Button size="icon" className="w-11 h-11 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white" title="Give Feedback">
            <MessageCircle className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
