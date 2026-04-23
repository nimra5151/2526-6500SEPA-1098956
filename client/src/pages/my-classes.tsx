import { useQuery } from"@tanstack/react-query";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { Link, useLocation } from"wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from"@/components/ui/badge";
import { Skeleton } from"@/components/ui/skeleton";
import { Progress } from"@/components/ui/progress";
import { motion } from"framer-motion";
import {
  BookOpen,
  Plus,
  Clock,
  Users,
  Calendar,
  GraduationCap,
  Video,
  Eye,
  Pencil,
  ArrowRight,
  BarChart3,
  Layers,
  Search,
} from "lucide-react";
import { useState, useEffect } from"react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label:"Active" },
  completed: { color:"bg-blue-500/10 text-blue-400 border-blue-500/20", label:"Completed" },
  cancelled: { color:"bg-red-500/10 text-red-400 border-red-500/20", label:"Cancelled" },
  draft: { color:"bg-gray-500/10 text-gray-400 border-gray-500/20", label:"Draft" },
};

const courseTypeConfig: Record<string, { color: string; icon: any }> = {
  live: { color:"bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Video },
  recorded: { color:"bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Layers },
  hybrid: { color:"bg-amber-500/10 text-amber-400 border-amber-500/20", icon: BarChart3 },
};

function TutorClassCard({ cls }: { cls: any }) {
  const status = statusConfig[cls.status] || statusConfig.active;
  const courseType = courseTypeConfig[cls.courseType] || courseTypeConfig.live;
  const CourseIcon = courseType.icon;

  return (
    <Card className="card-hover-lift" data-testid={`card-myclass-${cls.id}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm line-clamp-1" data-testid={`text-class-title-${cls.id}`}>
              {cls.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{cls.description}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={courseType.color}>
              <CourseIcon className="w-3 h-3" /> {cls.courseType ||"Live"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#667EEA]" /> {cls.duration}min
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> {cls.enrolledCount || 0} / {cls.maxStudents || 10}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" /> {cls.category}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/classes/${cls.id}`}>
            <Button variant="outline" size="sm" data-testid={`button-view-${cls.id}`}>
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
          </Link>
          {/* #153: Edit navigates to teacher dashboard, not class-detail (read-only) */}
          <Link href={`/teacher-dashboard?classId=${cls.id}`}>
            <Button variant="outline" size="sm" data-testid={`button-edit-${cls.id}`}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentClassCard({ cls, progress }: { cls: any; progress?: any }) {
  const completedLectures = progress?.completedLectures || 0;
  // #154: avoid division by zero; show 0% when totalLectures not set
  const totalLectures = cls.totalLectures && cls.totalLectures > 0 ? cls.totalLectures : null;
  const progressPercent = totalLectures ? Math.min(Math.round((completedLectures / totalLectures) * 100), 100) : 0;

  return (
    <Card className="card-hover-lift" data-testid={`card-enrolled-${cls.id}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm line-clamp-1" data-testid={`text-enrolled-title-${cls.id}`}>
              {cls.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {cls.tutorName && `by ${cls.tutorName}`}
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
            Enrolled
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#667EEA]" /> {cls.duration}min
          </span>
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" /> {cls.category}
          </span>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium font-display">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedLectures}{totalLectures ? ` of ${totalLectures}` : ''} lectures completed
          </p>
        </div>

        <Link href={`/classes/${cls.id}`}>
          <Button size="sm" className="bg-primary text-white border-0" data-testid={`button-continue-${cls.id}`}>
            Continue Learning <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ClassesSkeleton() {
  return (
    <div className="space-y-4" data-testid="loading-classes">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MyClasses() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"teaching" | "enrolled">(
    user?.role === "tutor" ? "teaching" : "enrolled"
  );

  useEffect(() => {
    if (user?.role === "tutor") {
      setLocation("/teacher-classes");
    }
  }, [user?.role]);
  // #152: search/filter for taught classes
  const [classSearch, setClassSearch] = useState("");

  const { data: taughtClasses, isLoading: taughtLoading } = useQuery({
    queryKey: ["/api/classes/my/teaching"],
    queryFn: () => authFetch("/api/classes/my/teaching"),
    enabled: user?.role ==="tutor",
  });

  const { data: enrolledClasses, isLoading: enrolledLoading } = useQuery({
    queryKey: ["/api/classes/my/enrolled"],
    queryFn: () => authFetch("/api/classes/my/enrolled"),
  });

  const { data: progressData } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: () => authFetch("/api/progress"),
  });

  const isTutor = user?.role ==="tutor";
  const taughtCount = taughtClasses?.length || 0;
  const enrolledCount = enrolledClasses?.length || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
        <motion.div variants={fadeIn}>
          <div className="rounded-md bg-gradient-to-r from-[#667EEA] to-[#764BA2] p-6 md:p-8">
            <div className="relative">
              <div className="absolute inset-0 dot-pattern opacity-30" />
              <div className="relative z-10 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white" data-testid="text-my-classes">
                    My Classes
                  </h1>
                  <p className="text-white/80 mt-1 text-sm">
                    {isTutor
                      ?"Manage your courses and track student enrollment"
                      :"Track your learning progress and enrolled courses"}
                  </p>
                </div>
                {isTutor && (
                  <Link href="/classes/create">
                    <Button
                      variant="outline"
                      className="bg-white/10 text-white border-white/20 backdrop-blur-sm"
                      data-testid="button-create-class"
                    >
                      <Plus className="w-4 h-4" /> Create New Class
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {isTutor && (
          <motion.div variants={fadeIn} className="grid grid-cols-2 gap-4">
            <Card className="">
              <CardContent className="pt-5 pb-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-semibold font-display" data-testid="stat-taught">{taughtCount}</p>
                <p className="text-xs text-muted-foreground">Classes Teaching</p>
              </CardContent>
            </Card>
            <Card className="">
              <CardContent className="pt-5 pb-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-semibold font-display" data-testid="stat-enrolled">{enrolledCount}</p>
                <p className="text-xs text-muted-foreground">Enrolled In</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeIn}>
          <div className="flex items-center gap-2 flex-wrap">
            {isTutor && (
              <Button
                variant={activeTab ==="teaching" ?"default" :"outline"}
                size="sm"
                onClick={() => setActiveTab("teaching")}
                className={activeTab ==="teaching" ?"bg-primary text-white border-0" :""}
                data-testid="tab-teaching"
              >
                <GraduationCap className="w-4 h-4" /> Teaching ({taughtCount})
              </Button>
            )}
            <Button
              variant={activeTab ==="enrolled" ?"default" :"outline"}
              size="sm"
              onClick={() => setActiveTab("enrolled")}
              className={activeTab ==="enrolled" ?"bg-primary text-white border-0" :""}
              data-testid="tab-enrolled"
            >
              <BookOpen className="w-4 h-4" /> Enrolled ({enrolledCount})
            </Button>
          </div>
        </motion.div>

        <motion.div variants={fadeIn}>
          {activeTab === "teaching" && isTutor && (
            <>
              {/* #152: search/filter for taught classes */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Search your classes..."
                  className="pl-9"
                  data-testid="input-class-search"
                />
              </div>
              {taughtLoading ? (
                <ClassesSkeleton />
              ) : taughtCount > 0 ? (
                <div className="space-y-4">
                  {(taughtClasses as any[]).filter((cls: any) =>
                    !classSearch || cls.title?.toLowerCase().includes(classSearch.toLowerCase()) || cls.category?.toLowerCase().includes(classSearch.toLowerCase())
                  ).map((cls: any) => (
                    <TutorClassCard key={cls.id} cls={cls} />
                  ))}
                </div>
              ) : (
                <Card className="">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4 opacity-60">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold font-display mb-1" data-testid="text-no-teaching">
                      No classes yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                      Create your first class and start sharing your knowledge with students.
                    </p>
                    <Link href="/classes/create">
                      <Button className="bg-primary text-white border-0" data-testid="button-create-first-class">
                        <Plus className="w-4 h-4" /> Create Your First Class
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab ==="enrolled" && (
            <>
              {enrolledLoading ? (
                <ClassesSkeleton />
              ) : enrolledCount > 0 ? (
                <div className="space-y-4">
                  {enrolledClasses.map((cls: any) => {
                    const progress = (progressData || []).find(
                      (p: any) => p.classId === cls.id
                    );
                    return (
                      <StudentClassCard key={cls.id} cls={cls} progress={progress} />
                    );
                  })}
                </div>
              ) : (
                <Card className="">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4 opacity-60">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold font-display mb-1" data-testid="text-no-enrolled">
                      No enrolled classes
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                      Browse available classes and start your learning journey today.
                    </p>
                    <Link href="/classes">
                      <Button className="bg-primary text-white border-0" data-testid="button-browse-classes">
                        <BookOpen className="w-4 h-4" /> Browse Classes
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
