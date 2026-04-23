import { useState, useMemo, useEffect } from"react";
import { useQuery, useMutation } from"@tanstack/react-query";
import { useRoute, Link } from"wouter";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { queryClient, ApiError } from"@/lib/queryClient";
import { Card, CardContent, CardHeader } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Skeleton } from"@/components/ui/skeleton";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { useToast } from"@/hooks/use-toast";
import { motion } from"framer-motion";
import {
  Star,
  Users,
  Clock,
  BookOpen,
  Calendar,
  Heart,
  Share2,
  Play,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Globe,
  User,
  MessageSquare,
  Monitor,
  Video,
  Award,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  Sparkles,
  Copy,
  ExternalLink,
  Shield,
  TrendingUp,
  FileText,
  ListPlus,
  ListMinus,
} from "lucide-react";
import { AIStudyBuddy } from"@/components/ai-study-buddy";
import { AutoSummaries } from"@/components/auto-summaries";
import { SkillGapDetector } from"@/components/skill-gap-detector";
import { DiscussionThread } from"@/components/discussion-thread";

// #174: Waitlist join/leave button
function WaitlistButton({ classId }: { classId: number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: waitlistEntry } = useQuery({
    queryKey: ["/api/classes", classId, "waitlist", "me"],
    queryFn: () => authFetch(`/api/classes/${classId}/waitlist`).then((list: any[]) => list),
    staleTime: 30_000,
  });
  const onWaitlist = Array.isArray(waitlistEntry) && waitlistEntry.some((e: any) => e.studentId === user?.id);

  const joinMutation = useMutation({
    mutationFn: () => authFetch(`/api/classes/${classId}/waitlist`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Added to waitlist!" }); queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "waitlist", "me"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  const leaveMutation = useMutation({
    mutationFn: () => authFetch(`/api/classes/${classId}/waitlist`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Removed from waitlist" }); queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "waitlist", "me"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return onWaitlist ? (
    <Button variant="outline" className="bg-white/10 text-white border-white/30" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
      {leaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ListMinus className="w-4 h-4 mr-2" />}
      Leave Waitlist
    </Button>
  ) : (
    <Button variant="outline" className="bg-white/10 text-white border-white/30" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
      {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ListPlus className="w-4 h-4 mr-2" />}
      Join Waitlist
    </Button>
  );
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const categoryGradients: Record<string, string> = {
  Mathematics:"from-[#667EEA] to-[#764BA2]",
  Science:"from-[#11998e] to-[#38ef7d]",
  English:"from-[#ee0979] to-[#ff6a00]",
  Technology:"from-[#0575E6] to-[#021B79]",
  Arts:"from-[#f7971e] to-[#ffd200]",
  Music:"from-[#642B73] to-[#C6426E]",
  Languages:"from-[#00B4DB] to-[#0083B0]",
  History:"from-[#373B44] to-[#4286f4]",
"Life Skills":"from-[#56ab2f] to-[#a8e063]",
"Career & Business":"from-[#c94b4b] to-[#4b134f]",
"Programming & Tech":"from-[#0575E6] to-[#021B79]",
"Creative Arts":"from-[#f7971e] to-[#ffd200]",
  Default:"from-[#667EEA] to-[#764BA2]",
};

const courseTypeConfig: Record<string, { icon: typeof Play; color: string; label: string }> = {
"on-demand": { icon: Play, color:"bg-emerald-500/20 text-emerald-300 border-emerald-400/30", label:"On Demand" },
  live: { icon: Monitor, color:"bg-red-500/20 text-red-300 border-red-400/30", label:"Live" },
  upcoming: { icon: Calendar, color:"bg-blue-500/20 text-blue-300 border-blue-400/30", label:"Upcoming" },
  recorded: { icon: Video, color:"bg-purple-500/20 text-purple-300 border-purple-400/30", label:"Recorded" },
};

const skillLevelStyles: Record<string, string> = {
  beginner:"bg-green-500/20 text-green-300 border-green-400/30",
  intermediate:"bg-blue-500/20 text-blue-300 border-blue-400/30",
  advanced:"bg-purple-500/20 text-purple-300 border-purple-400/30",
};

type TabKey ="overview" |"curriculum" |"tutor" |"reviews" |"discussions";

function RatingStars({ rating, size ="sm" }: { rating: number; size?:"sm" |"md" }) {
  const r = Math.round(Number(rating) || 0);
  const cls = size ==="md" ?"w-4 h-4" :"w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5" data-testid="rating-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < r ?"text-amber-500 fill-amber-500" :"text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function extractLearningPoints(description: string): string[] {
  const sentences = description
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 200);
  if (sentences.length >= 3) return sentences.slice(0, 6);
  return [];
}

function generateLectures(totalLectures: number, duration: number, title: string) {
  const count = totalLectures || 1;
  const perLecture = Math.round(duration / count);
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    title: count === 1 ? title : `Lecture ${i + 1}: ${title} - Part ${i + 1}`,
    duration: perLecture,
  }));
}

function RelatedClasses({ category, currentClassId }: { category: string; currentClassId: number }) {
  const { data: relatedClasses } = useQuery({
    queryKey: [`/api/classes?category=${encodeURIComponent(category)}&limit=4`],
    queryFn: () => authFetch(`/api/classes?category=${encodeURIComponent(category)}&limit=4`),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = (Array.isArray(relatedClasses) ? relatedClasses : []).filter((c: any) => c.id !== currentClassId).slice(0, 3);

  if (filtered.length === 0) return null;

  
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mt-8">
      <h2 className="text-xl font-bold font-display mb-4" data-testid="text-related-classes">You May Also Like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls: any) => (
          <Link key={cls.id} href={`/classes/${cls.id}`}>
            <Card className="card-hover-lift card-3d cursor-pointer overflow-hidden" data-testid={`card-related-${cls.id}`}>
              <div className={`h-32 bg-gradient-to-br ${categoryGradients[cls.category] || "from-[#667EEA] to-[#764BA2]"} relative overflow-hidden`}>
                {cls.thumbnailUrl ? (
                  <img src={cls.thumbnailUrl} alt={cls.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
                  {cls.courseType ||"on-demand"}
                </Badge>
              </div>
              <CardContent className="pt-3 pb-3 space-y-2">
                <p className="font-semibold text-sm line-clamp-2">{cls.title}</p>
                <p className="text-xs text-muted-foreground">{cls.tutorName ||"Tutor"}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.round(parseFloat(cls.tutorRating) || 4) ?"text-amber-500 fill-amber-500" :"text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{cls.enrolledCount || 0} enrolled</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export default function ClassDetail() {
  const [, params] = useRoute("/classes/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSkillGap, setShowSkillGap] = useState(false);

  const { data: cls, isLoading } = useQuery({
    queryKey: ["/api/classes", params?.id],
    queryFn: () => authFetch(`/api/classes/${params?.id}`),
    enabled: !!params?.id,
  });

  // #185: Track recently viewed classes in localStorage (most-recent first, max 8)
  useEffect(() => {
    if (!cls?.id) return;
    try {
      const KEY = "tutorbridge_recently_viewed";
      const raw = localStorage.getItem(KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      const entry = {
        id: cls.id,
        title: cls.title,
        category: cls.category,
        thumbnailUrl: cls.thumbnailUrl,
        tutorName: cls.tutorName,
        viewedAt: Date.now(),
      };
      const filtered = list.filter((c) => c.id !== cls.id);
      filtered.unshift(entry);
      localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 8)));
    } catch {}
  }, [cls?.id, cls?.title, cls?.category, cls?.thumbnailUrl, cls?.tutorName]);

  const { data: reviews } = useQuery({
    queryKey: ["/api/reviews/class", params?.id],
    queryFn: () => authFetch(`/api/reviews/class/${params?.id}`),
    enabled: !!params?.id,
  });

  const { data: classLessons = [] } = useQuery<any[]>({
    queryKey: ["/api/lessons/class", params?.id],
    queryFn: () => authFetch(`/api/lessons?classId=${params?.id}`),
    enabled: !!params?.id && !!cls?.isEnrolled,
    staleTime: 5 * 60 * 1000,
  });

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewHover, setReviewHover] = useState(0);

  const submitReviewMutation = useMutation({
    mutationFn: () =>
      authFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          revieweeId: cls?.tutorId,
          classId: Number(params?.id),
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      }),
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/class", params?.id] });
    },
    onError: (err: any) => toast({ title: "Failed to submit review", description: err.message, variant: "destructive" }),
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: () => authFetch("/api/favorites"),
    enabled: !!user,
  });

  const favoriteClassIds = useMemo(() => {
    if (!Array.isArray(favoritesData)) return new Set<number>();
    return new Set(favoritesData.map((f: any) => f.classId));
  }, [favoritesData]);

  const classIsFavorited = cls ? favoriteClassIds.has(cls.id) : false;

  const bookMutation = useMutation({
    mutationFn: () =>
      authFetch("/api/bookings", {
        method:"POST",
        body: JSON.stringify({
          classId: Number(params?.id),
          tutorId: cls.tutorId,
          scheduledDate: cls.scheduleDate || new Date().toISOString(),
          scheduledTime: cls.scheduleTime ||"10:00",
          duration: cls.duration,
        }),
      }),
    onSuccess: () => {
      toast({ title:"Class booked successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes", params?.id] });
    },
    onError: (err: ApiError) => {
      // #93: distinguish specific enrollment failure reasons
      const msg = (err.message || "").toLowerCase();
      let friendly: string;
      if (msg.includes("already") || msg.includes("duplicate") || msg.includes("enrolled")) {
        friendly = "You are already enrolled in this class.";
      } else if (msg.includes("full") || msg.includes("maximum") || msg.includes("capacity")) {
        friendly = "This class is full. No more spots are available.";
      } else if (msg.includes("not found") || msg.includes("404")) {
        friendly = "This class no longer exists.";
      } else {
        friendly = err.message || "Failed to book class. Please try again.";
      }
      toast({ title: friendly, variant: "destructive" });
    },
  });

  const addFavorite = useMutation({
    mutationFn: (classId: number) =>
      authFetch("/api/favorites", { method:"POST", body: JSON.stringify({ classId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }),
  });

  const removeFavorite = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/favorites/${classId}`, { method:"DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }),
  });

  const handleToggleFavorite = () => {
    if (!cls) return;
    if (classIsFavorited) {
      removeFavorite.mutate(cls.id);
    } else {
      addFavorite.mutate(cls.id);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title:"Link copied to clipboard!" });
    } catch {
      toast({ title:"Failed to copy link", variant:"destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" data-testid="loading-skeleton">
        <div className="w-full h-72 md:h-96">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="w-full lg:w-80">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="not-found-state">
        <div className="text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold font-display" data-testid="text-not-found">Course not found</h2>
          <p className="text-sm text-muted-foreground">The course you're looking for doesn't exist or has been removed.</p>
          <Link href="/classes">
            <Button variant="outline" data-testid="button-browse-classes">
              <ArrowLeft className="w-4 h-4 mr-2" /> Browse Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tutorName = cls.tutorName || cls.tutor?.name ||"Tutor";
  const tutorInitials = tutorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const tutorRating = Number(cls.tutorRating || cls.tutor?.rating) || 0;
  const tutorReviews = cls.tutorTotalReviews || cls.tutor?.totalReviews || 0;
  const tutorBio = cls.tutorBio || cls.tutor?.bio ||"";
  const tutorSkills = cls.tutorSkillsTaught || cls.tutor?.skillsTaught || [];

  const isOwnClass = user?.id === cls.tutorId;
  const isEnrolled = cls.isEnrolled;
  const isFull = (cls.enrolledCount || 0) >= (cls.maxStudents || 10);
  const lectures = generateLectures(cls.totalLectures, cls.duration, cls.title);
  const learningPoints = extractLearningPoints(cls.description ||"");
  const totalDuration = cls.duration || 60;
  const reviewsList = Array.isArray(reviews) ? reviews : [];
  const avgRating = reviewsList.length > 0 ? reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length : 0;
  const enrolledCount = cls.enrolledCount || 0;
  const maxStudents = cls.maxStudents || 10;
  const enrollmentPercent = Math.min(100, Math.round((enrolledCount / maxStudents) * 100));

  const gradientClass = categoryGradients[cls.category] ||"from-[#667EEA] via-[#764BA2] to-[#6B73DB]";
  const typeConfig = courseTypeConfig[cls.courseType] || courseTypeConfig["on-demand"];
  const CourseTypeIcon = typeConfig.icon;

  const tabs: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key:"overview", label:"Overview", icon: BookOpen },
    { key:"curriculum", label:"Curriculum", icon: GraduationCap },
    { key:"tutor", label:"Tutor", icon: User },
    { key:"reviews", label: `Reviews (${reviewsList.length})`, icon: MessageSquare },
    { key:"discussions", label:"Discussions", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen" data-testid="class-detail-page">
      <div className={`relative w-full overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
        {cls.thumbnailUrl && (
          <img
            src={cls.thumbnailUrl}
            alt={cls.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
            data-testid="img-hero-thumbnail"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 md:pt-8 md:pb-14">
          <Link href="/classes">
            <Button
              variant="outline"
              size="sm"
              className="mb-6 bg-black/30 backdrop-blur-sm border-white/20 text-white"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Classes
            </Button>
          </Link>

          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-4 max-w-3xl">
            <motion.div variants={fadeIn} className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/15 text-white backdrop-blur-sm border-white/20 no-default-hover-elevate no-default-active-elevate" data-testid="badge-category">
                {cls.category}
              </Badge>
              <Badge className={`${skillLevelStyles[cls.skillLevel] ||"bg-white/15 text-white"} border no-default-hover-elevate no-default-active-elevate`} data-testid="badge-skill-level">
                {cls.skillLevel}
              </Badge>
              <Badge className={`${typeConfig.color} border no-default-hover-elevate no-default-active-elevate`} data-testid="badge-course-type">
                <CourseTypeIcon className="w-3 h-3 mr-1" />
                {typeConfig.label}
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-white font-display leading-tight"
              data-testid="text-class-title"
            >
              {cls.title}
            </motion.h1>

            <motion.div variants={fadeIn} className="flex items-center gap-4 md:gap-6 text-white/80 text-sm flex-wrap">
              <Link href={`/profile/${cls.tutorId}`}>
                <span className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer" data-testid="link-tutor-hero">
                  <Avatar className="w-7 h-7 border border-white/30">
                    <AvatarFallback className="text-[10px] bg-white/20 text-white">{tutorInitials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{tutorName}</span>
                </span>
              </Link>
              {avgRating > 0 && (
                <span className="flex items-center gap-1" data-testid="text-hero-rating">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-medium text-white">{avgRating.toFixed(1)}</span>
                  <span className="text-white/60">({reviewsList.length})</span>
                </span>
              )}
              <span className="flex items-center gap-1" data-testid="text-hero-enrolled">
                <Users className="w-4 h-4" /> {enrolledCount} enrolled
              </span>
              <span className="flex items-center gap-1" data-testid="text-hero-duration">
                <Clock className="w-4 h-4" /> {totalDuration} min
              </span>
            </motion.div>

            <motion.div variants={fadeIn} className="pt-2 lg:hidden">
              {user && !isOwnClass && (
                isEnrolled ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-green-300" data-testid="text-enrolled-hero">
                      <CheckCircle className="w-5 h-5" /> You're enrolled
                    </div>
                    {(cls.courseType ==="on-demand" || cls.courseType ==="recorded") && (
                      <Link href={`/video/${cls.id}`}>
                        <Button className="bg-white text-gray-900 border-0 font-semibold" data-testid="button-start-learning-hero">
                          <Play className="w-4 h-4 mr-2" /> Start Learning
                        </Button>
                      </Link>
                    )}
                    {cls.courseType ==="live" && cls.zoomMeetingUrl && (
                      <Link href={`/live-class/${cls.id}`}>
                        <Button className="bg-white text-gray-900 border-0 font-semibold" data-testid="button-join-live-hero">
                          <Monitor className="w-4 h-4 mr-2" /> Join Live Class
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : isFull ? (
                  /* #174: class is full — offer waitlist instead */
                  <WaitlistButton classId={cls.id} />
                ) : (
                  <Button
                    className="bg-white text-gray-900 border-0 font-semibold"
                    disabled={bookMutation.isPending}
                    onClick={() => bookMutation.mutate()}
                    data-testid="button-enroll-hero"
                  >
                    {bookMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {cls.courseType === "live" ? "Book Session" : "Enroll Now"}
                  </Button>
                )
              )}
              {!user && (
                <Link href="/login">
                  <Button className="bg-white text-gray-900 border-0 font-semibold" data-testid="button-login-hero">
                    Log in to Enroll
                  </Button>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-6 border-b overflow-x-auto scroll-smooth" data-testid="tabs-container">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ?"text-foreground"
                      :"text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`tab-${tab.key}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#667EEA] to-[#764BA2]"
                    />
                  )}
                </button>
              ))}
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab ==="overview" && (
                <div className="space-y-6" data-testid="tab-content-overview">
                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      <div>
                        <h3 className="font-semibold text-lg font-display mb-3" data-testid="text-about-heading">About This Course</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-description">
                          {cls.description}
                        </div>
                      </div>

                      {learningPoints.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg font-display mb-3" data-testid="text-learn-heading">What You'll Learn</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {learningPoints.map((point, i) => (
                              <div key={i} className="flex items-start gap-2" data-testid={`text-learn-point-${i}`}>
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-muted-foreground">{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="course-info-cards">
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center space-y-1">
                        <Clock className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold" data-testid="text-info-duration">{totalDuration} min</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center space-y-1">
                        <GraduationCap className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Level</p>
                        <p className="text-sm font-semibold capitalize" data-testid="text-info-level">{cls.skillLevel}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center space-y-1">
                        <Globe className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Language</p>
                        <p className="text-sm font-semibold" data-testid="text-info-language">{cls.language ||"English"}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center space-y-1">
                        <Users className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Max Students</p>
                        <p className="text-sm font-semibold" data-testid="text-info-max-students">{maxStudents}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab ==="curriculum" && (
                <div className="space-y-4" data-testid="tab-content-curriculum">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                        <h3 className="font-semibold text-lg font-display" data-testid="text-curriculum-heading">Course Curriculum</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {isEnrolled && (classLessons as any[]).length > 0
                              ? `${(classLessons as any[]).length} lesson${(classLessons as any[]).length !== 1 ? "s" : ""}`
                              : `${lectures.length} lecture${lectures.length !== 1 ? "s" : ""}`}
                          </span>
                          {cls.videoUrl || cls.recordingUrl ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {totalDuration} min total
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {isEnrolled && (classLessons as any[]).length > 0 ? (
                        <div className="space-y-1">
                          {(classLessons as any[]).map((lesson: any, idx: number) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 p-3 rounded-md hover-elevate"
                              data-testid={`lecture-item-${idx + 1}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lesson.title}</p>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{lesson.description}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {(lesson.sections || []).length} section{(lesson.sections || []).length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (cls.totalLectures || 0) > 0 ? (
                        <div className="space-y-1">
                          {lectures.map((lecture) => (
                            <div
                              key={lecture.number}
                              className="flex items-center gap-3 p-3 rounded-md hover-elevate"
                              data-testid={`lecture-item-${lecture.number}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                                {lecture.number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lecture.title}</p>
                              </div>
                              {cls.videoUrl || cls.recordingUrl ? (
                                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                  <Play className="w-3 h-3" /> {lecture.duration} min
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Written
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground" data-testid="text-curriculum-locked">
                            Full course content available after enrollment
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab ==="tutor" && (
                <div className="space-y-4" data-testid="tab-content-tutor">
                  <Card>
                    <CardContent className="pt-6 space-y-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarFallback className="text-xl bg-primary/10 text-primary">{tutorInitials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-lg font-display" data-testid="text-tutor-name">{tutorName}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {tutorRating > 0 && (
                              <span className="flex items-center gap-1" data-testid="text-tutor-rating">
                                <RatingStars rating={tutorRating} />
                                <span className="font-medium text-foreground">{tutorRating.toFixed(1)}</span>
                              </span>
                            )}
                            {tutorReviews > 0 && (
                              <span data-testid="text-tutor-reviews">{tutorReviews} review{tutorReviews !== 1 ?"s" :""}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {tutorBio && (
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-tutor-bio">
                          {tutorBio}
                        </p>
                      )}

                      {tutorSkills && tutorSkills.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Skills Taught</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {tutorSkills.map((skill: string, i: number) => (
                              <Badge key={i} variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-tutor-skill-${i}`}>
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link href={`/profile/${cls.tutorId}`}>
                        <Button variant="outline" size="sm" data-testid="button-view-tutor-profile">
                          View Full Profile <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab ==="discussions" && (
                <div className="space-y-4" data-testid="tab-content-discussions">
                  <DiscussionThread classId={Number(cls.id)} />
                </div>
              )}

              {activeTab ==="reviews" && (
                <div className="space-y-4" data-testid="tab-content-reviews">
                  {isEnrolled && user && (
                    <Card>
                      <CardContent className="pt-6 pb-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Leave a Review</h3>
                        <div className="flex gap-1 mb-3">
                          {[1,2,3,4,5].map((star) => (
                            <button key={star} onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setReviewHover(star)}
                              onMouseLeave={() => setReviewHover(0)}
                              className="transition-transform hover:scale-110">
                              <Star className={`w-6 h-6 ${(reviewHover || reviewRating) >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                            </button>
                          ))}
                          <span className="text-xs text-muted-foreground ml-2 self-center">{reviewRating} star{reviewRating !== 1 ? "s" : ""}</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share what you liked or what could be improved..."
                          className="w-full px-3 py-2 text-sm border rounded-lg min-h-[80px] bg-background text-foreground resize-none mb-3"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{reviewComment.length}/500</span>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={submitReviewMutation.isPending || reviewRating === 0}
                            onClick={() => submitReviewMutation.mutate()}>
                            {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Submit Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {reviewsList.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-center">
                            <p className="text-3xl font-bold font-display" data-testid="text-avg-rating">{avgRating.toFixed(1)}</p>
                            <RatingStars rating={avgRating} size="md" />
                            <p className="text-xs text-muted-foreground mt-1">{reviewsList.length} review{reviewsList.length !== 1 ?"s" :""}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {reviewsList.length > 0 ? (
                    reviewsList.map((review: any) => {
                      const reviewerName = review.reviewer?.name || review.reviewerName ||"Student";
                      const reviewerInitial = reviewerName[0]?.toUpperCase() ||"S";
                      return (
                        <Card key={review.id} data-testid={`card-review-${review.id}`}>
                          <CardContent className="pt-5 pb-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {reviewerInitial}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" data-testid={`text-reviewer-name-${review.id}`}>{reviewerName}</p>
                                <p className="text-xs text-muted-foreground" data-testid={`text-review-date-${review.id}`}>
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" }) :""}
                                </p>
                              </div>
                              <RatingStars rating={review.rating} />
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-review-comment-${review.id}`}>
                                {review.comment}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-12" data-testid="text-no-reviews">
                      <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this course!</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeIn} className="mt-6">
              <Card className="" data-testid="card-ai-summary">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#667EEA]" />
                    <span className="text-base font-display font-semibold">AI Class Summary</span>
                    <Badge variant="outline" className="text-[10px]">AI</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEnrolled ? (
                    <>
                      <div className="space-y-2 p-3 rounded-md bg-muted/30 min-h-[120px]">
                        <p className="text-sm text-muted-foreground">After your class session, AI will generate:</p>
                        <div className="space-y-1.5">
                          {["Key concepts covered","Important takeaways","Practice questions","Suggested next steps"].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm">
                              <Sparkles className="w-3 h-3 text-[#667EEA] shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full neon-btn"
                        disabled
                        data-testid="button-generate-summary"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Generate Summary
                      </Button>
                      <p className="text-[10px] text-muted-foreground/60 text-center">Unlocks once you complete all lectures in this class</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Enroll in this class to unlock AI-generated summaries and study notes</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="w-full lg:w-80 shrink-0 hidden lg:block">
            <div className="lg:sticky lg:top-20 space-y-4" style={{ zIndex: 40 }}>
              <div className="rounded-md border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4" data-testid="sidebar-card">
                <div className="flex items-center justify-between gap-2" data-testid="sidebar-price">
                  {cls.isFree ? (
                    <Badge variant="secondary" className="text-sm no-default-hover-elevate no-default-active-elevate">Free</Badge>
                  ) : (
                    <span className="text-2xl font-bold font-display">{cls.price ? `$${cls.price}` :"Free"}</span>
                  )}
                </div>

                {user && !isOwnClass && (
                  isEnrolled ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 py-1" data-testid="text-already-enrolled">
                        <CheckCircle className="w-5 h-5" /> You're enrolled in this course
                      </div>
                      {(cls.courseType ==="on-demand" || cls.courseType ==="recorded") && (
                        <Link href={`/video/${cls.id}`}>
                          <Button className="w-full bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white border-0" data-testid="button-start-learning">
                            <Play className="w-4 h-4 mr-2" /> Start Learning
                          </Button>
                        </Link>
                      )}
                      {cls.courseType ==="live" && cls.zoomMeetingUrl && (
                        <Link href={`/live-class/${cls.id}`}>
                          <Button className="w-full bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white border-0" data-testid="button-join-live">
                            <Monitor className="w-4 h-4 mr-2" /> Join Live Class
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="w-full neon-btn bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white border-0"
                      disabled={isFull || bookMutation.isPending}
                      onClick={() => bookMutation.mutate()}
                      data-testid="button-enroll"
                    >
                      {bookMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {isFull ?"Class Full" : cls.courseType ==="live" ?"Book Session" :"Enroll Now"}
                    </Button>
                  )
                )}

                {!user && (
                  <Link href="/login">
                    <Button
                      className="w-full bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white border-0"
                      data-testid="button-login-to-enroll"
                    >
                      Log in to Enroll
                    </Button>
                  </Link>
                )}

                {isOwnClass && (
                  <p className="text-center text-sm text-muted-foreground py-2" data-testid="text-own-course">This is your course</p>
                )}

                <div className="space-y-3">
                  <div data-testid="sidebar-enrollment-progress">
                    <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" /> Enrolled
                      </span>
                      <span className="font-medium">{enrolledCount}/{maxStudents}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#667EEA] to-[#764BA2] rounded-full transition-all duration-500"
                        style={{ width: `${enrollmentPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm" data-testid="sidebar-duration">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" /> Duration
                    </span>
                    <span className="font-medium">{totalDuration} min</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm" data-testid="sidebar-lectures">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-4 h-4" /> Lectures
                    </span>
                    <span className="font-medium">{cls.totalLectures || 1}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm" data-testid="sidebar-level">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Award className="w-4 h-4" /> Level
                    </span>
                    <span className="font-medium capitalize">{cls.skillLevel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm" data-testid="sidebar-language">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" /> Language
                    </span>
                    <span className="font-medium">{cls.language ||"English"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm" data-testid="sidebar-type">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CourseTypeIcon className="w-4 h-4" /> Type
                    </span>
                    <span className="font-medium capitalize">{cls.courseType.replace("-","")}</span>
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground" data-testid="content-safety">
                  <Shield className="w-4 h-4 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-xs">Content Verified</p>
                    <p className="text-[10px] text-muted-foreground/70">Reviewed by our AI safety system</p>
                  </div>
                </div>

                {(cls.courseType ==="live" || cls.courseType ==="upcoming") && cls.scheduleDate && (
                  <div className="border-t pt-3 space-y-2" data-testid="sidebar-schedule">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" /> Schedule
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-schedule-date">
                      {new Date(cls.scheduleDate).toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
                    </p>
                    {cls.scheduleTime && (
                      <p className="text-sm text-muted-foreground" data-testid="text-schedule-time">
                        {cls.scheduleTime}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t pt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleShare}
                    data-testid="button-share"
                  >
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${classIsFavorited ?"text-red-500" :""}`}
                      onClick={handleToggleFavorite}
                      data-testid="button-favorite"
                    >
                      <Heart className={`w-4 h-4 mr-1 ${classIsFavorited ?"fill-current" :""}`} />
                      {classIsFavorited ?"Saved" :"Save"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEnrolled && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="space-y-6 mt-8">
            {cls.status ==="completed" ? (
              <AutoSummaries classId={cls.id} classTitle={cls.title} />
            ) : (
              <Card className="border-2">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">AI Summary Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete this class to unlock AI-generated summaries, key points, and practice questions
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      AI Study Buddy
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Get instant answers to your questions about this class
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    24/7 Available
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the floating chat button in the bottom-right corner to start chatting!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <RelatedClasses category={cls.category} currentClassId={cls.id} />
      </div>

      {user && (
        <>
          {!showStudyBuddy && !showSummary && !showSkillGap && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowSkillGap(true)}
                  size="lg"
                  className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-110 transition-transform"
                >
                  <TrendingUp className="w-6 h-6" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowSummary(true)}
                  size="lg"
                  className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:scale-110 transition-transform"
                >
                  <FileText className="w-6 h-6" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowStudyBuddy(true)}
                  size="lg"
                  className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-110 transition-transform"
                >
                  <MessageSquare className="w-6 h-6" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {showStudyBuddy && (
            <AIStudyBuddy
              classTitle={cls.title}
              classId={cls.id}
              onClose={() => setShowStudyBuddy(false)}
            />
          )}

          {showSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="relative">
                  <Button
                    onClick={() => setShowSummary(false)}
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                  <AutoSummaries
                    classTitle={cls.title}
                    classId={cls.id}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {showSkillGap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="relative">
                  <Button
                    onClick={() => setShowSkillGap(false)}
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                  <SkillGapDetector
                    onClose={() => setShowSkillGap(false)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
