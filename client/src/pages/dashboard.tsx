import { useEffect } from "react";
import { useAuth } from"@/lib/auth";
import { useQuery, useMutation } from"@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Link, useLocation } from"wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from"@/components/ui/tabs";
import { Input } from"@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from"@/components/ui/select";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { useToast } from"@/hooks/use-toast";
import { queryClient } from"@/lib/queryClient";
import type { User } from"@shared/schema";
import { motion } from"framer-motion";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  Star,
  Plus,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Shield,
  BarChart3,
  Loader2,
  Zap,
  MessageSquare,
  CheckCircle,
  Bookmark,
  ClipboardList,
  Search,
  AlertTriangle,
  Trash2,
  UserCheck,
  Ban,
  Eye,
  Sparkles,
  Target,
  Lightbulb,
  Camera,
  Award,
  Download,
} from"lucide-react";
import { authFetch } from"@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from"recharts";
import { useEffect, useRef, useState } from"react";
import { SmartRecommendations } from"@/components/smart-recommendations";
import { SkillGapDetector } from"@/components/skill-gap-detector";
import { AILessonPlanner } from"@/components/ai-lesson-planner";
import { AIStudyBuddy } from"@/components/ai-study-buddy";

// Dashboard stats interfaces for type safety
interface CourseProgressItem { classId: number; title: string; progress: number; }
interface ReviewItem { id: number; rating: number; comment: string; reviewerName: string; }

interface StudentStats {
  classCount?: number;
  totalHours?: number;
  completedCount?: number;
  avgRating?: number;
  completionRate?: number;
  courseProgress?: CourseProgressItem[];
}

interface TutorStats {
  totalStudents?: number;
  classCount?: number;
  avgRating?: number;
  totalHours?: number;
  recentReviews?: ReviewItem[];
}

interface CoordinatorStats {
  totalUsers?: number;
  totalClasses?: number;
  totalBookings?: number;
  pendingReports?: number;
  recentActivity?: unknown[];
  totalStudents?: number;
  totalTutors?: number;
  totalCoordinators?: number;
  popularClasses?: Array<{ id: number; title: string; enrolledCount: number; tutorName: string; avgRating: number; }>;
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function AnimatedCounter({ value, suffix ="" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const numVal = typeof value ==="string" ? parseFloat(value) || 0 : value;

  useEffect(() => {
    let start = 0;
    const end = numVal;
    if (end === 0) { setDisplay(0); return; }
    const duration = 800;
    const stepTime = 16;
    const steps = Math.ceil(duration / stepTime);
    const increment = end / steps;
    let current = start;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      setDisplay(current);
    }, stepTime);
    return () => clearInterval(timer);
  }, [numVal]);

  const formatted = Number.isInteger(numVal)
    ? Math.round(display).toString()
    : display.toFixed(1);

  return <span ref={ref}>{formatted}{suffix}</span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const numVal = typeof value ==="string" ? parseFloat(value) || 0 : value;
  const isDecimal = typeof value ==="string" && value.includes(".");

  return (
    <Card className="card-hover-lift">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br ${color} shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-2xl font-semibold font-display"
              data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g,"-")}`}
            >
              <AnimatedCounter value={numVal} suffix={isDecimal ?"" :""} />
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingRow({ booking }: { booking: any }) {
  const statusColors: Record<string, string> = {
    pending:"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    confirmed:"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    completed:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    cancelled:"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div
      className="flex items-center justify-between gap-3 py-3 border-b last:border-0"
      data-testid={`booking-row-${booking.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{booking.classTitle ||"Class"}</p>
        <p className="text-xs text-muted-foreground">
          {booking.scheduledDate
            ? new Date(booking.scheduledDate).toLocaleDateString()
            :"TBD"}{""}
          {booking.scheduledTime && `at ${booking.scheduledTime}`}
        </p>
      </div>
      <Badge
        variant="outline"
        className={`text-xs shrink-0 ${statusColors[booking.status] ||""}`}
      >
        {booking.status}
      </Badge>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20" data-testid="loading-dashboard">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function WelcomeHeader({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <motion.div variants={fadeIn}>
      <div className="rounded-md bg-gradient-to-r from-[#667EEA] to-[#764BA2] p-6 md:p-8">
        <h1
          className="text-2xl md:text-3xl font-display font-bold text-white"
          data-testid="text-welcome"
        >
          Welcome back, {name}!
        </h1>
        <p className="text-white/80 mt-1 text-sm" data-testid="text-welcome-subtitle">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

function CircularProgress({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-purple-600 transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{percentage}%</span>
      </div>
    </div>
  );
}

function getAchievements(stats: StudentStats) {
  return [
    { id: 1, name: 'First Course', icon: '🎓', unlocked: (stats?.completedCount || 0) >= 1, description: 'Completed your first course' },
    { id: 2, name: '5 Courses', icon: '🔥', unlocked: (stats?.completedCount || 0) >= 5, description: 'Completed 5 courses' },
    { id: 3, name: 'Early Bird', icon: '🌅', unlocked: false, description: 'Study before 8 AM' },
    { id: 4, name: 'Night Owl', icon: '🦉', unlocked: false, description: 'Study after 10 PM' },
  ];
}

interface StudentDashboardProps { user: User; stats: StudentStats; bookings: unknown[]; bookingsLoading: boolean; }
function StudentDashboard({ user, stats, bookings: allBookings, bookingsLoading }: StudentDashboardProps) {
  const { toast } = useToast();
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [learningPathLoading, setLearningPathLoading] = useState(false);
  const [learningPathError, setLearningPathError] = useState<string | null>(null);

  const handleGenerateLearningPath = async () => {
    setLearningPathLoading(true);
    setLearningPathError(null);
    try {
      const data = await authFetch("/api/ai/learning-path", { method: "POST" });
      setLearningPath(data);
    } catch (err: any) {
      setLearningPathError(err.message || "Failed to generate learning path.");
    } finally {
      setLearningPathLoading(false);
    }
  };

  const courseProgress = stats?.courseProgress || [];
  const upcomingBookings = (allBookings || []).slice(0, 3);

  const { data: allClasses } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: () => authFetch("/api/classes"),
  });

  const recommendedCourses = (allClasses || [])
    .filter((c: any) => !courseProgress.some((cp: any) => cp.classId === c.id))
    .slice(0, 4);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <WelcomeHeader
        name={user.name?.split(" ")[0] ||"Student"}
        subtitle="Here's what's happening today"
      />

      <motion.div variants={fadeIn} className="flex flex-wrap gap-2" data-testid="quick-actions-student">
        <Link href="/classes">
          <Button variant="outline" size="sm" data-testid="button-browse-classes">
            <BookOpen className="w-4 h-4" /> Browse Classes
          </Button>
        </Link>
        <Link href="/my-classes">
          <Button variant="outline" size="sm" data-testid="button-my-classes">
            <GraduationCap className="w-4 h-4" /> My Classes
          </Button>
        </Link>
        <Link href="/bookings">
          <Button variant="outline" size="sm" data-testid="button-bookings">
            <Bookmark className="w-4 h-4" /> My Bookings
          </Button>
        </Link>
        <Link href="/messages">
          <Button variant="outline" size="sm" data-testid="button-messages">
            <MessageSquare className="w-4 h-4" /> Messages
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid-student">
        <StatCard
          icon={BookOpen}
          label="Classes Enrolled"
          value={stats?.classCount || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={Clock}
          label="Hours Learned"
          value={stats?.totalHours || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={CheckCircle}
          label="Courses Completed"
          value={stats?.completedCount || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={stats?.avgRating?.toFixed(1) ||"0.0"}
          color="from-[#667EEA] to-[#764BA2]"
        />
      </motion.div>

      <motion.div variants={fadeIn}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <CircularProgress percentage={stats?.completionRate || Math.min(Math.round(((stats?.completedCount || 0) / Math.max(stats?.classCount || 1, 1)) * 100), 100)} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Your Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {getAchievements(stats).map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    whileHover={{ scale: 1.05 }}
                    className={`p-3 rounded-xl text-center transition-all ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700'
                        : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-1">{achievement.icon}</div>
                    <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">{achievement.name}</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{achievement.description}</div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#667EEA]" /> AI Study Buddy
              <Badge variant="outline" className="text-[10px]">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-48 overflow-y-auto space-y-3 p-3 rounded-md bg-muted/30" data-testid="ai-chat-area">
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-md p-3 text-sm max-w-[85%]">
                  <p>Hi! I'm your AI study buddy. Ask me anything about your courses, and I'll help explain concepts, quiz you, or suggest study strategies.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Explain Python loops","Quiz me on algebra","Study tips for science"].map((chip) => (
                <button
                  key={chip}
                  className="text-xs px-3 py-1.5 rounded-full border text-muted-foreground hover-elevate"
                  onClick={() => setShowStudyBuddy(true)}
                  data-testid={`chip-${chip.toLowerCase().replace(/\s+/g,"-")}`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <Button
              className="w-full neon-btn bg-primary"
              onClick={() => setShowStudyBuddy(true)}
              data-testid="button-send-study"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Launch AI Study Buddy
            </Button>
            <p className="text-[10px] text-muted-foreground/60 text-center">Powered by AI &middot; Responses are monitored for safety</p>
          </CardContent>
        </Card>
        {showStudyBuddy && (
          <AIStudyBuddy onClose={() => setShowStudyBuddy(false)} />
        )}
      </motion.div>

      {courseProgress.length > 0 && (
        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Continue Learning
              </CardTitle>
              <Link href="/my-classes">
                <Button variant="ghost" size="sm" data-testid="button-view-all-courses">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2" data-testid="continue-learning-scroll">
                {courseProgress.slice(0, 6).map((course: any, idx: number) => (
                  <div
                    key={course.classId || idx}
                    className="min-w-[220px] max-w-[260px] p-4 border rounded-md space-y-2 shrink-0"
                    data-testid={`course-progress-${course.classId || idx}`}
                  >
                    <p className="font-medium text-sm truncate">
                      {course.title ||"Untitled Course"}
                    </p>
                    <div className="w-full bg-muted rounded-md h-2">
                      <div
                        className="h-2 rounded-md bg-gradient-to-r from-[#667EEA] to-[#764BA2]"
                        style={{
                          width: `${Math.min(course.progress || 0, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {course.progress || 0}% complete
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming Sessions
              </CardTitle>
              <Link href="/bookings">
                <Button variant="ghost" size="sm" data-testid="button-view-all-bookings">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div data-testid="upcoming-sessions-list">
                  {upcomingBookings.map((b: any) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-upcoming-sessions">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  <Link href="/classes">
                    <Button variant="outline" size="sm" className="mt-3" data-testid="button-browse-empty">
                      Browse Classes
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Recommended For You
                  <Badge variant="outline" className="text-[10px]">AI-Powered</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Based on your enrolled courses and learning patterns</p>
              </div>
              <Link href="/classes">
                <Button variant="ghost" size="sm" data-testid="button-view-all-recommended">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recommendedCourses.length > 0 ? (
                <div className="space-y-3" data-testid="recommended-courses-list">
                  {recommendedCourses.map((cls: any) => (
                    <Link key={cls.id} href={`/classes/${cls.id}`}>
                      <div
                        className="flex items-center justify-between gap-3 py-2 border-b last:border-0 hover-elevate rounded-md px-2"
                        data-testid={`recommended-course-${cls.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{cls.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {cls.category} &middot; {cls.skillLevel ||"All levels"}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-recommendations">
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recommendations yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeIn}>
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Target className="w-4 h-4 text-[#4FACFE]" /> Learning Path
              <Badge variant="outline" className="text-[10px]">AI</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.skillsLearning && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(Array.isArray(user.skillsLearning) ? user.skillsLearning : []).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                ))}
              </div>
            )}
            {learningPath?.suggestions ? (
              <>
                {learningPath.summary && (
                  <p className="text-xs text-muted-foreground">{learningPath.summary}</p>
                )}
                <div className="space-y-2">
                  {learningPath.suggestions.map((rec: any, idx: number) => {
                    const icons = [BarChart3, BookOpen, Sparkles];
                    const RecIcon = icons[idx % icons.length];
                    return (
                      <Link key={idx} href={`/classes?search=${encodeURIComponent(rec.category || rec.suggestion)}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-md hover-elevate" data-testid={`skillgap-${(rec.suggestion || "").toLowerCase().replace(/\s+/g,"-")}`}>
                          <RecIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">{rec.text}</p>
                            <p className="text-sm font-medium">{rec.suggestion}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Get AI-powered suggestions based on your enrolled courses and learning goals.</p>
            )}
            {learningPathError && (
              <p className="text-sm text-destructive text-center">{learningPathError}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full neon-btn"
              onClick={handleGenerateLearningPath}
              disabled={learningPathLoading}
              data-testid="button-generate-path"
            >
              {learningPathLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating Path...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1" /> {learningPath ? "Refresh Path" : "Generate My Learning Path"}</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground/60">Powered by AI &middot; Personalized to your skills and courses</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recommendations" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> AI Recommendations
            </TabsTrigger>
            <TabsTrigger value="skill-gap" className="text-xs">
              <Target className="w-3 h-3 mr-1" /> Skill Gap Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="mt-4">
            <SmartRecommendations userId={user?.id} />
          </TabsContent>

          <TabsContent value="skill-gap" className="mt-4">
            <SkillGapDetector />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

interface TutorDashboardProps { user: User; stats: TutorStats; bookings: unknown[]; bookingsLoading: boolean; }
function TutorDashboard({ user, stats, bookings: allBookings, bookingsLoading }: TutorDashboardProps) {
  const { toast } = useToast();
  const [profileTips, setProfileTips] = useState<any>(null);
  const [profileTipsLoading, setProfileTipsLoading] = useState(false);
  const [profileTipsError, setProfileTipsError] = useState<string | null>(null);

  const handleRefreshProfileTips = async () => {
    setProfileTipsLoading(true);
    setProfileTipsError(null);
    try {
      const data = await authFetch("/api/ai/profile-tips", { method: "POST" });
      setProfileTips(data);
    } catch (err: any) {
      setProfileTipsError(err.message || "Failed to get tips. Please try again.");
    } finally {
      setProfileTipsLoading(false);
    }
  };

  const recentReviews = stats?.recentReviews || [];

  const { data: tutorClasses, isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: () => authFetch("/api/classes"),
    select: (data: any[]) => data.filter((c: any) => c.tutorId === user.id),
  });

  const upcomingBookings = (allBookings || []).slice(0, 5);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <WelcomeHeader
        name={user.name?.split(" ")[0] ||"Tutor"}
        subtitle="Here's what's happening today"
      />

      <motion.div variants={fadeIn} className="flex flex-wrap gap-2" data-testid="quick-actions-tutor">
        <Link href="/classes/create">
          <Button size="sm" className="neon-btn" data-testid="button-create-class">
            <Plus className="w-4 h-4" /> Create Class
          </Button>
        </Link>
        <Link href="/my-classes">
          <Button variant="outline" size="sm" data-testid="button-my-classes">
            <BookOpen className="w-4 h-4" /> My Classes
          </Button>
        </Link>
        <Link href="/bookings">
          <Button variant="outline" size="sm" data-testid="button-bookings">
            <ClipboardList className="w-4 h-4" /> Manage Bookings
          </Button>
        </Link>
        <Link href="/messages">
          <Button variant="outline" size="sm" data-testid="button-messages">
            <MessageSquare className="w-4 h-4" /> Messages
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid-tutor">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={BookOpen}
          label="Classes Created"
          value={stats?.classCount || 0}
          color="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={stats?.avgRating?.toFixed(1) ||"0.0"}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={Clock}
          label="Hours Taught"
          value={stats?.totalHours || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
      </motion.div>

      <motion.div variants={fadeIn}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Student Engagement Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  { day: 'Mon', engagement: 45 },
                  { day: 'Tue', engagement: 62 },
                  { day: 'Wed', engagement: 58 },
                  { day: 'Thu', engagement: 75 },
                  { day: 'Fri', engagement: 82 },
                  { day: 'Sat', engagement: 68 },
                  { day: 'Sun', engagement: 55 },
                ]}>
                  <defs>
                    <linearGradient id="engagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#engagement)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-600 to-pink-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/classes/create">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Class
                </Button>
              </Link>
              <Link href="/messages">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0" size="lg">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Students
                </Button>
              </Link>
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0" size="lg"
                onClick={() => toast({ title:"Export feature coming soon!" })}>
                <Download className="w-4 h-4 mr-2" />
                Export Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F093FB]" /> AI Profile Optimizer
              <Badge variant="outline" className="text-[10px]">AI</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileTips?.tips ? (
              <>
                {profileTips.overallScore !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                    <div className="text-2xl font-bold text-primary">{profileTips.overallScore}%</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Profile Score</p>
                      <p className="text-xs text-muted-foreground">{profileTips.summary || "Keep improving your profile to attract more students."}</p>
                    </div>
                  </div>
                )}
                {profileTips.tips.map((item: any, idx: number) => {
                  const iconMap: Record<string, typeof Lightbulb> = { lightbulb: Lightbulb, camera: Camera, book: BookOpen, star: Star, target: Target };
                  const TipIcon = iconMap[item.icon] || Lightbulb;
                  const priorityColor = item.priority === "High Priority" ? "text-red-400" : item.priority === "Medium" ? "text-amber-400" : "text-blue-400";
                  return (
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-md" data-testid={`tip-${(item.tip || "").toLowerCase().replace(/\s+/g,"-")}`}>
                      <TipIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.tip}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColor}`}>{item.priority}</Badge>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Click below to get personalized AI tips for improving your profile.
              </p>
            )}
            {profileTipsError && (
              <p className="text-sm text-destructive text-center">{profileTipsError}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full neon-btn"
              onClick={handleRefreshProfileTips}
              disabled={profileTipsLoading}
              data-testid="button-refresh-tips"
            >
              {profileTipsLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Analyzing Profile...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1" /> {profileTips ? "Refresh Tips" : "Analyze My Profile"}</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground/60 text-center">Powered by AI &middot; Tips based on your actual profile data</p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeIn} className="lg:col-span-2 space-y-6">
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Today's Schedule
              </CardTitle>
              <Link href="/bookings">
                <Button variant="ghost" size="sm" data-testid="button-view-schedule">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div data-testid="todays-schedule-list">
                  {upcomingBookings.map((b: any) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-schedule">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions scheduled today</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> My Classes
              </CardTitle>
              <Link href="/my-classes">
                <Button variant="ghost" size="sm" data-testid="button-view-courses">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (tutorClasses || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="tutor-classes-grid">
                  {(tutorClasses || []).slice(0, 6).map((cls: any) => (
                    <Link key={cls.id} href={`/classes/${cls.id}`}>
                      <div
                        className="p-3 border rounded-md hover-elevate space-y-1"
                        data-testid={`course-row-${cls.id}`}
                      >
                        <p className="font-medium text-sm truncate">{cls.title}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {cls.enrolledCount || 0} students
                          </p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {cls.status ||"active"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-classes">
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No classes created yet</p>
                  <Link href="/classes/create">
                    <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first">
                      Create Your First Class
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Star className="w-4 h-4" /> Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentReviews.length > 0 ? (
                <div className="space-y-4" data-testid="recent-reviews-list">
                  {recentReviews.slice(0, 4).map((review: any, idx: number) => (
                    <div
                      key={review.id || idx}
                      className="space-y-1 pb-3 border-b last:border-0"
                      data-testid={`review-${review.id || idx}`}
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (review.rating || 0)
                                ?"text-yellow-500 fill-yellow-500"
                                :"text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm line-clamp-2">
                        {review.comment ||"No comment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {review.reviewerName ||"Student"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="no-reviews">
                  No reviews yet
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeIn}>
        <Tabs defaultValue="lesson-planner" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lesson-planner" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> AI Lesson Planner
            </TabsTrigger>
            <TabsTrigger value="teaching-assistant" className="text-xs">
              <GraduationCap className="w-3 h-3 mr-1" /> AI Teaching Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lesson-planner" className="mt-4">
            <AILessonPlanner />
          </TabsContent>

          <TabsContent value="teaching-assistant" className="mt-4">
            <Card className="border-2">
              <CardContent className="p-6 text-center space-y-4">
                <GraduationCap className="w-12 h-12 mx-auto text-primary" />
                <h3 className="font-semibold text-lg">AI Teaching Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Get real-time teaching advice, generate quiz questions, and receive engagement strategies.
                </p>
                <Button
                  className="neon-btn bg-primary"
                  onClick={() => window.location.href = "/teacher-dashboard"}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

    </motion.div>
  );
}

const mockEnrollmentData = [
  { month:"Jan", enrollments: 12 },
  { month:"Feb", enrollments: 19 },
  { month:"Mar", enrollments: 25 },
  { month:"Apr", enrollments: 32 },
  { month:"May", enrollments: 28 },
  { month:"Jun", enrollments: 45 },
];

interface CoordinatorDashboardProps { user: User; stats: CoordinatorStats; }
function CoordinatorDashboard({ user, stats }: CoordinatorDashboardProps) {
  const { data: reports } = useQuery({
    queryKey: ["/api/admin/reports"],
    queryFn: () => authFetch("/api/admin/reports"),
  });

  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");

  const { data: adminUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => authFetch("/api/admin/users"),
  });

  const { data: adminClasses, isLoading: classesLoading } = useQuery({
    queryKey: ["/api/admin/classes"],
    queryFn: () => authFetch("/api/admin/classes"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => authFetch(`/api/admin/users/${id}/verify`, { method:"PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title:"User verification updated" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (id: number) => authFetch(`/api/admin/users/${id}/block`, { method:"PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title:"User block status updated" });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: number) => authFetch(`/api/admin/classes/${id}`, { method:"DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      toast({ title:"Class removed successfully" });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      authFetch(`/api/admin/reports/${id}`, {
        method:"PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title:"Report status updated" });
    },
  });

  const filteredUsers = (adminUsers || []).filter((u: any) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const usersByRole = [
    { role:"Students", count: stats?.totalStudents || 0 },
    { role:"Tutors", count: stats?.totalTutors || 0 },
    { role:"Coordinators", count: stats?.totalCoordinators || 1 },
  ];

  const pendingReports = (reports || []).filter((r: any) => r.status ==="pending" || !r.status);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <WelcomeHeader
        name={user.name?.split(" ")[0] ||"Coordinator"}
        subtitle="Here's what's happening today"
      />

      <motion.div variants={fadeIn} className="flex flex-wrap gap-2" data-testid="quick-actions-coordinator">
        <Link href="/safeguarding">
          <Button size="sm" data-testid="button-admin-panel">
            <Shield className="w-4 h-4" /> Admin Panel
          </Button>
        </Link>
        <Link href="/classes">
          <Button variant="outline" size="sm" data-testid="button-browse-classes">
            <BookOpen className="w-4 h-4" /> All Classes
          </Button>
        </Link>
        <Link href="/messages">
          <Button variant="outline" size="sm" data-testid="button-messages">
            <MessageSquare className="w-4 h-4" /> Messages
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid-coordinator">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={BookOpen}
          label="Active Classes"
          value={stats?.totalClasses || 0}
          color="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={stats?.totalBookings || 0}
          color="from-[#667EEA] to-[#764BA2]"
        />
        <StatCard
          icon={Shield}
          label="Reports Pending"
          value={pendingReports.length}
          color="from-red-500 to-rose-500"
        />
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div data-testid="chart-users-by-role">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Users by Role</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usersByRole}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#667EEA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div data-testid="chart-enrollments-over-time">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Enrollments Over Time</p>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={mockEnrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="enrollments"
                      stroke="#764BA2"
                      strokeWidth={2}
                      dot={{ fill:"#764BA2", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Shield className="w-4 h-4" /> Recent Reports
              </CardTitle>
              <Link href="/safeguarding">
                <Button variant="ghost" size="sm" data-testid="button-view-all-reports">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(reports || []).length > 0 ? (
                <div className="space-y-3" data-testid="recent-reports-list">
                  {(reports || []).slice(0, 5).map((report: any, idx: number) => (
                    <div
                      key={report.id || idx}
                      className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                      data-testid={`report-row-${report.id || idx}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{report.reportType}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {report.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${
                          report.status ==="resolved"
                            ?"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            :"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}
                      >
                        {report.status ||"pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-reports">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reports submitted</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.popularClasses || []).length > 0 ? (
                <div className="space-y-3" data-testid="pending-reviews-list">
                  {(stats?.popularClasses || []).slice(0, 5).map((cls: any, idx: number) => (
                    <div
                      key={cls.id || idx}
                      className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                      data-testid={`pending-review-${cls.id || idx}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{cls.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.enrolledCount || 0} enrolled &middot;{""}
                          {cls.tutorName ||"Unknown tutor"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">
                          {cls.avgRating?.toFixed(1) ||"N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="no-pending-reviews">
                  No reviews to display
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeIn}>
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList>
                <TabsTrigger value="users" data-testid="tab-admin-users">User Management</TabsTrigger>
                <TabsTrigger value="classes" data-testid="tab-admin-classes">Class Moderation</TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-admin-reports">Safeguarding Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-users"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Total: {(adminUsers || []).length} users</p>
                </div>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`admin-user-${u.id}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs">{(u.name ||"U")[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                          {u.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {u.isBlocked && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyMutation.mutate(u.id)}
                            disabled={verifyMutation.isPending}
                            data-testid={`button-verify-${u.id}`}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> {u.isVerified ?"Unverify" :"Verify"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => blockMutation.mutate(u.id)}
                            disabled={blockMutation.isPending}
                            className={u.isBlocked ?"text-green-500" :"text-red-500"}
                            data-testid={`button-block-${u.id}`}
                          >
                            <Ban className="w-3.5 h-3.5" /> {u.isBlocked ?"Unblock" :"Block"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="classes" className="space-y-4">
                {classesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(adminClasses || []).map((cls: any) => (
                      <div key={cls.id} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`admin-class-${cls.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{cls.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">{cls.tutorName ||"Unknown"}</p>
                            <Badge variant="outline" className="text-xs">{cls.category}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{cls.courseType}</Badge>
                            <span className="text-xs text-muted-foreground">{cls.enrolledCount || 0} enrolled</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 shrink-0"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to remove this class?")) {
                              deleteClassMutation.mutate(cls.id);
                            }
                          }}
                          disabled={deleteClassMutation.isPending}
                          data-testid={`button-delete-class-${cls.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {(reports || []).map((report: any) => (
                    <div key={report.id} className="flex items-start justify-between gap-3 p-3 border rounded-md" data-testid={`admin-report-${report.id}`}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{report.reporterName ||"Anonymous"}</p>
                          <Badge variant="outline" className="text-xs capitalize">{report.reportType?.replace("_","")}</Badge>
                          <Badge variant="outline" className={`text-xs ${
                            report.status ==="resolved" ?"bg-green-500/10 text-green-400" :
                            report.status ==="investigating" ?"bg-blue-500/10 text-blue-400" :
                            report.status ==="dismissed" ?"bg-gray-500/10 text-gray-400" :
"bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {report.status ||"pending"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Target: {report.targetType} #{report.targetId ||"N/A"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                        <p className="text-xs text-muted-foreground">{report.createdAt ? new Date(report.createdAt).toLocaleDateString() :""}</p>
                      </div>
                      <Select
                        value={report.status ||"pending"}
                        onValueChange={(val) => updateReportMutation.mutate({ id: report.id, status: val })}
                      >
                        <SelectTrigger className="w-32 shrink-0" data-testid={`select-report-status-${report.id}`}>
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
                  ))}
                  {(reports || []).length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No reports submitted</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect each role to their specific dashboard immediately
  useEffect(() => {
    if (!user) return;
    if (user.role === "student") { setLocation("/student-dashboard"); return; }
    if (user.role === "tutor") { setLocation("/teacher-dashboard"); return; }
    if (user.role === "coordinator") { setLocation("/admin"); return; }
  }, [user, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => authFetch("/api/dashboard/stats"),
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: () => authFetch("/api/bookings"),
    enabled: user?.role !=="coordinator",
  });

  if (!user) return null;

  if (statsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <LoadingState />
      </div>
    );
  }

  const dashboardLink = user.role ==="coordinator"
    ?"/admin"
    : user.role ==="tutor"
    ?"/teacher-dashboard"
    :"/student-dashboard";

  const dashboardLabel = user.role ==="coordinator"
    ?"Admin Dashboard"
    : user.role ==="tutor"
    ?"Teacher Dashboard"
    :"Student Dashboard";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8" data-testid="dashboard-container">
      <Card className="mb-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Enhanced {dashboardLabel} Available!</h3>
              <p className="text-white/80">Access your complete dashboard with all features and tools</p>
            </div>
            <Link href={dashboardLink}>
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-white/90">
                Go to Full Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {user.role ==="coordinator" ? (
        <CoordinatorDashboard user={user} stats={stats} />
      ) : user.role ==="tutor" ? (
        <TutorDashboard
          user={user}
          stats={stats}
          bookings={upcomingBookings}
          bookingsLoading={bookingsLoading}
        />
      ) : (
        <StudentDashboard
          user={user}
          stats={stats}
          bookings={upcomingBookings}
          bookingsLoading={bookingsLoading}
        />
      )}
    </div>
  );
}
