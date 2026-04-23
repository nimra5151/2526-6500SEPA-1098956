import { useState } from"react";
import { useLocation } from"wouter";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { queryClient } from"@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Label } from"@/components/ui/label";
import { Badge } from"@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { useToast } from"@/hooks/use-toast";
import { motion } from"framer-motion";
import { BookOpen, Loader2, ArrowLeft, GraduationCap, Clock, Users, Image, Calendar, Globe, Layers, Shield } from"lucide-react";

const categories = [
"Programming & Tech",
"Mathematics",
"Life Skills",
"Languages",
"Science",
"Creative Arts",
"Career & Business",
];

const courseTypes = [
  { value:"on-demand", label:"On-Demand" },
  { value:"live", label:"Live" },
  { value:"upcoming", label:"Upcoming" },
  { value:"recorded", label:"Recorded" },
];

const languages = ["English","French","Spanish","Swahili","Arabic"];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function CreateClass() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{
    title: string; description: string; category: string; courseType: string;
    skillLevel: string; duration: string; maxStudents: string; language: string;
    scheduleDate: string; scheduleTime: string; totalLectures: string; thumbnailUrl: string;
  }>({
    title:"",
    description:"",
    category:"",
    courseType:"live",
    skillLevel:"beginner",
    duration:"60",
    maxStudents:"10",
    language:"English",
    scheduleDate:"",
    scheduleTime:"",
    totalLectures:"1",
    thumbnailUrl:"",
  });

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showScheduleFields = form.courseType ==="live" || form.courseType ==="upcoming";
  const showLectureCount = form.courseType ==="on-demand";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!form.description) { toast({ title: "Description is required", variant: "destructive" }); return; }
    if (!form.category) { toast({ title: "Please select a category", variant: "destructive" }); return; }
    if (parseInt(form.duration) < 1) { toast({ title: "Duration must be at least 1 minute", variant: "destructive" }); return; }
    if (parseInt(form.maxStudents) < 1) { toast({ title: "Max students must be at least 1", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const result = await authFetch("/api/classes", {
        method:"POST",
        body: JSON.stringify({
          tutorId: user!.id,
          title: form.title,
          description: form.description,
          category: form.category,
          courseType: form.courseType,
          skillLevel: form.skillLevel,
          duration: parseInt(form.duration),
          maxStudents: parseInt(form.maxStudents),
          language: form.language,
          scheduleDate: form.scheduleDate ? new Date(form.scheduleDate).toISOString() : null,
          scheduleTime: form.scheduleTime || null,
          totalLectures: parseInt(form.totalLectures) || 1,
          thumbnailUrl: form.thumbnailUrl || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title:"Class created successfully!" });
      setLocation(`/classes/${result.id}`);
    } catch (err: Error | unknown) {
      toast({ title: (err as Error).message ||"Failed to create class", variant:"destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !=="tutor") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold font-display" data-testid="text-tutors-only">Tutors Only</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Only verified tutors can create classes on TutorBridge. Sign up as a tutor to get started.
          </p>
          <Button onClick={() => setLocation("/signup")} data-testid="button-signup-tutor">
            Become a Tutor
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
          <motion.div variants={fadeUp} className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/my-classes")}
              className="mb-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Classes
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-create-title">
                  <span className="text-primary">Create a New Class</span>
                </h1>
                <p className="text-sm text-muted-foreground">Design your course and start teaching</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="border border-slate-200 dark:border-slate-800 rounded-md">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2 flex-wrap">
                    <Layers className="w-5 h-5 text-primary" />
                    Class Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 p-4 rounded-md bg-muted/30 border mb-6" data-testid="content-moderation-notice">
                    <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Content Safety</p>
                      <p className="text-xs text-muted-foreground">All class content is automatically reviewed by our AI safety system to ensure a safe learning environment for all students.</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-create-class">
                    <motion.div variants={fadeUp} className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Class Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g., Introduction to Python Programming"
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        data-testid="input-title"
                      />
                    </motion.div>

                    <motion.div variants={fadeUp} className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what students will learn, prerequisites, and course outcomes..."
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="resize-none min-h-[120px]"
                        data-testid="input-description"
                      />
                    </motion.div>

                    <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Course Type</Label>
                        <Select value={form.courseType} onValueChange={(v) => updateField("courseType", v)}>
                          <SelectTrigger data-testid="select-course-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {courseTypes.map((ct) => (
                              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Skill Level</Label>
                        <Select value={form.skillLevel} onValueChange={(v) => updateField("skillLevel", v)}>
                          <SelectTrigger data-testid="select-level">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1 flex-wrap">
                          <Globe className="w-3.5 h-3.5" /> Language
                        </Label>
                        <Select value={form.language} onValueChange={(v) => updateField("language", v)}>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-1 flex-wrap">
                          <Clock className="w-3.5 h-3.5" /> Duration (minutes)
                        </Label>
                        <Input
                          id="duration"
                          type="number"
                          min="15"
                          max="300"
                          value={form.duration}
                          onChange={(e) => updateField("duration", e.target.value)}
                          data-testid="input-duration"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxStudents" className="text-sm font-medium flex items-center gap-1 flex-wrap">
                          <Users className="w-3.5 h-3.5" /> Max Students
                        </Label>
                        <Input
                          id="maxStudents"
                          type="number"
                          min="1"
                          max="100"
                          value={form.maxStudents}
                          onChange={(e) => updateField("maxStudents", e.target.value)}
                          data-testid="input-max-students"
                        />
                      </div>
                    </motion.div>

                    {showScheduleFields && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height:"auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="scheduleDate" className="text-sm font-medium flex items-center gap-1 flex-wrap">
                            <Calendar className="w-3.5 h-3.5" /> Schedule Date
                          </Label>
                          <Input
                            id="scheduleDate"
                            type="date"
                            value={form.scheduleDate}
                            onChange={(e) => updateField("scheduleDate", e.target.value)}
                            data-testid="input-date"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="scheduleTime" className="text-sm font-medium">
                            Schedule Time
                          </Label>
                          <Input
                            id="scheduleTime"
                            type="time"
                            value={form.scheduleTime}
                            onChange={(e) => updateField("scheduleTime", e.target.value)}
                            data-testid="input-time"
                          />
                        </div>
                      </motion.div>
                    )}

                    {showLectureCount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height:"auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="totalLectures" className="text-sm font-medium flex items-center gap-1 flex-wrap">
                          <Layers className="w-3.5 h-3.5" /> Total Lectures
                        </Label>
                        <Input
                          id="totalLectures"
                          type="number"
                          min="1"
                          max="100"
                          value={form.totalLectures}
                          onChange={(e) => updateField("totalLectures", e.target.value)}
                          data-testid="input-total-lectures"
                        />
                      </motion.div>
                    )}

                    <motion.div variants={fadeUp} className="space-y-2">
                      <Label htmlFor="thumbnailUrl" className="text-sm font-medium flex items-center gap-1 flex-wrap">
                        <Image className="w-3.5 h-3.5" /> Thumbnail URL
                        <Badge variant="secondary" className="text-xs no-default-active-elevate">Optional</Badge>
                      </Label>
                      <Input
                        id="thumbnailUrl"
                        placeholder="https://example.com/image.jpg"
                        value={form.thumbnailUrl}
                        onChange={(e) => updateField("thumbnailUrl", e.target.value)}
                        data-testid="input-thumbnail"
                      />
                      {form.thumbnailUrl && (() => {
                        try { new URL(form.thumbnailUrl); return null; } catch { return <p className="text-xs text-destructive mt-1">Please enter a valid URL (starting with https://)</p>; }
                      })()}
                      {form.thumbnailUrl && (() => { try { new URL(form.thumbnailUrl); return <img src={form.thumbnailUrl} alt="Thumbnail preview" loading="lazy" className="mt-2 w-full max-h-32 object-cover rounded-md border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />; } catch { return null; } })()}
                    </motion.div>

                    <motion.div variants={fadeUp} className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-primary border-0 text-white"
                        disabled={loading}
                        data-testid="button-create"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating Class...
                          </>
                        ) : (
                          <>
                            <GraduationCap className="w-4 h-4" />
                            Create Class
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
