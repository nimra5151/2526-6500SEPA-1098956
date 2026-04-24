import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/skeleton-loader';
import { ChartCard } from '@/components/dashboard-ui';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, Calendar, CheckCircle, TrendingUp,
  Zap, ClipboardList,
} from 'lucide-react';

const BADGE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

interface AnalyticsTabProps {
  sessionChartData: { month: string; sessions: number }[];
  quizChartData: { name: string; score: number; pass: number }[];
  subjectChartData: { name: string; value: number }[];
  gradeChartData: { name: string; grade: number; max: number }[];
  myQuizResults: any[];
  passedQuizzes: any[];
  completedBookings: any[];
  mySubmissions: any[];
}

export function AnalyticsTab({
  sessionChartData,
  quizChartData,
  subjectChartData,
  gradeChartData,
  myQuizResults,
  passedQuizzes,
  completedBookings,
  mySubmissions,
}: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Study Sessions per Month */}
      {sessionChartData.length === 0 ? (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <EmptyState icon={TrendingUp} title="No session data yet" description="Complete sessions to see your activity chart." />
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
          { label: 'Avg Quiz Score', value: myQuizResults.length > 0 ? `${Math.round(myQuizResults.reduce((s: number, r: any) => s + (r.score || 0), 0) / myQuizResults.length)}%` : 'N/A', icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
          { label: 'Pass Rate', value: myQuizResults.length > 0 ? `${Math.round((passedQuizzes.length / myQuizResults.length) * 100)}%` : 'N/A', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Sessions Attended', value: completedBookings.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
          { label: 'Pending Reviews', value: mySubmissions.filter((s: any) => s.grade === null || s.grade === undefined).length, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
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
    </div>
  );
}
