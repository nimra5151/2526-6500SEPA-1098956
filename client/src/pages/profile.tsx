import { useQuery } from"@tanstack/react-query";
import { useRoute, Link } from"wouter";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from"@/components/ui/skeleton";
import { motion } from"framer-motion";
import {
  Star,
  BookOpen,
  Clock,
  GraduationCap,
  MessageSquare,
  Calendar,
  Users,
  ArrowLeft,
  Shield,
  Settings,
  Sparkles,
  Award,
  Eye,
} from"lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" data-testid="loading-profile">
      <Skeleton className="h-64 w-full rounded-md" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function Profile() {
  const [, params] = useRoute("/profile/:id");
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/users", params?.id],
    queryFn: () => authFetch(`/api/users/${params?.id}`),
    enabled: !!params?.id,
  });

  const { data: userClasses } = useQuery({
    queryKey: ["/api/classes/user", params?.id],
    queryFn: () => authFetch(`/api/classes/user/${params?.id}`),
    enabled: !!params?.id,
  });

  const { data: userReviews } = useQuery({
    queryKey: ["/api/reviews/user", params?.id],
    queryFn: () => authFetch(`/api/reviews/user/${params?.id}`),
    enabled: !!params?.id,
  });

  if (isLoading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="rounded-md p-10 max-w-md mx-auto">
          <Users className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold font-display mb-2" data-testid="text-user-not-found">User not found</h2>
          <p className="text-sm text-muted-foreground mb-5">This profile doesn't exist or has been removed.</p>
          <Link href="/">
            <Button variant="outline" data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    :"U";

  const isOwn = currentUser?.id === profile.id;
  const isTutor = profile.role ==="tutor";
  const classCount = userClasses?.length || 0;
  const reviewCount = userReviews?.length || 0;
  const rating = Number(profile.rating || 0);

  const roleConfig: Record<string, { gradient: string; label: string }> = {
    student: { gradient:"from-[#667EEA] to-[#764BA2]", label:"Student" },
    tutor: { gradient:"from-[#667EEA] to-[#764BA2]", label:"Tutor" },
    coordinator: { gradient:"from-[#667EEA] to-[#764BA2]", label:"Coordinator" },
  };

  const role = roleConfig[profile.role] || roleConfig.student;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
        <motion.div variants={fadeIn}>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={fadeIn}>
          <div className="relative rounded-md overflow-visible bg-gradient-to-br from-[#667EEA] to-[#764BA2] p-8 md:p-10">
            <div className="absolute inset-0 dot-pattern rounded-md opacity-30" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 md:w-28 md:h-28 border-4 border-white/20 shadow-xl mb-4">
                {(profile as any)?.avatar && <AvatarImage src={(profile as any).avatar} alt={(profile as any).name || ''} />}
                <AvatarFallback className="text-3xl md:text-4xl bg-primary text-white font-display font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl md:text-3xl font-bold text-white font-display" data-testid="text-profile-name">
                {profile.name}
              </h1>

              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <Badge className={`bg-gradient-to-r ${role.gradient} text-white border-0`}>
                  {profile.role ==="coordinator" && <Shield className="w-3 h-3" />}
                  {role.label}
                </Badge>
                {profile.orphanage && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    <GraduationCap className="w-3 h-3" /> {profile.orphanage}
                  </Badge>
                )}
              </div>

              {profile.bio && (
                <p className="text-white/80 mt-3 max-w-lg text-sm leading-relaxed" data-testid="text-profile-bio">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
                {isOwn && (
                  <Link href="/settings">
                    <Button variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm" data-testid="button-edit-profile">
                      <Settings className="w-4 h-4" /> Edit Profile
                    </Button>
                  </Link>
                )}
                {!isOwn && currentUser && (
                  <Link href={`/messages?to=${profile.id}`}>
                    <Button variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm" data-testid="button-message">
                      <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeIn} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(rating) ?"text-amber-400 fill-amber-400" :"text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-2xl font-semibold font-display" data-testid="stat-rating">
                {rating > 0 ? rating.toFixed(1) :"N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </CardContent>
          </Card>
          <Card className="">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center mb-1">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-semibold font-display" data-testid="stat-reviews">
                {profile.totalReviews || reviewCount}
              </p>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center mb-1">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-semibold font-display" data-testid="stat-classes">
                {classCount}
              </p>
              <p className="text-xs text-muted-foreground">{isTutor ?"Classes Taught" :"Classes Taken"}</p>
            </CardContent>
          </Card>
        </motion.div>

        {((profile.skillsTaught?.length || 0) > 0 || (profile.skillsLearning?.length || 0) > 0) && (
          <motion.div variants={fadeIn}>
            <Card className="">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(profile.skillsTaught?.length || 0) > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Teaching</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.skillsTaught.map((s: string, i: number) => (
                        <Badge
                          key={`t-${i}`}
                          className="bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white border-0"
                          data-testid={`badge-skill-taught-${i}`}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(profile.skillsLearning?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Learning</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.skillsLearning.map((s: string, i: number) => (
                        <Badge
                          key={`l-${i}`}
                          className="bg-primary text-white border-0"
                          data-testid={`badge-skill-learning-${i}`}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isTutor && profile.availabilitySchedule && (
          <motion.div variants={fadeIn}>
            <Card className="">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" /> Availability
                  </CardTitle>
                  {isOwn && (
                    <Link href="/settings?tab=availability">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">
                        <Settings className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  try {
                    const schedule = JSON.parse(profile.availabilitySchedule);
                    const entries = Object.entries(schedule).filter(([, v]) => v && (v as { enabled?: boolean }).enabled);
                    if (entries.length === 0) return <p className="text-sm text-muted-foreground">No availability set.</p>;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {entries.map(([day, time]) => (
                          <div key={day} className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2">
                            <span className="text-xs font-medium">{day}</span>
                            <span className="text-xs text-muted-foreground">{(time as any).start} – {(time as any).end}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{profile.availabilitySchedule}</p>;
                  }
                })()}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isTutor && classCount > 0 && (
          <motion.div variants={fadeIn}>
            <Card className="">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" /> Classes by this Tutor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userClasses?.map((cls: any) => (
                  <Link key={cls.id} href={`/classes/${cls.id}`}>
                    <div
                      className="flex items-center justify-between gap-3 py-3 border-b last:border-0 cursor-pointer group"
                      data-testid={`card-tutor-class-${cls.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm group-hover:text-[#667EEA] transition-colors">{cls.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {cls.duration}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {cls.enrolledCount || 0} enrolled
                          </span>
                          <Badge variant="outline" className="text-xs">{cls.category}</Badge>
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeIn}>
          <Card className="">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" /> Reviews ({reviewCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviewCount > 0 ? (
                <div className="space-y-4">
                  {userReviews.map((r: any) => (
                    <div key={r.id} className="py-3 border-b last:border-0" data-testid={`review-${r.id}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary text-white">
                            {(r.reviewerName ||"S")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{r.reviewerName ||"Student"}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < r.rating ?"text-amber-400 fill-amber-400" :"text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No reviews yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} className="text-center text-xs text-muted-foreground pb-4">
          <Calendar className="w-3.5 h-3.5 inline mr-1" />
          Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month:"long", year:"numeric" })}
        </motion.div>
      </motion.div>
    </div>
  );
}
