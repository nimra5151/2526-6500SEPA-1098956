import { useRef, useCallback, useState, useEffect } from "react";
import { useRoute, Link } from"wouter";
import { useQuery, useMutation } from"@tanstack/react-query";
import { queryClient } from"@/lib/queryClient";
import { authFetch } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Progress } from"@/components/ui/progress";
import { Textarea } from"@/components/ui/textarea";
import { ArrowLeft, Play, BookOpen, Clock, AlertCircle, CheckCircle, FileText, Plus, Trash2, X, Download, WifiOff, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Loader2 } from "lucide-react";
import { saveLesson, getLesson, deleteLesson } from "@/lib/offline-db";
import { useToast } from"@/hooks/use-toast";
import type { Note, Class, CourseProgress } from"@shared/schema";

export default function VideoPlayer() {
  const [, params] = useRoute("/video/:id");
  const classId = params?.id;
  const [match] = useRoute("/video/:id");
  const lectureParam = new URLSearchParams(window.location.search).get("lecture");
  const lectureNumber = Number(lectureParam) || 1;
  const { toast } = useToast();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [slideIndexes, setSlideIndexes] = useState<Record<number, number>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const playStartRef = useRef<number>(0);       // wall-clock ms when current play segment began
  const accumulatedRef = useRef<number>(0);     // total watch seconds accumulated this session
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: cls, isLoading } = useQuery<Class>({
    queryKey: ["class", classId],
    queryFn: () => authFetch(`/api/classes/${classId}`),
    enabled: !!classId,
  });

  const { data: classLessons = [] } = useQuery<any[]>({
    queryKey: ["lessons", classId],
    queryFn: () => authFetch(`/api/lessons?classId=${classId}`),
    enabled: !!classId,
  });

  // Fetch existing progress for this class
  const { data: existingProgress } = useQuery<CourseProgress | null>({
    queryKey: ["progress", classId],
    queryFn: () => authFetch(`/api/progress/${classId}`),
    enabled: !!classId,
  });

  const progressMutation = useMutation({
    mutationFn: (data: { classId: number; lectureNumber: number; completed: boolean; watchTimeSeconds: number }) =>
      authFetch("/api/progress", { method:"POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["progress", classId] });
    },
  });

  // Notes for this class
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data: classNotes = [] } = useQuery<Note[]>({
    queryKey: ["notes", classId],
    queryFn: () => authFetch(`/api/notes?classId=${classId}`),
    enabled: !!classId,
    refetchInterval: 30_000, // #138: poll every 30s for real-time note sync
  });

  // Check if this lesson is already saved offline, and auto-save on first view
  useEffect(() => {
    if (!cls || !classId) return;
    getLesson(Number(classId)).then((saved) => {
      if (saved) setIsSaved(true);
    }).catch(() => {});
    // Auto-save lesson content when viewed (silent, no toast)
    if (navigator.onLine && cls) {
      saveLesson({
        id: Number(classId),
        classId: Number(classId),
        title: (cls as any).title || "Lesson",
        description: (cls as any).description ?? null,
        content: (cls as any).content ?? null,
        sections: (cls as any).sections ?? null,
      }).then(() => setIsSaved(true)).catch(() => {});
    }
  }, [cls, classId]);

  const handleSaveOffline = async () => {
    if (!cls || !classId) return;
    setSavingOffline(true);
    try {
      await saveLesson({
        id: Number(classId),
        classId: Number(classId),
        title: (cls as any).title || "Lesson",
        description: (cls as any).description ?? null,
        content: (cls as any).content ?? null,
        sections: (cls as any).sections ?? null,
      });
      setIsSaved(true);
      toast({ title: "Saved for offline reading!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingOffline(false);
    }
  };

  const handleRemoveOffline = async () => {
    if (!classId) return;
    try {
      await deleteLesson(Number(classId));
      setIsSaved(false);
      toast({ title: "Removed from offline storage" });
    } catch {}
  };

  const addNoteMutation = useMutation({
    mutationFn: () =>
      authFetch("/api/notes", {
        method:"POST",
        body: JSON.stringify({ content: newNoteContent, classId: Number(classId), topic: cls?.title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", classId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNoteContent("");
      setShowNoteInput(false);
      toast({ title:"Note saved!" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) =>
      authFetch(`/api/notes/${noteId}`, { method:"DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", classId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const saveProgress = useCallback(
    (completed: boolean) => {
      if (!classId) return;
      // Include the currently-playing segment (if any) on top of accumulated seconds.
      // This prevents seeking giving false credit — only real play time counts.
      const currentSegment = playStartRef.current > 0
        ? Math.round((Date.now() - playStartRef.current) / 1000)
        : 0;
      const elapsed = accumulatedRef.current + currentSegment;
      const prev = existingProgress?.watchTimeSeconds || 0;
      progressMutation.mutate({
        classId: Number(classId),
        lectureNumber,
        completed,
        watchTimeSeconds: prev + elapsed,
      });
    },
    [classId, existingProgress, progressMutation, lectureNumber]
  );

  const handlePlay = () => {
    playStartRef.current = Date.now();
    // Save progress every 30 seconds while watching
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => saveProgress(false), 30_000);
  };

  const handlePause = () => {
    // Commit elapsed seconds for this play segment before saving
    if (playStartRef.current > 0) {
      accumulatedRef.current += Math.round((Date.now() - playStartRef.current) / 1000);
      playStartRef.current = 0;
    }
    saveProgress(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // #130: prevent seeking ahead to bypass progress tracking
  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    const maxAllowed = (existingProgress?.watchTimeSeconds || 0) + accumulatedRef.current + 10;
    if (video.currentTime > maxAllowed) {
      video.currentTime = Math.max(0, maxAllowed - 5);
    }
  };

  const handleEnded = () => {
    if (playStartRef.current > 0) {
      accumulatedRef.current += Math.round((Date.now() - playStartRef.current) / 1000);
      playStartRef.current = 0;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    saveProgress(true);
    toast({ title:"Course completed!", description:"Progress saved to your dashboard." });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  const videoSrc = cls?.recordingUrl || cls?.videoUrl;
  const prevWatchSeconds = existingProgress?.watchTimeSeconds || 0;
  const isCompleted = existingProgress?.completed === true;
  const completionPct = cls?.duration
    ? Math.min(100, Math.round((prevWatchSeconds / (cls.duration * 60)) * 100))
    : isCompleted ? 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/student-dashboard">
            <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          {isSaved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveOffline}
              className="text-emerald-400 border-emerald-700 hover:bg-slate-800 gap-2"
            >
              <WifiOff className="w-4 h-4" />
              Saved Offline
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOffline}
              disabled={savingOffline}
              className="text-slate-300 border-slate-600 hover:bg-slate-800 gap-2"
            >
              {savingOffline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Save for Offline
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls
                  className="w-full h-full"
                  autoPlay={false}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                  onSeeked={handleSeeked}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center text-white/60">
                  {(classLessons as any[]).length > 0 ? (
                    <>
                      <FileText className="w-16 h-16 mx-auto mb-4 text-indigo-400/70" />
                      <p className="text-lg text-white/80">Written course — see lessons below</p>
                      <p className="text-sm mt-2 text-slate-500">This course provides structured written lesson content</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg">No recording available for this class</p>
                      <p className="text-sm mt-2">Check back after the live session</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* #183: Playback speed control */}
            {videoSrc && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <span className="text-xs text-slate-400">Speed:</span>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                    }}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      playbackRate === rate
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-600 text-slate-400 hover:border-indigo-400"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}

            {/* Progress bar below video */}
            {(prevWatchSeconds > 0 || isCompleted) && (
              <div className="mt-3 px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Your progress</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    {isCompleted && <CheckCircle className="w-3 h-3 text-green-400" />}
                    {completionPct}% {isCompleted ?"— Completed" :"watched"}
                  </span>
                </div>
                <Progress value={completionPct} className="h-1.5" />
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-white mb-2">{cls?.title}</h1>
                {isCompleted && (
                  <Badge className="bg-green-600 shrink-0">
                    <CheckCircle className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mb-4">
                {cls?.category && <Badge variant="secondary">{cls.category}</Badge>}
                {cls?.skillLevel && (
                  <Badge variant="outline" className="text-white border-slate-600">{cls.skillLevel}</Badge>
                )}
                {videoSrc && cls?.duration && (
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {cls.duration} min
                  </span>
                )}
              </div>
              {cls?.description && <p className="text-slate-300">{cls.description}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Instructor</p>
                  <p className="font-medium">{(cls as any)?.tutorName || "Instructor"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Course Type</p>
                  <p className="font-medium capitalize">{cls?.courseType}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Language</p>
                  <p className="font-medium">{cls?.language ||"English"}</p>
                </div>
                {cls?.isRecordingAvailable && (
                  <Badge className="bg-green-600">Recording Available</Badge>
                )}

                {/* Progress summary */}
                {prevWatchSeconds > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-400 text-sm mb-1">Watch Time</p>
                    <p className="font-medium text-green-400">
                      {Math.round(prevWatchSeconds / 60)} min watched
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">More Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/classes">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Play className="w-4 h-4 mr-2" />
                    Browse More Classes
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Per-class Notes panel */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Class Notes
                    {classNotes.length > 0 && (
                      <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">{classNotes.length}</Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-white"
                    onClick={() => setShowNoteInput((v) => !v)}
                  >
                    {showNoteInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {showNoteInput && (
                  <div className="space-y-2">
                    <Textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value.slice(0, 2000))}
                      placeholder="Write a note for this class..."
                      rows={3}
                      maxLength={2000}
                      className="bg-slate-900 border-slate-600 text-white text-sm resize-none placeholder:text-slate-500"
                    />
                    <Button
                      size="sm"
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => addNoteMutation.mutate()}
                      disabled={!newNoteContent.trim() || addNoteMutation.isPending}
                    >
                      {addNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> :"Save Note"}
                    </Button>
                  </div>
                )}
                {classNotes.length === 0 && !showNoteInput ? (
                  <p className="text-slate-500 text-xs text-center py-2">No notes yet. Click + to add one.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {classNotes.map((note: any) => (
                      <div key={note.id} className="group flex items-start gap-2 p-2 bg-slate-900 rounded-md">
                        <p className="text-slate-300 text-xs flex-1 whitespace-pre-wrap">{note.content}</p>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity shrink-0 mt-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Written Lessons — Slides Section ─────────────────────────── */}
        {(classLessons as any[]).length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Written Lessons
              <span className="text-sm font-normal text-slate-400 ml-1">
                ({(classLessons as any[]).length} lesson{(classLessons as any[]).length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="space-y-3">
              {(classLessons as any[]).map((lesson: any, lIdx: number) => {
                const sections = (lesson.sections || []).map((s: string) => {
                  const sepIdx = s.indexOf("||");
                  return sepIdx >= 0
                    ? { title: s.slice(0, sepIdx), content: s.slice(sepIdx + 2) }
                    : { title: "", content: s };
                });
                const isExpanded = expandedLesson === lIdx;
                const currentSlide = slideIndexes[lIdx] || 0;
                return (
                  <Card key={lesson.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
                      onClick={() => setExpandedLesson(isExpanded ? null : lIdx)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 text-sm font-bold shrink-0">
                          {lIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-slate-400 text-xs mt-0.5 truncate">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {sections.length > 0 && (
                          <span className="text-xs text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 rounded px-2 py-0.5">
                            {sections.length} slide{sections.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-700 p-4 space-y-4">
                        {sections.length > 0 ? (
                          <>
                            {/* Slide card */}
                            <div className="bg-slate-900 rounded-xl p-6 min-h-[220px]">
                              {sections[currentSlide].title && (
                                <h3 className="text-indigo-300 font-bold text-base mb-3 pb-2 border-b border-slate-700">
                                  {sections[currentSlide].title}
                                </h3>
                              )}
                              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {sections[currentSlide].content}
                              </div>
                            </div>
                            {/* Slide navigation */}
                            <div className="flex items-center justify-between">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentSlide === 0}
                                onClick={() =>
                                  setSlideIndexes((prev) => ({ ...prev, [lIdx]: currentSlide - 1 }))
                                }
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                              >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                              </Button>
                              <span className="text-slate-400 text-sm">
                                {currentSlide + 1} / {sections.length}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentSlide === sections.length - 1}
                                onClick={() =>
                                  setSlideIndexes((prev) => ({ ...prev, [lIdx]: currentSlide + 1 }))
                                }
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                              >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </>
                        ) : lesson.content ? (
                          <div className="bg-slate-900 rounded-xl p-6 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {lesson.content}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm text-center py-4">No content available for this lesson.</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
