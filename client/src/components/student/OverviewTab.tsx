import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EmptyState, ListItemSkeleton } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { authFetch } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Calendar, Award, Play, CheckCircle, Flame, Trophy,
  ChevronRight, Target, TrendingUp, AlertCircle, Medal, MessageCircle,
  Eye, Sparkles, Star, Zap,
} from 'lucide-react';

interface Badge {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  desc: string;
  earned: boolean;
  color: string;
}

interface OverviewTabProps {
  enrolledClasses: any[];
  classesLoading: boolean;
  upcomingBookings: any[];
  completedBookings: any[];
  deadlines: any[];
  deadlinesLoading: boolean;
  deadlinesError: boolean;
  certificates: any[];
  badges: Badge[];
  recommendedClasses: any[];
  progressMap: Record<number, any>;
  getCompletionPct: (cls: any) => number;
  sessionsThisWeek: number;
  goalPerWeek: number;
  setGoalPerWeek: (v: number) => void;
  editingGoal: boolean;
  setEditingGoal: (v: boolean) => void;
  totalHours: number;
  studyStreak: number;
  enrolledCount: number;
  passedQuizzes: any[];
  recentlyViewedClasses: any[];
  setActiveTab: (v: string) => void;
}

export function OverviewTab({
  enrolledClasses,
  classesLoading,
  upcomingBookings,
  completedBookings,
  deadlines,
  deadlinesLoading,
  deadlinesError,
  certificates,
  badges,
  recommendedClasses,
  progressMap,
  getCompletionPct,
  sessionsThisWeek,
  goalPerWeek,
  setGoalPerWeek,
  editingGoal,
  setEditingGoal,
  totalHours,
  studyStreak,
  enrolledCount,
  passedQuizzes,
  recentlyViewedClasses,
  setActiveTab,
}: OverviewTabProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
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
                        <img src={rc.thumbnailUrl} alt={rc.title} width={320} height={180} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-indigo-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-indigo-600 transition-colors">{rc.title}</p>
                    {rc.tutorName && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{rc.tutorName}</p>}
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
          {enrolledClasses.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No courses yet" description="Enrol in classes to build your learning path." action={{ label: 'Browse Classes', href: '/classes' }} />
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-4">
                {enrolledClasses.map((cls: any, i: number) => {
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
          ) : enrolledClasses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Browse and enrol in classes to start learning." action={{ label: 'Browse Classes', href: '/classes' }} />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {enrolledClasses.slice(0, 5).map((cls: any) => {
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
            ) : deadlines.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                No deadlines in the next 14 days
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deadlines.slice(0, 4).map((d: any) => {
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
              { label: 'Certificates Earned', value: certificates.length },
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
                    {cls.tutorName && <p className="text-xs text-slate-400 mb-2 truncate">by {cls.tutorName}</p>}
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
      {certificates.length > 0 && (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> My Certificates
              <Badge className="bg-emerald-100 text-emerald-700">{certificates.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert: any) => (
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
    </div>
  );
}
