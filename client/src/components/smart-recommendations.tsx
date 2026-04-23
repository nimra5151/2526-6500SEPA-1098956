import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  BookOpen,
} from"lucide-react";
import { Link } from"wouter";

interface RecommendedCourse {
  id: number;
  title: string;
  category: string;
  matchScore: number;
  reason: string;
  duration: number;
  level: string;
}

interface SmartRecommendationsProps {
  userId?: number;
}

export function SmartRecommendations({ userId }: SmartRecommendationsProps) {
  const { user } = useAuth();
  const { data: classesData = [], isLoading } = useQuery({
    queryKey: ["classes", "recommended"],
    queryFn: () => authFetch("/api/classes?sort=rating&limit=6"),
  });

  const userSkills = (user?.skillsLearning || []).map((s) => s.toLowerCase());

  // #115: stable deterministic score seeded by classId — no Math.random()
  const deterministicJitter = (id: number, range: number) => id % range;

  const getMatchScore = (cls: any): number => {
    const category = (cls.category || "").toLowerCase();
    const title = (cls.title || "").toLowerCase();
    const hasDirectMatch = userSkills.some(
      (s) => category.includes(s) || s.includes(category) || title.includes(s)
    );
    if (hasDirectMatch) return Math.min(98, 88 + deterministicJitter(cls.id, 10));
    return Math.max(55, 62 + deterministicJitter(cls.id, 18));
  };

  const getMatchReason = (cls: any): string => {
    const category = (cls.category || "").toLowerCase();
    const matched = userSkills.find(
      (s) => category.includes(s) || s.includes(category)
    );
    if (matched) return `Matches your interest in ${matched}`;
    if (cls.skillLevel === "beginner") return "Great starting point for beginners";
    if (cls.skillLevel === "intermediate") return "Build on your existing knowledge";
    return "Challenge yourself with advanced content";
  };

  const recommendations: RecommendedCourse[] = Array.isArray(classesData)
    ? classesData.slice(0, 3).map((cls: any) => ({
        id: cls.id,
        title: cls.title,
        category: cls.category,
        matchScore: getMatchScore(cls),
        reason: getMatchReason(cls),
        duration: cls.duration || 60,
        level: cls.skillLevel || "beginner",
      }))
    : [];

  const enrolledTitles = user?.skillsLearning?.slice(0, 2) || ["Getting Started"];
  const nextTitles = recommendations.slice(0, 2).map((c) => c.title);
  const learningPath = [
    { stage: "Current", courses: enrolledTitles, status: "in-progress" },
    { stage: "Recommended", courses: nextTitles.length ? nextTitles : ["Explore available classes"], status: "recommended" },
    { stage: "Future", courses: ["Advanced Topics", "Real-world Projects"], status: "upcoming" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-2 overflow-hidden bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10" />
        <CardHeader className="relative bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>Smart Recommendations</span>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Personalized
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <p className="text-sm text-muted-foreground">
            Based on your learning history, skills, and goals, we've curated these courses for you
          </p>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-muted-foreground">No classes available yet</p>
              </div>
            ) : null}
            {recommendations.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="card-hover-lift border overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-muted/20"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={`url(#gradient-${course.id})`}
                            strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${
                              2 * Math.PI * 28 * (1 - course.matchScore / 100)
                            }`}
                            className="transition-all duration-1000"
                          />
                          <defs>
                            <linearGradient id={`gradient-${course.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#667EEA" />
                              <stop offset="100%" stopColor="#764BA2" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold">{course.matchScore}%</span>
                          <span className="text-[8px] text-muted-foreground">match</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                          {course.title}
                        </h4>
                        <Badge variant="outline" className="text-xs mb-2">
                          {course.category}
                        </Badge>
                        <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1">
                          <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                          {course.reason}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {course.duration} min
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {course.level}
                          </Badge>
                        </div>
                      </div>

                      <Link href={`/classes/${course.id}`}>
                        <Button size="sm" variant="ghost" className="shrink-0">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Link href="/classes">
            <Button className="w-full neon-btn bg-primary" size="sm">
              View All Recommendations
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-primary" />
            <span>Your Learning Path</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6">
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-primary/20" />

            {learningPath.map((stage, index) => (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="relative flex gap-4"
              >
                <div
                  className={`relative w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${
                    stage.status ==="in-progress"
                      ?"bg-primary"
                      : stage.status ==="recommended"
                      ?"border-2 border-primary/50"
                      :"border-2 border-muted"
                  }`}
                >
                  {stage.status ==="in-progress" && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <span className="relative text-sm font-bold">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm">{stage.stage}</h4>
                    {stage.status ==="in-progress" && (
                      <Badge variant="secondary" className="text-xs">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          In Progress
                        </motion.div>
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {stage.courses.map((course, i) => (
                      <div
                        key={i}
                        className="text-xs text-muted-foreground flex items-center gap-2"
                      >
                        {stage.status ==="in-progress" ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                        )}
                        <span>{course}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
