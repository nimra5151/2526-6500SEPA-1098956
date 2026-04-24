import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Booking, QuizResult } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { OnboardingModal } from '@/components/onboarding-modal';
import { DashboardSkeleton, StatCard, PageHeader } from '@/components/skeleton-loader';
import { StaggeredStatGrid } from '@/components/dashboard-ui';
import {
  BookOpen, Clock, Award, Calendar,
  Flame, HelpCircle, MessageCircle, AlertCircle,
  Star, Zap, Trophy, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { OverviewTab } from '@/components/student/OverviewTab';
import { CoursesTab } from '@/components/student/CoursesTab';
import { BookingsTab } from '@/components/student/BookingsTab';
import { LibraryTab } from '@/components/student/LibraryTab';
import { QuizzesTab } from '@/components/student/QuizzesTab';
import { AssignmentsTab } from '@/components/student/AssignmentsTab';
import { AnalyticsTab } from '@/components/student/AnalyticsTab';
import { MyTutorsTab } from '@/components/student/MyTutorsTab';
import { PeerHelpTab } from '@/components/student/PeerHelpTab';

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
  const notes: any[] = notesData as any[];

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
  const upcomingBookings = Array.isArray(bookings) ? (bookings as any[]).filter((b: any) => b.status === 'confirmed' || b.status === 'pending') : [];
  const completedBookings = Array.isArray(bookings) ? (bookings as any[]).filter((b: any) => b.status === 'completed') : [];
  const totalHours = Array.isArray(bookings) ? (bookings as any[]).reduce((acc: number, b: any) => acc + (Number(b.duration) || 0), 0) / 60 : 0;

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

  const studyStreak = (() => {
    const dateSet = new Set(completedBookings.map((b: any) => new Date(b.scheduledDate).toDateString()));
    let streak = 0;
    const d = new Date();
    while (dateSet.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const sessionsThisWeek = completedBookings.filter((b: any) => {
    const d = new Date(b.scheduledDate);
    return !isNaN(d.getTime()) && d >= weekStart;
  }).length;

  const passedQuizzes = (myQuizResults as any[]).filter((r: any) => r.passed);
  const badges = [
    { id: 'first-session', icon: Star, label: 'First Session', desc: 'Complete your first tutoring session', earned: completedBookings.length >= 1, color: 'text-amber-500' },
    { id: 'dedicated', icon: Flame, label: 'Dedicated Learner', desc: 'Complete 5+ sessions', earned: completedBookings.length >= 5, color: 'text-orange-500' },
    { id: 'quiz-starter', icon: Zap, label: 'Quiz Starter', desc: 'Pass your first quiz', earned: passedQuizzes.length >= 1, color: 'text-sky-500' },
    { id: 'quiz-master', icon: Trophy, label: 'Quiz Master', desc: 'Pass 5+ quizzes', earned: passedQuizzes.length >= 5, color: 'text-indigo-500' },
    { id: 'certified', icon: Award, label: 'Certified', desc: 'Earn a certificate', earned: (certificates as any[]).length >= 1, color: 'text-emerald-500' },
    { id: 'explorer', icon: BookOpen, label: 'Course Explorer', desc: 'Enrol in 3+ courses', earned: (enrolledClasses as any[]).length >= 3, color: 'text-rose-500' },
  ];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sessionsByMonth: Record<string, number> = {};
  completedBookings.forEach((b: any) => {
    const key = monthNames[new Date(b.scheduledDate).getMonth()];
    sessionsByMonth[key] = (sessionsByMonth[key] || 0) + 1;
  });
  const sessionChartData = monthNames.filter(m => sessionsByMonth[m]).map(m => ({ month: m, sessions: sessionsByMonth[m] }));

  const quizChartData = (myQuizResults as any[]).slice(-10).map((r: any, i: number) => ({
    name: r.quizTitle ? r.quizTitle.slice(0, 12) : `Q${i + 1}`,
    score: r.score || 0,
    pass: r.passed ? 1 : 0,
  }));

  const subjectMap: Record<string, number> = {};
  (enrolledClasses as any[]).forEach((cls: any) => {
    const cat = cls.category || 'Other';
    subjectMap[cat] = (subjectMap[cat] || 0) + 1;
  });
  const subjectChartData = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));

  const gradeChartData = (mySubmissions as any[]).filter((s: any) => s.grade !== null && s.grade !== undefined).slice(-8).map((s: any, i: number) => ({
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
      <OnboardingModal userId={user?.id} userName={user?.name || 'Student'} role="student" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="My Dashboard"
          description={`Welcome back, ${user?.name || 'Student'}! Keep up the great work.`}
        />

        {(statsError || classesError || bookingsError) && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Some dashboard data failed to load. Please refresh the page.
          </div>
        )}

        <StaggeredStatGrid columns={4}>
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </StaggeredStatGrid>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1">
            <TabsList className="mb-6 bg-card border border-border/60 dark:border-slate-800 shadow-sm h-10 p-1 rounded-lg w-max min-w-full sm:min-w-0">
              <TabsTrigger value="overview" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="courses" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">My Courses</TabsTrigger>
              <TabsTrigger value="bookings" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Bookings</TabsTrigger>
              <TabsTrigger value="library" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Library</TabsTrigger>
              <TabsTrigger value="quizzes" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Quizzes</TabsTrigger>
              <TabsTrigger value="assignments" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Assignments</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Analytics</TabsTrigger>
              <TabsTrigger value="tutors" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">My Tutors</TabsTrigger>
              <TabsTrigger value="peer-help" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Peer Help</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              enrolledClasses={enrolledClasses as any[]}
              classesLoading={classesLoading}
              upcomingBookings={upcomingBookings}
              completedBookings={completedBookings}
              deadlines={deadlines as any[]}
              deadlinesLoading={deadlinesLoading}
              deadlinesError={deadlinesError}
              certificates={certificates as any[]}
              badges={badges}
              recommendedClasses={recommendedClasses}
              progressMap={progressMap}
              getCompletionPct={getCompletionPct}
              sessionsThisWeek={sessionsThisWeek}
              goalPerWeek={goalPerWeek}
              setGoalPerWeek={setGoalPerWeek}
              editingGoal={editingGoal}
              setEditingGoal={setEditingGoal}
              totalHours={totalHours}
              studyStreak={studyStreak}
              enrolledCount={enrolledCount}
              passedQuizzes={passedQuizzes}
              recentlyViewedClasses={recentlyViewedClasses}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesTab
              enrolledClasses={enrolledClasses as any[]}
              classesLoading={classesLoading}
              progressMap={progressMap}
              getCompletionPct={getCompletionPct}
            />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <BookingsTab
              bookings={bookings as any[]}
              bookingsLoading={bookingsLoading}
              user={user}
              reviewingBooking={reviewingBooking}
              setReviewingBooking={setReviewingBooking}
              reviewRating={reviewRating}
              setReviewRating={setReviewRating}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              cancelBookingMutation={cancelBookingMutation}
              submitReviewMutation={submitReviewMutation}
            />
          </TabsContent>

          <TabsContent value="library" className="space-y-8">
            <LibraryTab
              favorites={favorites as any[]}
              favoritesLoading={favoritesLoading}
              notes={notes}
              mySubmissions={mySubmissions as any[]}
              enrolledClasses={enrolledClasses as any[]}
              isCreatingNote={isCreatingNote}
              setIsCreatingNote={setIsCreatingNote}
              newNote={newNote}
              setNewNote={setNewNote}
              removeFavoriteMutation={removeFavoriteMutation}
              deleteNoteMutation={deleteNoteMutation}
              saveNoteMutation={saveNoteMutation}
            />
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <QuizzesTab
              myQuizResults={myQuizResults as any[]}
              quizResultsLoading={quizResultsLoading}
              quizResultsError={quizResultsError}
              reviewingQuizResult={reviewingQuizResult}
              setReviewingQuizResult={setReviewingQuizResult}
              reviewQuizData={reviewQuizData}
            />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <AssignmentsTab
              deadlines={deadlines as any[]}
              deadlinesLoading={deadlinesLoading}
              deadlinesError={deadlinesError}
              classAssignments={classAssignments as any[]}
              classAssignmentsLoading={classAssignmentsLoading}
              mySubmissions={mySubmissions as any[]}
              submissionsLoading={submissionsLoading}
              submissionsError={submissionsError}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab
              sessionChartData={sessionChartData}
              quizChartData={quizChartData}
              subjectChartData={subjectChartData}
              gradeChartData={gradeChartData}
              myQuizResults={myQuizResults as any[]}
              passedQuizzes={passedQuizzes}
              completedBookings={completedBookings}
              mySubmissions={mySubmissions as any[]}
            />
          </TabsContent>

          <TabsContent value="tutors" className="space-y-4">
            <MyTutorsTab
              myTutors={myTutors as any[]}
              tutorsLoading={tutorsLoading}
              tutorsError={tutorsError}
            />
          </TabsContent>

          <TabsContent value="peer-help" className="space-y-6">
            <PeerHelpTab
              enrolledClasses={enrolledClasses as any[]}
              user={user}
              peerHelpClassId={peerHelpClassId}
              setPeerHelpClassId={setPeerHelpClassId}
              peerHelpTopic={peerHelpTopic}
              setPeerHelpTopic={setPeerHelpTopic}
              peerHelpDesc={peerHelpDesc}
              setPeerHelpDesc={setPeerHelpDesc}
              peerHelpSubmitting={peerHelpSubmitting}
              setPeerHelpSubmitting={setPeerHelpSubmitting}
              helperTopic={helperTopic}
              setHelperTopic={setHelperTopic}
              helperClassId={helperClassId}
              setHelperClassId={setHelperClassId}
              bookingRequestId={bookingRequestId}
              setBookingRequestId={setBookingRequestId}
              sessionDate={sessionDate}
              setSessionDate={setSessionDate}
              sessionTime={sessionTime}
              setSessionTime={setSessionTime}
              sessionSubmitting={sessionSubmitting}
              setSessionSubmitting={setSessionSubmitting}
              myPeerRequests={myPeerRequests}
              refetchMyRequests={refetchMyRequests}
              boardRequests={boardRequests}
              refetchBoard={refetchBoard}
              classHelpers={classHelpers as any[]}
              myOfferedRequests={myOfferedRequests}
              refetchMyOffers={refetchMyOffers}
              mySessions={mySessions}
              refetchSessions={refetchSessions}
            />
          </TabsContent>
        </Tabs>
      </div>

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
