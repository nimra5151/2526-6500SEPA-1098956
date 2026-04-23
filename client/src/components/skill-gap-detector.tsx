import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/api";
import { Link } from "wouter";

interface SkillData {
  name: string;
  level: number;
  target: number;
  gap: number;
  status: "strong" | "developing" | "needs-focus";
}

interface SkillGapResult {
  skills: SkillData[];
  studyPlan: string;
}

export function SkillGapDetector({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch("/api/ai/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: user?.skillsLearning || [] }),
      }) as SkillGapResult;
      setResult(data);
    } catch (err: Error | unknown) {
      setError((err as Error).message || "Failed to analyze skills. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "strong": return "text-green-500 bg-green-500/10 border-green-500/30";
      case "developing": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      case "needs-focus": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      default: return "text-muted-foreground bg-muted/10 border-muted/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "strong": return CheckCircle;
      case "developing": return TrendingUp;
      case "needs-focus": return AlertCircle;
      default: return Target;
    }
  };

  const skills = result?.skills || [];

  return (
    <Card className="border-2 bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span>Skill Gap Analysis</span>
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          AI analyzes your learning goals and identifies areas where focused study can help you reach your targets.
          {user?.skillsLearning?.length ? (
            <span className="block mt-1 text-primary font-medium">
              Skills to analyze: {user.skillsLearning.slice(0, 4).join(", ")}
              {user.skillsLearning.length > 4 ? ` +${user.skillsLearning.length - 4} more` : ""}
            </span>
          ) : (
            <span className="block mt-1 text-orange-500">
              No learning skills set on your profile.{" "}
              <Link href="/settings" className="underline hover:text-orange-400">
                Add skills in Settings
              </Link>{" "}
              to get personalized analysis.
            </span>
          )}
        </p>

        {!result && (
          <Button
            className="w-full neon-btn bg-primary"
            onClick={handleAnalyze}
            disabled={isLoading || !user?.skillsLearning?.length}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Skills...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze My Skill Gaps
              </>
            )}
          </Button>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {skills.length > 0 && (
          <>
            <div className="space-y-4">
              {skills.map((skill, index) => {
                const StatusIcon = getStatusIcon(skill.status);
                return (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="card-hover-lift border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">{skill.name}</h4>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(skill.status)}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {skill.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">{skill.level}%</div>
                              <div className="text-xs text-muted-foreground">Target: {skill.target}%</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Current Level</span>
                                <span className="font-medium">{skill.level}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-primary to-purple-600"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${skill.level}%` }}
                                  transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Gap to Target</span>
                                <span className="font-medium text-orange-500">{skill.gap}% to close</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(skill.gap, 100)}%` }}
                                  transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                                />
                              </div>
                            </div>
                          </div>

                          {skill.gap > 20 && (
                            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                              <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground flex-1">
                                Recommended: Find a course on "{skill.name}"
                              </p>
                              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { onClose?.(); setLocation(`/classes?search=${encodeURIComponent(skill.name)}`); }}>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Card className="border bg-primary/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {skills.filter((s) => s.status === "strong").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Strong</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">
                      {skills.filter((s) => s.status === "developing").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Developing</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">
                      {skills.filter((s) => s.status === "needs-focus").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Need Focus</div>
                  </div>
                </div>
                {result?.studyPlan && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{result.studyPlan}</p>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Re-analyze Skills</>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
