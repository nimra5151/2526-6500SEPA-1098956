import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users, BookOpen, TrendingUp, Star, Activity,
  Search, Eye, CheckCircle, XCircle,
  AlertTriangle, Shield, Bell, Settings,
  GraduationCap, Trash2, Ban, UserCheck, Loader2,
  X, MessageSquare, Download, Clock, ThumbsUp, ThumbsDown, BarChart3,
  Megaphone, Trophy, HeartHandshake, RefreshCw, FileText, Send, UserCog, CalendarClock,
} from 'lucide-react';
import { DashboardSkeleton, StatCard, PageHeader, TableRowSkeleton } from '@/components/skeleton-loader';
import { StaggeredStatGrid, DataTableCard } from '@/components/dashboard-ui';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const CATEGORY_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#64748B', '#EC4899', '#8B5CF6', '#F97316'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectingTutor, setRejectingTutor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [changingRoleUser, setChangingRoleUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [notifyingReporter, setNotifyingReporter] = useState<any>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [flaggingQuiz, setFlaggingQuiz] = useState<any>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<number>>(new Set());
  // #89: replace window.confirm for bulk operations with state-driven dialog
  const [confirmBulk, setConfirmBulk] = useState<{ ids: number[]; action: string } | null>(null);

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => authFetch('/api/admin/users'),
    staleTime: 60_000,
  });

  const { data: allClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['admin', 'classes'],
    queryFn: () => authFetch('/api/admin/classes'),
    staleTime: 60_000,
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => authFetch('/api/dashboard/stats'),
    staleTime: 60_000,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => authFetch('/api/admin/reports'),
    staleTime: 15_000,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => authFetch('/api/dashboard/activity?limit=10'),
    staleTime: 60_000,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: () => authFetch('/api/admin/bookings'),
    staleTime: 60_000,
  });

  const { data: adminNotifications = [] } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => authFetch('/api/admin/notifications?limit=50'),
    staleTime: 60_000,
  });

  const { data: allQuizzes = [] } = useQuery({
    queryKey: ['admin', 'quizzes'],
    queryFn: () => authFetch('/api/admin/quizzes'),
    staleTime: 60_000,
  });

  const { data: contactSubmissions = [] } = useQuery({
    queryKey: ['admin', 'contact-submissions'],
    queryFn: () => authFetch('/api/admin/contact-submissions'),
    staleTime: 60_000,
  });

  const { data: peerSessions = [], refetch: refetchPeerSessions } = useQuery<any[]>({
    queryKey: ['admin', 'peer-sessions'],
    queryFn: () => authFetch('/api/peer-sessions/pending'),
    enabled: activeTab === 'peer-sessions',
    staleTime: 30_000,
  });

  const verifyMutation = useMutation({
    mutationFn: (userId: number) =>
      authFetch(`/api/admin/users/${userId}/verify`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User verification status updated.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update verification', description: err.message, variant: 'destructive' }),
  });

  const blockMutation = useMutation({
    mutationFn: (userId: number) =>
      authFetch(`/api/admin/users/${userId}/block`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User block status updated.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update block status', description: err.message, variant: 'destructive' }),
  });

  const deleteClassMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/admin/classes/${classId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] });
      toast({ title: 'Class removed from platform.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to delete class', description: err.message, variant: 'destructive' }),
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) =>
      authFetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast({ title: 'Report status updated.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update report', description: err.message, variant: 'destructive' }),
  });

  const approveTutorMutation = useMutation({
    mutationFn: (userId: number) => authFetch(`/api/admin/users/${userId}/approve`, { method: 'PATCH' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      if (data?.emailSent === false) {
        toast({ title: 'Tutor approved', description: 'Approved, but the notification email could not be sent. Check your email settings.', variant: 'destructive' });
      } else {
        toast({ title: 'Tutor approved', description: 'The tutor has been approved and notified by email.' });
      }
    },
    onError: (err: Error) => toast({ title: 'Approval failed', description: err.message, variant: 'destructive' }),
  });

  const rejectTutorMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      authFetch(`/api/admin/users/${userId}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setRejectingTutor(null);
      setRejectReason('');
      if (data?.emailSent === false) {
        toast({ title: 'Application rejected', description: 'Rejected, but the notification email could not be sent. Check your email settings.', variant: 'destructive' });
      } else {
        toast({ title: 'Application rejected', description: 'The tutor has been notified by email.' });
      }
    },
    onError: (err: Error) => toast({ title: 'Rejection failed', description: err.message, variant: 'destructive' }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      authFetch(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: (_data, { role }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setChangingRoleUser(null);
      setNewRole('');
      toast({ title: `Role changed to ${role} successfully.` });
    },
    onError: (err: Error) => toast({ title: 'Role change failed', description: err.message, variant: 'destructive' }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeletingUser(null);
      setSelectedUser(null);
      toast({ title: 'User account deleted.' });
    },
    onError: (err: Error) => toast({ title: 'Delete failed', description: err.message, variant: 'destructive' }),
  });

  
  const notifyReporterMutation = useMutation({
    mutationFn: ({ receiverId, content }: { receiverId: number; content: string }) =>
      authFetch('/api/messages', { method: 'POST', body: JSON.stringify({ receiverId, content }) }),
    onSuccess: () => {
      setNotifyingReporter(null);
      setNotifyMessage('');
      toast({ title: 'Reporter notified via message.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' }),
  });

  const removeQuizMutation = useMutation({
    mutationFn: (quizId: number) => authFetch(`/api/admin/quizzes/${quizId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] });
      toast({ title: 'Quiz removed from platform.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to remove quiz', description: err.message, variant: 'destructive' }),
  });

  const flagContentMutation = useMutation({
    mutationFn: ({ targetType, targetId, description }: { targetType: string; targetId: number; description: string }) =>
      authFetch('/api/report', { method: 'POST', body: JSON.stringify({ reportType: 'inappropriate_content', targetType, targetId, description }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setFlaggingQuiz(null);
      toast({ title: 'Content flagged and added to reports queue.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to flag content', description: err.message, variant: 'destructive' }),
  });

  const bulkBlockMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const results = await Promise.allSettled(
        userIds.map(id => authFetch(`/api/admin/users/${id}/block`, { method: 'PATCH' }))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      return { total: userIds.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedStudentIds(new Set());
      setSelectedTeacherIds(new Set());
      if (failed > 0) {
        toast({ title: `Partial completion: ${total - failed} of ${total} updated.`, description: `${failed} user(s) could not be updated (they may be coordinator accounts).`, variant: 'destructive' });
      } else {
        toast({ title: 'Bulk action completed.', description: `${total} user(s) updated successfully.` });
      }
    },
    onError: (err: Error) => toast({ title: 'Bulk action failed', description: err.message, variant: 'destructive' }),
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePrintPDF = () => {
    const esc = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const printContent = `
      <html><head><title>TutorBridge Platform Report</title>
      <style>body{font-family:sans-serif;padding:20px;color:#111}h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f3f4f6}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px}.green{background:#dcfce7;color:#166534}.blue{background:#dbeafe;color:#1d4ed8}.gray{background:#f3f4f6;color:#374151}@media print{body{print-color-adjust:exact}h2{page-break-before:always}h2:first-of-type{page-break-before:auto}}</style>
      </head><body>
      <h1>TutorBridge — Platform Report</h1>
      <p style="color:#666;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
      <h2>Platform Overview</h2>
      <table><tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Users</td><td>${totalUsers}</td></tr>
        <tr><td>Students</td><td>${totalStudents}</td></tr>
        <tr><td>Tutors</td><td>${totalTeachers}</td></tr>
        <tr><td>Total Classes</td><td>${totalClasses}</td></tr>
        <tr><td>Active Classes</td><td>${classesList.filter((c: any) => c.status === 'active').length}</td></tr>
        <tr><td>Total Bookings</td><td>${(allBookings as any[]).length}</td></tr>
        <tr><td>Safeguarding Reports</td><td>${(reports as any[]).length}</td></tr>
        <tr><td>Pending Tutor Approvals</td><td>${pendingTutors.length}</td></tr>
      </table>
      <h2>Top Classes by Enrollment</h2>
      <table><tr><th>Title</th><th>Category</th><th>Enrolled</th><th>Status</th></tr>
        ${popularClasses.map((c: any) => `<tr><td>${esc(c.title)}</td><td>${esc(c.category || '-')}</td><td>${c.enrolledCount || 0}</td><td>${esc(c.status)}</td></tr>`).join('')}
      </table>
      <h2>Top Tutors by Rating</h2>
      <table><tr><th>Name</th><th>Rating</th><th>Reviews</th></tr>
        ${topTutors.map((t: any) => `<tr><td>${esc(t.name)}</td><td>${Number(t.rating || 0).toFixed(1)}</td><td>${t.totalReviews || 0}</td></tr>`).join('')}
      </table>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
  };

  const handleExport = (data: any[], type: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row: any) =>
        headers.map((h) => {
          const val = row[h];
          const str = Array.isArray(val) ? val.filter(Boolean).join('; ') : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;
  if (user.role !== 'coordinator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-slate-600 mt-2">You do not have permission to view this page.</p>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const students = allUsers.filter((u: any) => u.role === 'student');
  const teachers = allUsers.filter((u: any) => u.role === 'tutor');
  const totalUsers = allUsers.length;
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = Array.isArray(allClasses) ? allClasses.length : 0;

  const filteredStudents = students.filter((s: any) =>
    !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredTeachers = teachers.filter((t: any) =>
    !teacherSearch || t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.email.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const classesList = Array.isArray(allClasses) ? allClasses : [];
  const categoryMap: Record<string, number> = {};
  classesList.forEach((c: any) => {
    const cat = c.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const courseCategoryData = Object.entries(categoryMap).map(([name, value], i) => ({
    name,
    value,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // Pending tutor approvals
  const pendingTutors = teachers.filter((t: any) => t.isPendingApproval);

  // Top tutors by rating (tutor with ≥1 review)
  const topTutors = [...teachers]
    .filter((t: any) => t.totalReviews > 0)
    .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 5);

  // Most popular classes by enrolled count
  const popularClasses = [...classesList]
    .sort((a: any, b: any) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
    .slice(0, 5);

  // Orphanage breakdown
  const orphanageMap: Record<string, number> = {};
  students.forEach((s: any) => {
    const org = s.orphanage || 'Unknown';
    orphanageMap[org] = (orphanageMap[org] || 0) + 1;
  });
  const orphanageData = Object.entries(orphanageMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));


  // Booking status distribution for analytics
  const bookingStatusData = (() => {
    const counts: Record<string, number> = { completed: 0, confirmed: 0, pending: 0, cancelled: 0, 'no-show': 0 };
    (allBookings as any[]).forEach((b: any) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return [
      { name: 'Completed', value: counts.completed, color: '#10B981' },
      { name: 'Confirmed', value: counts.confirmed, color: '#6366F1' },
      { name: 'Pending', value: counts.pending, color: '#F59E0B' },
      { name: 'Cancelled', value: counts.cancelled, color: '#EF4444' },
      { name: 'No-Show', value: counts['no-show'], color: '#64748B' },
    ].filter(d => d.value > 0);
  })();

  // Bookings per day (last 14 days)
  const bookingsPerDay = (() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      days[key] = 0;
    }
    (allBookings as any[]).forEach((b: any) => {
      const key = new Date(b.scheduledDate || b.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  })();

  // Volunteer hours leaderboard — memoized to avoid recomputing on every render
  const volunteerLeaderboard = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    (allBookings as any[]).filter((b: any) => b.status === 'completed').forEach((b: any) => {
      hoursMap[b.tutorId] = (hoursMap[b.tutorId] || 0) + (Number(b.duration) || 0);
    });
    return teachers
      .map((t: any) => ({ ...t, hoursMinutes: hoursMap[t.id] || 0, hours: Math.round((hoursMap[t.id] || 0) / 60 * 10) / 10 }))
      .filter((t: any) => t.hours > 0)
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 10);
  }, [allBookings, teachers]);

  const isLoading = usersLoading || classesLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Local component for approve/reject with optional notes input
  function PeerSessionAction({ sessionId, action, onDone }: { sessionId: number; action: 'approve' | 'reject'; onDone: () => void }) {
    const [notes, setNotes] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const isApprove = action === 'approve';
    if (!open) {
      return (
        <Button
          size="sm"
          variant={isApprove ? 'default' : 'outline'}
          className={`text-xs h-8 ${isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
          onClick={() => setOpen(true)}
        >
          {isApprove ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
          {isApprove ? 'Approve' : 'Reject'}
        </Button>
      );
    }
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <input
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-card dark:border-slate-600"
          placeholder="Optional notes for students…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            className={`text-xs h-7 flex-1 ${isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await authFetch(`/api/peer-sessions/${sessionId}/${action}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ coordinatorNotes: notes.trim() || undefined }),
                });
                toast({ title: isApprove ? 'Session approved! Students notified.' : 'Session rejected. Students notified.' });
                setOpen(false);
                onDone();
              } catch (e: any) {
                toast({ title: e.message || 'Failed', variant: 'destructive' });
              } finally { setLoading(false); }
            }}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Admin Dashboard"
          description="Monitor platform performance and manage TutorBridge"
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/send-notification">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => {
                const data = [
                  { section: 'Users', total: totalUsers, students: totalStudents, teachers: totalTeachers },
                  { section: 'Classes', total: totalClasses, active: classesList.filter((c: any) => c.status === 'active').length },
                  { section: 'Reports', total: (reports as any[]).length, pending: (reports as any[]).filter((r: any) => r.status === 'pending').length },
                ];
                handleExport(data, 'platform_report');
                toast({ title: 'Platform report exported as CSV.' });
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport(allUsers as any[], 'all_users')}>
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </Link>
            </div>
          }
        />

        <StaggeredStatGrid columns={4}>
          <StatCard label="Total Users" value={totalUsers} icon={Users} iconBg="bg-indigo-100 dark:bg-indigo-500/10" iconColor="text-indigo-600 dark:text-indigo-400" />
          <StatCard label="Students" value={totalStudents} icon={GraduationCap} iconBg="bg-blue-100 dark:bg-blue-500/10" iconColor="text-blue-600 dark:text-blue-400" />
          <StatCard label="Teachers" value={totalTeachers} icon={BookOpen} iconBg="bg-emerald-100 dark:bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Total Classes" value={totalClasses} icon={Star} iconBg="bg-amber-100 dark:bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-400" />
        </StaggeredStatGrid>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1">
          <TabsList className="bg-card border border-border/60 dark:border-slate-800 shadow-sm h-10 p-1 rounded-lg w-max min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white relative">
              <Clock className="w-4 h-4 mr-2" />
              Approvals
              {pendingTutors.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingTutors.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="students" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="teachers" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="content" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <HeartHandshake className="w-4 h-4 mr-2" />
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="peer-sessions" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white relative">
              <CalendarClock className="w-4 h-4 mr-2" />
              Peer Sessions
              {(peerSessions as any[]).filter((s: any) => s.status === 'pending_approval').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {(peerSessions as any[]).filter((s: any) => s.status === 'pending_approval').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-sm rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Megaphone className="w-4 h-4 mr-2" />
              Communications
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Pending approvals alert */}
            {pendingTutors.length > 0 && (
              <div
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 cursor-pointer"
                onClick={() => setActiveTab('approvals')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {pendingTutors.length} tutor application{pendingTutors.length !== 1 ? 's' : ''} awaiting review
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Click to review pending applications</p>
                  </div>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  Review Now
                </Button>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground">Platform Overview</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                      <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{totalUsers}</div>
                      <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Users</div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalStudents}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Students</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalTeachers}</div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-400">Teachers</div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalClasses}</div>
                      <div className="text-sm text-amber-600 dark:text-amber-400">Classes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {courseCategoryData.length > 0 && (
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b dark:border-slate-700">
                    <CardTitle className="text-xl text-foreground">Course Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={courseCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {courseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {courseCategoryData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Monthly User Registration Trend */}
            {(() => {
              const monthlyRegs: Record<string, number> = {};
              (allUsers as any[]).forEach((u: any) => {
                if (u.createdAt) {
                  const key = new Date(u.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
                  monthlyRegs[key] = (monthlyRegs[key] || 0) + 1;
                }
              });
              const regData = Object.entries(monthlyRegs).slice(-6).map(([month, users]) => ({ month, users }));
              return regData.length > 0 ? (
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b dark:border-slate-700">
                    <CardTitle className="text-xl text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Monthly User Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={regData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" strokeOpacity={0.5} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Area type="monotone" dataKey="users" stroke="#6366F1" fillOpacity={1} fill="url(#colorUsers)" name="New Users" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Platform Health */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {(allUsers as any[]).filter((u: any) => u.isVerified).length}
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">Verified Users</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {(allUsers as any[]).filter((u: any) => u.isBlocked).length}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Blocked Users</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {(Array.isArray(allClasses) ? allClasses : []).filter((c: any) => c.status === 'active').length}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Active Classes</div>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {(reports as any[]).filter((r: any) => r.status === 'pending').length}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Pending Reports</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Recent Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {recentActivity.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity: any, idx: number) => (
                      <div
                        key={`${activity.type}-${activity.id}-${idx}`}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                      >
                        <div className="p-2.5 rounded-full bg-green-100 dark:bg-green-900/20">
                          {activity.type === 'signup' && <Users className="w-4 h-4 text-green-600" />}
                          {activity.type === 'booking' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                          {(activity.type === 'class' || activity.type === 'class_created') && <BookOpen className="w-4 h-4 text-indigo-600" />}
                          {activity.type === 'review' && <Star className="w-4 h-4 text-yellow-600" />}
                          {activity.type === 'report' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {!['signup', 'booking', 'class', 'class_created', 'review', 'report'].includes(activity.type) && (
                            <Activity className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{activity.userName || 'System'}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{activity.details || activity.type?.replace(/_/g, ' ')}</div>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">{activity.createdAt ? new Date(activity.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Top Tutors + Popular Classes */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Tutors */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" /> Top Tutors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {topTutors.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-500">No tutor reviews yet</p>
                  ) : (
                    <div className="divide-y dark:divide-slate-700">
                      {topTutors.map((tutor: any, i: number) => (
                        <div key={tutor.id} className="flex items-center gap-3 px-6 py-3 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {i + 1}
                          </span>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={tutor.avatar || ''} />
                            <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 text-xs font-semibold">{getInitials(tutor.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tutor.name}</p>
                            <p className="text-xs text-slate-500">{tutor.totalReviews} review{tutor.totalReviews !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-foreground">{Number(tutor.rating).toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Popular Classes */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Most Popular Classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {popularClasses.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-500">No classes yet</p>
                  ) : (
                    <div className="divide-y dark:divide-slate-700">
                      {popularClasses.map((cls: any, i: number) => (
                        <div key={cls.id} className="flex items-center gap-3 px-6 py-3 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{cls.title}</p>
                            <p className="text-xs text-slate-500 truncate">{cls.category} · {cls.skillLevel}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-foreground">{cls.enrolledCount || 0}</p>
                            <p className="text-xs text-slate-400">enrolled</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Orphanage Breakdown */}
            {orphanageData.length > 0 && (
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-sky-500" /> Students by Orphanage
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {orphanageData.map(({ name, count }) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400 w-40 truncate shrink-0">{name}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${Math.max(4, (count / Math.max(1, totalStudents)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-8 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── APPROVALS ──────────────────────────────────────────────────── */}
          <TabsContent value="approvals" className="space-y-6">
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Pending Tutor Applications ({pendingTutors.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {pendingTutors.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/20 mb-4">
                      <CheckCircle className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No pending tutor applications at this time.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {pendingTutors.map((tutor: any) => (
                      <div key={tutor.id} className="p-6 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarImage src={tutor.avatar || ''} />
                              <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold">
                                {getInitials(tutor.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">{tutor.name}</h4>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending Review</Badge>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{tutor.email}</p>
                              {tutor.organization && <p className="text-xs text-slate-500 dark:text-slate-400">Organization: {tutor.organization}</p>}
                              {tutor.bio && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{tutor.bio}</p>}
                              {tutor.skillsTaught && tutor.skillsTaught.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tutor.skillsTaught.slice(0, 5).map((skill: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs">{skill}</Badge>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-slate-400 mt-2">Applied: {tutor.createdAt ? new Date(tutor.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Link href={`/profile/${tutor.id}`}>
                              <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
                              </Button>
                            </Link>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                              onClick={() => approveTutorMutation.mutate(tutor.id)}
                              disabled={approveTutorMutation.isPending}>
                              {approveTutorMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ThumbsUp className="w-3.5 h-3.5 mr-1" />Approve</>}
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 text-xs"
                              onClick={() => { setRejectingTutor(tutor); setRejectReason(''); }}>
                              <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <DataTableCard
              title="Student Profiles"
              count={students.length}
              searchValue={studentSearch}
              onSearchChange={setStudentSearch}
              searchPlaceholder="Search students..."
              onExport={() => handleExport(students, 'students')}
              bulkBar={selectedStudentIds.size > 0 ? (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-indigo-800">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{selectedStudentIds.size} selected</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      disabled={bulkBlockMutation.isPending}
                      onClick={() => {
                        const toBlock = filteredStudents.filter((s: any) => selectedStudentIds.has(s.id) && !s.isBlocked).map((s: any) => s.id);
                        if (toBlock.length) setConfirmBulk({ ids: toBlock, action: 'block' });
                      }}>
                      Block Selected
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                      disabled={bulkBlockMutation.isPending}
                      onClick={() => {
                        const toUnblock = filteredStudents.filter((s: any) => selectedStudentIds.has(s.id) && s.isBlocked).map((s: any) => s.id);
                        if (toUnblock.length) setConfirmBulk({ ids: toUnblock, action: 'unblock' });
                      }}>
                      Unblock Selected
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedStudentIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                ) : undefined}
            >
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 w-8">
                          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                            checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                            onChange={() => {
                              if (selectedStudentIds.size === filteredStudents.length) {
                                setSelectedStudentIds(new Set());
                              } else {
                                setSelectedStudentIds(new Set(filteredStudents.map((s: any) => s.id)));
                              }
                            }}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Orphanage</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No students found
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student: any) => (
                          <tr key={student.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors ${selectedStudentIds.has(student.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                            <td className="px-4 py-4">
                              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                                checked={selectedStudentIds.has(student.id)}
                                onChange={() => setSelectedStudentIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(student.id)) next.delete(student.id); else next.add(student.id);
                                  return next;
                                })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={student.avatar || ''} />
                                  <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                                    {getInitials(student.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground">{student.name}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">{student.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {student.orphanage || '—'}
                            </td>
                            <td className="px-6 py-4">
                              {student.isVerified ? (
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                                  Unverified
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {student.isBlocked ? (
                                <Badge className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                  Blocked
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                  Active
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                <Link href={`/profile/${student.id}`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                    <Eye className="w-3 h-3 mr-1" /> View
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => verifyMutation.mutate(student.id)}
                                  disabled={verifyMutation.isPending}
                                >
                                  <UserCheck className="w-3 h-3 mr-1" />{student.isVerified ? 'Unverify' : 'Verify'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`h-7 text-xs ${student.isBlocked ? 'text-slate-600 border-slate-200 hover:bg-slate-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                                  onClick={() => blockMutation.mutate(student.id)}
                                  disabled={blockMutation.isPending}
                                >
                                  <Ban className="w-3 h-3 mr-1" />{student.isBlocked ? 'Unblock' : 'Block'}
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedUser(student)}>
                                  <Settings className="w-3 h-3 mr-1" /> Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
            </DataTableCard>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-6">
            <DataTableCard
              title="Teacher Profiles"
              count={teachers.length}
              searchValue={teacherSearch}
              onSearchChange={setTeacherSearch}
              searchPlaceholder="Search teachers..."
              onExport={() => handleExport(teachers, 'teachers')}
              bulkBar={selectedTeacherIds.size > 0 ? (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-indigo-800">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{selectedTeacherIds.size} selected</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      disabled={bulkBlockMutation.isPending}
                      onClick={() => {
                        const toBlock = filteredTeachers.filter((t: any) => selectedTeacherIds.has(t.id) && !t.isBlocked).map((t: any) => t.id);
                        if (toBlock.length) setConfirmBulk({ ids: toBlock, action: 'block' });
                      }}>
                      Block Selected
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                      disabled={bulkBlockMutation.isPending}
                      onClick={() => {
                        const toUnblock = filteredTeachers.filter((t: any) => selectedTeacherIds.has(t.id) && t.isBlocked).map((t: any) => t.id);
                        if (toUnblock.length) setConfirmBulk({ ids: toUnblock, action: 'unblock' });
                      }}>
                      Unblock Selected
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedTeacherIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                ) : undefined}
            >
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 w-8">
                          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                            checked={filteredTeachers.length > 0 && selectedTeacherIds.size === filteredTeachers.length}
                            onChange={() => {
                              if (selectedTeacherIds.size === filteredTeachers.length) {
                                setSelectedTeacherIds(new Set());
                              } else {
                                setSelectedTeacherIds(new Set(filteredTeachers.map((t: any) => t.id)));
                              }
                            }}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Teacher</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Skills</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Reviews</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {filteredTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No teachers found
                          </td>
                        </tr>
                      ) : (
                        filteredTeachers.map((teacher: any) => (
                          <tr key={teacher.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors ${selectedTeacherIds.has(teacher.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                            <td className="px-4 py-4">
                              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                                checked={selectedTeacherIds.has(teacher.id)}
                                onChange={() => setSelectedTeacherIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(teacher.id)) next.delete(teacher.id); else next.add(teacher.id);
                                  return next;
                                })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={teacher.avatar || ''} />
                                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                                    {getInitials(teacher.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">{teacher.name}</span>
                                    {teacher.isPendingApproval && (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs py-0 px-1.5">Pending</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">{teacher.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {(teacher.skillsTaught || []).slice(0, 3).map((skill: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {(!teacher.skillsTaught || teacher.skillsTaught.length === 0) && (
                                  <span className="text-sm text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="font-semibold text-foreground">
                                  {teacher.rating ? Number(teacher.rating).toFixed(1) : '0.0'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {teacher.totalReviews || 0}
                            </td>
                            <td className="px-6 py-4">
                              {teacher.isVerified ? (
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {teacher.isBlocked ? (
                                <Badge className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                  Blocked
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                  Active
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                {teacher.isPendingApproval ? (
                                  <>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                                      onClick={() => approveTutorMutation.mutate(teacher.id)}
                                      disabled={approveTutorMutation.isPending}>
                                      {approveTutorMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ThumbsUp className="w-3 h-3 mr-1" />Approve</>}
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs"
                                      onClick={() => { setRejectingTutor(teacher); setRejectReason(''); }}>
                                      <ThumbsDown className="w-3 h-3 mr-1" /> Reject
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Link href={`/profile/${teacher.id}`}>
                                      <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Eye className="w-3 h-3 mr-1" /> View
                                      </Button>
                                    </Link>
                                    <Button variant="outline" size="sm"
                                      className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                      onClick={() => verifyMutation.mutate(teacher.id)}
                                      disabled={verifyMutation.isPending}>
                                      <UserCheck className="w-3 h-3 mr-1" />{teacher.isVerified ? 'Unverify' : 'Verify'}
                                    </Button>
                                    <Button variant="outline" size="sm"
                                      className={`h-7 text-xs ${teacher.isBlocked ? 'text-slate-600 border-slate-200 hover:bg-slate-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                                      onClick={() => blockMutation.mutate(teacher.id)}
                                      disabled={blockMutation.isPending}>
                                      <Ban className="w-3 h-3 mr-1" />{teacher.isBlocked ? 'Unblock' : 'Block'}
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedUser(teacher)}>
                                      <Settings className="w-3 h-3 mr-1" /> Details
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
            </DataTableCard>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl text-foreground">Content Management ({classesList.length} classes)</CardTitle>
                  {classesList.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleExport(classesList, 'classes')}>
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {classesList.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                      <Shield className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Classes</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">
                      No classes have been created yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Class</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Enrolled</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {classesList.map((cls: any) => (
                          <tr key={cls.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{cls.title}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{cls.description}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                                {cls.category}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {cls.status === 'active' ? (
                                <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                  Active
                                </Badge>
                              ) : cls.status === 'completed' ? (
                                <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                                  {cls.status}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {cls.enrolledCount || 0} / {cls.maxStudents || 10}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <Link href={`/classes/${cls.id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 px-2">
                                    <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this class?')) {
                                      deleteClassMutation.mutate(cls.id);
                                    }
                                  }}
                                  disabled={deleteClassMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Quizzes Moderation */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground">Quiz Moderation ({(allQuizzes as any[]).length} quizzes)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(allQuizzes as any[]).length === 0 ? (
                  <div className="py-10 text-center text-slate-500 dark:text-slate-400">No quizzes found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Questions</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Time Limit</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {(allQuizzes as any[]).map((quiz: any) => {
                          let questionCount = 0;
                          if (Array.isArray(quiz.questions)) {
                            questionCount = quiz.questions.length;
                          } else {
                            try { questionCount = JSON.parse(quiz.questions || '[]').length; } catch { }
                          }
                          return (
                            <tr key={quiz.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="px-6 py-4">
                                <div className="font-medium text-foreground">{quiz.title}</div>
                                {quiz.description && <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{quiz.description}</div>}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{questionCount} Qs</td>
                              <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => setFlaggingQuiz(quiz)}>
                                    <AlertTriangle className="w-4 h-4 mr-1" /> Flag
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={removeQuizMutation.isPending}
                                    onClick={() => { if (confirm('Remove this quiz from the platform?')) removeQuizMutation.mutate(quiz.id); }}>
                                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flagged Content Queue */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Flagged Content Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const contentReports = (reports as any[]).filter((r: any) => r.targetType && r.targetType !== 'user');
                  if (contentReports.length === 0) {
                    return <div className="py-10 text-center text-slate-500 dark:text-slate-400">No flagged content.</div>;
                  }
                  return (
                    <div className="divide-y dark:divide-slate-700">
                      {contentReports.map((r: any) => (
                        <div key={r.id} className="px-6 py-4 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={r.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
                                {r.status}
                              </Badge>
                              <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                                {r.targetType} #{r.targetId}
                              </Badge>
                              <span className="text-xs text-slate-400">{r.reportType?.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{r.description}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="outline" size="sm" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => updateReportMutation.mutate({ id: r.id, status: 'resolved' })}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl text-foreground">
                    Safeguarding Reports ({reports.length})
                  </CardTitle>
                  {reports.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleExport(reports as any[], 'safeguarding_reports')}>
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {reportsLoading ? (
                  <table className="w-full">
                    <tbody className="divide-y dark:divide-slate-700">
                      {[0, 1, 2, 3, 4].map(i => <TableRowSkeleton key={i} />)}
                    </tbody>
                  </table>
                ) : reports.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                      <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Reports</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">
                      No safeguarding reports have been submitted.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {reports.map((report: any) => (
                      <div key={report.id} className="p-6 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer" onClick={() => { setSelectedReport(report); setAdminNotes((report as any).adminNotes || ''); }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                report.status === 'pending'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                  : report.status === 'investigating'
                                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                  : report.status === 'resolved'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              }>
                                {report.status}
                              </Badge>
                              <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                {report.reportType?.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {report.targetType} {report.targetId ? `#${report.targetId}` : ''}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{report.description}</p>
                            <p className="text-xs text-slate-400">
                              Reported: {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}
                              {(report.reporterName || report.reporterId) && ` | Reporter: ${report.reporterName || `#${report.reporterId}`}`}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {report.status === 'pending' && (
                              <>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                                  onClick={(e) => { e.stopPropagation(); updateReportMutation.mutate({ id: report.id, status: 'investigating' }); }}
                                  disabled={updateReportMutation.isPending}>
                                  <Search className="w-3 h-3 mr-1" /> Investigate
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs"
                                  onClick={(e) => { e.stopPropagation(); updateReportMutation.mutate({ id: report.id, status: 'dismissed' }); }}
                                  disabled={updateReportMutation.isPending}>
                                  <XCircle className="w-3 h-3 mr-1" /> Dismiss
                                </Button>
                              </>
                            )}
                            {report.status === 'investigating' && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                onClick={(e) => { e.stopPropagation(); updateReportMutation.mutate({ id: report.id, status: 'resolved' }); }}
                                disabled={updateReportMutation.isPending}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Mark Resolved
                              </Button>
                            )}
                            {report.reporterId && (
                              <Button size="sm" variant="outline" className="h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={(e) => { e.stopPropagation(); setNotifyingReporter(report); setNotifyMessage(`Regarding your report #${report.id}: `); }}>
                                <Send className="w-3 h-3 mr-1" /> Notify Reporter
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ANALYTICS ──────────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Stat summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{(allBookings as any[]).length}</div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Sessions</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{(allBookings as any[]).filter((b: any) => b.status === 'completed').length}</div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400">Completed</div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{(allBookings as any[]).filter((b: any) => b.status === 'cancelled').length}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Cancelled</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{(allBookings as any[]).filter((b: any) => b.status === 'no-show').length}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">No-Shows</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Bookings per day chart */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" /> Bookings — Last 14 Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={bookingsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" className="[&_line]:stroke-border/40" strokeOpacity={0.5} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366F1" name="Bookings" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Session completion rate */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b dark:border-slate-700">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" /> Session Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {bookingStatusData.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 text-sm">No booking data yet</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={bookingStatusData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {bookingStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-1.5">
                        {bookingStatusData.map(d => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                            </div>
                            <span className="font-semibold text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Class enrollment breakdown */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" /> Class Enrollment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {classesList.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-4">No classes yet</p>
                ) : (
                  <div className="space-y-3">
                    {[...classesList].sort((a: any, b: any) => (b.enrolledCount || 0) - (a.enrolledCount || 0)).slice(0, 10).map((cls: any) => {
                      const pct = Math.round(((cls.enrolledCount || 0) / Math.max(1, cls.maxStudents || 10)) * 100);
                      return (
                        <div key={cls.id} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400 w-48 truncate shrink-0">{cls.title}</span>
                          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-16 text-right shrink-0">{cls.enrolledCount || 0}/{cls.maxStudents || 10}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── VOLUNTEERS ──────────────────────────────────────────────────── */}
          <TabsContent value="volunteers" className="space-y-6">
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Volunteer Hours Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {volunteerLeaderboard.length === 0 ? (
                  <div className="py-16 flex flex-col items-center text-center">
                    <HeartHandshake className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No completed sessions yet. Volunteer hours will appear here once sessions are completed.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-700">
                    {volunteerLeaderboard.map((tutor: any, i: number) => (
                      <div key={tutor.id} className="flex items-center gap-4 px-6 py-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          {i + 1}
                        </span>
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={tutor.avatar || ''} />
                          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 text-sm font-semibold">{getInitials(tutor.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{tutor.name}</p>
                          <p className="text-xs text-slate-500">{tutor.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{tutor.hours}h</p>
                          <p className="text-xs text-slate-400">volunteered</p>
                        </div>
                        {i === 0 && <span className="text-xl shrink-0" title="Top Volunteer">🏆</span>}
                        {i === 1 && <span className="text-xl shrink-0" title="2nd Place">🥈</span>}
                        {i === 2 && <span className="text-xl shrink-0" title="3rd Place">🥉</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {Math.round(volunteerLeaderboard.reduce((s: number, t: any) => s + t.hours, 0))}h
                </div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Total Hours Donated</div>
              </div>
              <div className="p-5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{volunteerLeaderboard.length}</div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Active Volunteers</div>
              </div>
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40">
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                  {volunteerLeaderboard.length > 0 ? Math.round(volunteerLeaderboard.reduce((s: number, t: any) => s + t.hours, 0) / volunteerLeaderboard.length * 10) / 10 : 0}h
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">Avg Hours / Tutor</div>
              </div>
            </div>
          </TabsContent>

          {/* ── PEER SESSIONS ───────────────────────────────────────────────── */}
          <TabsContent value="peer-sessions" className="space-y-6">
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  Peer Session Requests
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Review and approve peer-to-peer study sessions requested by students.
                </p>
              </CardHeader>
              <CardContent>
                {(peerSessions as any[]).length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No peer session requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(peerSessions as any[]).map((s: any) => {
                      const statusColors: Record<string, string> = {
                        pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
                        approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        rejected: 'bg-red-100 text-red-700 border-red-200',
                        completed: 'bg-slate-100 text-slate-600 border-slate-200',
                        cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
                      };
                      return (
                        <div key={s.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground">{s.className}</span>
                                <Badge className={`text-[10px] border ${statusColors[s.status] || 'bg-slate-100 text-slate-600'}`}>
                                  {s.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                <span><span className="font-medium">Requester:</span> {s.requesterName}</span>
                                <span><span className="font-medium">Helper:</span> {s.helperName}</span>
                                {(s.proposedDate || s.proposedTime) && (
                                  <span><span className="font-medium">When:</span> {s.proposedDate}{s.proposedTime && ` at ${s.proposedTime}`}</span>
                                )}
                                <span className="text-[11px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                              </div>
                              {s.coordinatorNotes && (
                                <p className="text-xs text-slate-500 italic mt-1">Notes: {s.coordinatorNotes}</p>
                              )}
                            </div>
                            {s.status === 'pending_approval' && (
                              <div className="flex gap-2 shrink-0">
                                <PeerSessionAction sessionId={s.id} action="approve" onDone={refetchPeerSessions} />
                                <PeerSessionAction sessionId={s.id} action="reject" onDone={refetchPeerSessions} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMMUNICATIONS ──────────────────────────────────────────────── */}
          <TabsContent value="communications" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Send notification CTA */}
              <Card className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/10 shadow-sm">
                <CardContent className="p-6 flex flex-col items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                    <Bell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Broadcast Notification</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Send a platform-wide notification to all students, tutors, or a specific group.</p>
                  </div>
                  <Link href="/send-notification">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Megaphone className="w-4 h-4 mr-2" /> Send Notification
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Export data CTA */}
              <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6 flex flex-col items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Download className="w-7 h-7 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Export Data (CSV)</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Download user data for GDPR compliance, reporting, or offline analysis.</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { handleExport(students, 'students'); toast({ title: 'Students CSV exported.' }); }}>
                      <GraduationCap className="w-4 h-4 mr-1.5" /> Students
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(teachers, 'tutors'); toast({ title: 'Tutors CSV exported.' }); }}>
                      <BookOpen className="w-4 h-4 mr-1.5" /> Tutors
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(classesList, 'classes'); toast({ title: 'Classes CSV exported.' }); }}>
                      <BookOpen className="w-4 h-4 mr-1.5" /> Classes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(allBookings as any[], 'bookings'); toast({ title: 'Bookings CSV exported.' }); }}>
                      <CalendarClock className="w-4 h-4 mr-1.5" /> Bookings
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(reports as any[], 'reports'); toast({ title: 'Reports CSV exported.' }); }}>
                      <AlertTriangle className="w-4 h-4 mr-1.5" /> Reports
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(allQuizzes as any[], 'quizzes'); toast({ title: 'Quizzes CSV exported.' }); }}>
                      <FileText className="w-4 h-4 mr-1.5" /> Quizzes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { handleExport(contactSubmissions as any[], 'contact_submissions'); toast({ title: 'Contact submissions CSV exported.' }); }}>
                      <MessageSquare className="w-4 h-4 mr-1.5" /> Contacts
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Or use server-side export: <a href="/api/admin/export/users" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">users</a> · <a href="/api/admin/export/classes" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">classes</a> · <a href="/api/admin/export/bookings" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">bookings</a> · <a href="/api/admin/export/reports" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">reports</a></p>
                </CardContent>
              </Card>
            </div>

            {/* Recent notifications log */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" /> Recent Platform Notifications ({(adminNotifications as any[]).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(adminNotifications as any[]).length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No notifications found</p>
                ) : (
                  <div className="divide-y dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                    {(adminNotifications as any[]).map((notif: any) => (
                      <div key={notif.id} className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{notif.message}</p>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                          <Badge variant="secondary" className="text-xs mr-2">{notif.type}</Badge>
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact form submissions */}
            <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" /> Contact Form Submissions ({(contactSubmissions as any[]).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(contactSubmissions as any[]).length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No contact submissions found</p>
                ) : (
                  <div className="divide-y dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                    {(contactSubmissions as any[]).map((sub: any) => (
                      <div key={sub.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{sub.name}</span>
                            <span className="text-xs text-slate-500">&lt;{sub.email}&gt;</span>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">{sub.subject}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{sub.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {selectedReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedReport(null)}>
              <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
                  <h2 className="text-xl font-bold text-foreground">Report Detail</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
                    <Select
                      value={selectedReport.status}
                      onValueChange={(value) => {
                        updateReportMutation.mutate({ id: selectedReport.id, status: value });
                        setSelectedReport({ ...selectedReport, status: value });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Type:</span>
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                      {selectedReport.reportType?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Description:</span>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedReport.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Reporter:</span>
                      <p className="text-sm text-foreground">{selectedReport.reporterName || (selectedReport.reporterId ? `#${selectedReport.reporterId}` : 'Anonymous')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Target:</span>
                      <p className="text-sm text-foreground">{selectedReport.targetType} {selectedReport.targetId ? `#${selectedReport.targetId}` : ''}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Reported:</span>
                    <p className="text-sm text-foreground">{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Admin Notes:</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add admin notes about this report..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={updateReportMutation.isPending}
                      onClick={() => {
                        updateReportMutation.mutate({ id: selectedReport.id, status: selectedReport.status, adminNotes });
                        setSelectedReport(null);
                      }}>Save</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedUser(null)}>
              <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
                  <h2 className="text-xl font-bold text-foreground">User Profile</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUser.avatar || ''} />
                      <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-lg font-semibold">
                        {getInitials(selectedUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selectedUser.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                      <Badge className="mt-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-400">User ID:</span>
                      <p className="text-foreground">{selectedUser.id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-400">Joined:</span>
                      <p className="text-foreground">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-400">Orphanage:</span>
                      <p className="text-foreground">{selectedUser.orphanage || '—'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-400">Organization:</span>
                      <p className="text-foreground">{selectedUser.organization || '—'}</p>
                    </div>
                  </div>
                  {selectedUser.bio && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Bio:</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedUser.bio}</p>
                    </div>
                  )}
                  {selectedUser.skillsTaught && selectedUser.skillsTaught.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Skills Taught:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.skillsTaught.map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.skillsLearning && selectedUser.skillsLearning.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Skills Learning:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.skillsLearning.map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-slate-700">
                    <Link href={`/profile/${selectedUser.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" /> View Profile
                      </Button>
                    </Link>
                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setSelectedUser(null); navigate('/messages'); }}>
                      <MessageSquare className="w-4 h-4 mr-2" /> Message
                    </Button>
                    <Button
                      variant={selectedUser.isBlocked ? 'outline' : 'destructive'}
                      className="flex-1"
                      onClick={() => { blockMutation.mutate(selectedUser.id); setSelectedUser(null); }}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {selectedUser.isBlocked ? 'Unblock' : 'Block'} User
                    </Button>
                    <Button variant="outline" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => { verifyMutation.mutate(selectedUser.id); setSelectedUser(null); }}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      {selectedUser.isVerified ? 'Revoke Verification' : 'Verify User'}
                    </Button>
                    {selectedUser.role !== 'coordinator' && (
                      <Button variant="outline" className="w-full text-violet-600 border-violet-200 hover:bg-violet-50"
                        onClick={() => { setChangingRoleUser(selectedUser); setNewRole(selectedUser.role); setSelectedUser(null); }}>
                        <UserCog className="w-4 h-4 mr-2" /> Change Role
                      </Button>
                    )}
                    {selectedUser.role !== 'coordinator' && (
                      <Button variant="outline" className="w-full text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => { setDeletingUser(selectedUser); setSelectedUser(null); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Tabs>

        {/* Change Role Modal */}
        {changingRoleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setChangingRoleUser(null)}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-violet-500" /> Change Role
                </h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setChangingRoleUser(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Change role for <strong className="text-foreground">{changingRoleUser.name}</strong> (currently: <Badge variant="secondary">{changingRoleUser.role}</Badge>)
                </p>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue placeholder="Select new role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={!newRole || newRole === changingRoleUser.role || changeRoleMutation.isPending}
                    onClick={() => changeRoleMutation.mutate({ userId: changingRoleUser.id, role: newRole })}>
                    {changeRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Change Role
                  </Button>
                  <Button variant="outline" onClick={() => setChangingRoleUser(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeletingUser(null)}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
                <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Delete Account
                </h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setDeletingUser(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">⚠ This action is irreversible</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    Permanently delete <strong>{deletingUser.name}</strong>'s account and all associated data. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="destructive" className="flex-1"
                    disabled={deleteUserMutation.isPending}
                    onClick={() => deleteUserMutation.mutate(deletingUser.id)}>
                    {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Permanently
                  </Button>
                  <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notify Reporter Modal */}
        {notifyingReporter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNotifyingReporter(null)}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-500" /> Notify Reporter
                </h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setNotifyingReporter(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Send an update to <strong className="text-foreground">{notifyingReporter.reporterName || `Reporter #${notifyingReporter.reporterId}`}</strong> about their report.
                </p>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Message</label>
                  <Textarea
                    value={notifyMessage}
                    onChange={e => setNotifyMessage(e.target.value)}
                    rows={4}
                    placeholder="e.g. We have reviewed your report and have taken appropriate action..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!notifyMessage.trim() || notifyReporterMutation.isPending}
                    onClick={() => notifyReporterMutation.mutate({ receiverId: notifyingReporter.reporterId, content: notifyMessage })}>
                    {notifyReporterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Message
                  </Button>
                  <Button variant="outline" onClick={() => setNotifyingReporter(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flag Quiz Modal */}
        {flaggingQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFlaggingQuiz(null)}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
                <h3 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Flag Quiz
                </h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setFlaggingQuiz(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Flag <strong className="text-foreground">"{flaggingQuiz.title}"</strong> as inappropriate content. This will add it to the reports queue for review.
                </p>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={flagContentMutation.isPending}
                    onClick={() => flagContentMutation.mutate({ targetType: 'quiz', targetId: flaggingQuiz.id, description: `Quiz "${flaggingQuiz.title}" flagged for content review by coordinator.` })}>
                    {flagContentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                    Flag for Review
                  </Button>
                  <Button variant="outline" onClick={() => setFlaggingQuiz(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Tutor Modal */}
        {rejectingTutor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectingTutor(null)}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border/40 dark:border-border/40" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                <h3 className="text-base font-semibold text-foreground">Reject Tutor Application</h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setRejectingTutor(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are rejecting the application from <span className="font-semibold text-foreground">{rejectingTutor.name}</span>.
                  The tutor will be notified by email.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">
                    Reason <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="e.g. Incomplete profile information, unverifiable credentials..."
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" className="flex-1" onClick={() => setRejectingTutor(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={rejectTutorMutation.isPending}
                  onClick={() => rejectTutorMutation.mutate({ userId: rejectingTutor.id, reason: rejectReason })}
                >
                  {rejectTutorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject Application'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* #89: Bulk block/unblock confirmation dialog */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-base capitalize">{confirmBulk.action} {confirmBulk.ids.length} user{confirmBulk.ids.length !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-muted-foreground">
              {confirmBulk.action === 'block'
                ? 'Blocked users will not be able to log in until unblocked.'
                : 'These users will regain access to the platform.'}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmBulk(null)}>Cancel</Button>
              <Button
                size="sm"
                variant={confirmBulk.action === 'block' ? 'destructive' : 'default'}
                onClick={() => { bulkBlockMutation.mutate(confirmBulk.ids); setConfirmBulk(null); }}
              >
                Confirm {confirmBulk.action}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
