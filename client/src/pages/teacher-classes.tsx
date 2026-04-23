import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import type { Class } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Users, BookOpen, Clock, Eye, Calendar,
  Plus, Video, Wand2, Star, Loader2, X, Download, ClipboardList,
  Bot, ChevronRight, Sparkles, Edit, Archive, RotateCcw, Megaphone,
  FileText, CheckCircle, XCircle, TrendingUp, BarChart3, Search,
} from 'lucide-react';
import { ClassCardListSkeleton } from '@/components/skeleton-loader';

export default function TeacherClasses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [classSearch, setClassSearch] = useState('');
  const [expandedClassLessons, setExpandedClassLessons] = useState<number | null>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [announcingClass, setAnnouncingClass] = useState<any>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [confirmArchive, setConfirmArchive] = useState<any>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [aiToolsClassId, setAiToolsClassId] = useState<number | null>(null);
  const [aiToolsType, setAiToolsType] = useState('');
  const [aiToolsLoading, setAiToolsLoading] = useState(false);
  const [aiToolsResult, setAiToolsResult] = useState('');
  const [aiToolsCopied, setAiToolsCopied] = useState(false);

  const { data: myClasses, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', 'my', 'teaching'],
    queryFn: () => authFetch('/api/classes/my/teaching'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: myLessons = [] } = useQuery({
    queryKey: ['lessons', 'my'],
    queryFn: () => authFetch('/api/lessons'),
    enabled: !!user,
  });

  const handleExport = <T extends Record<string, unknown>>(data: T[], filename: string) => {
    if (!data || data.length === 0) {
      toast({ title: 'Nothing to export', description: 'No data available.', variant: 'destructive' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; description: string; status: string } }) =>
      authFetch(`/api/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      setEditingClass(null);
      toast({ title: 'Class updated successfully.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to update class', description: err.message, variant: 'destructive' }),
  });

  const archiveClassMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      setConfirmArchive(null);
      toast({ title: 'Class archived.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to archive class', description: err.message, variant: 'destructive' }),
  });

  const announceMutation = useMutation({
    mutationFn: ({ classId, title, message }: { classId: number; title: string; message: string }) =>
      authFetch(`/api/classes/${classId}/announce`, { method: 'POST', body: JSON.stringify({ title, message }) }),
    onSuccess: (data: any) => {
      toast({ title: `Announcement sent to ${data.sent} student${data.sent !== 1 ? 's' : ''}.` });
      setAnnouncingClass(null); setAnnounceTitle(''); setAnnounceMessage('');
    },
    onError: (err: Error) => toast({ title: 'Announcement failed', description: err.message, variant: 'destructive' }),
  });

  const startZoomMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      toast({ title: 'Zoom meeting started! Share the link with your students.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to start meeting', description: err.message, variant: 'destructive' }),
  });

  const endZoomMutation = useMutation({
    mutationFn: (classId: number) =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'my', 'teaching'] });
      toast({ title: 'Zoom meeting ended.' });
    },
    onError: (err: Error) => toast({ title: 'Failed to end meeting', description: err.message, variant: 'destructive' }),
  });

  const duplicateLessonMutation = useMutation({
    mutationFn: (lesson: any) =>
      authFetch('/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: `${lesson.title} (Copy)`,
          description: lesson.description,
          content: lesson.content,
          duration: lesson.duration,
          difficulty: lesson.difficulty,
          classId: lesson.classId,
          sections: lesson.sections,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', 'my'] });
      setConfirmDuplicate(null);
      toast({ title: 'Lesson duplicated!' });
    },
    onError: (err: Error) => toast({ title: 'Failed to duplicate lesson', description: err.message, variant: 'destructive' }),
  });

  const saveAiNoteMutation = useMutation({
    mutationFn: ({ topic, content, classId }: { topic: string; content: string; classId?: number }) =>
      authFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ topic, content, classId, tags: ['ai-generated'] }),
      }),
    onSuccess: () => toast({ title: 'AI result saved as a note.' }),
    onError: (err: Error) => toast({ title: 'Failed to save note', description: err.message, variant: 'destructive' }),
  });

  const handleAiTools = async (cls: any, type: 'quiz' | 'summarize' | 'activities') => {
    setAiToolsClassId(cls.id);
    setAiToolsType(type);
    setAiToolsLoading(true);
    setAiToolsResult('');
    const prompts: Record<string, string> = {
      quiz: `Generate 5 multiple-choice quiz questions for a class titled "${cls.title}" (${cls.category || 'general'}, ${cls.skillLevel || 'beginner'} level). Format each as:\nQ: [question]\nA) [option] B) [option] C) [option] D) [option]\nAnswer: [letter]`,
      summarize: `Summarize the key learning objectives and topics for a class titled "${cls.title}" in the subject "${cls.category || 'general'}" at ${cls.skillLevel || 'beginner'} level. Give 5 concise bullet points.`,
      activities: `Suggest 5 engaging teaching activities for a class titled "${cls.title}" (${cls.category || 'general'}, ${cls.skillLevel || 'beginner'} level) suitable for orphanage students in an online tutoring session. Keep each activity practical and low-cost.`,
    };
    try {
      const result = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompts[type] }),
      });
      setAiToolsResult(result.message || result.reply || 'No response from AI.');
    } catch {
      setAiToolsResult('AI tools unavailable. Please check your OpenAI configuration.');
    } finally {
      setAiToolsLoading(false);
    }
  };

  const filtered = useMemo(() =>
    (myClasses || []).filter((cls: any) =>
      !classSearch ||
      cls.title?.toLowerCase().includes(classSearch.toLowerCase()) ||
      cls.category?.toLowerCase().includes(classSearch.toLowerCase())
    ), [myClasses, classSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your courses, lessons and students</p>
          </div>
          <div className="flex items-center gap-2">
            {(myClasses || []).length > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleExport(myClasses, 'my-classes')}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            )}
            <Link href="/classes/create">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                <Plus className="w-4 h-4" /> New Class
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={classSearch}
            onChange={e => setClassSearch(e.target.value)}
            placeholder="Search classes by name or category..."
            className="pl-9"
          />
        </div>

        {/* Classes List */}
        {classesLoading ? (
          <div className="grid gap-4">
            {[0, 1, 2].map(i => <ClassCardListSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4">
            {filtered.map((cls: Class) => (
              <div key={cls.id} className="space-y-1">
                <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg text-foreground">{cls.title}</h4>
                          <Badge className={
                            cls.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            cls.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }>{cls.status}</Badge>
                          <Badge className="bg-slate-100 text-slate-700">{cls.courseType}</Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{cls.description}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{cls.category}</span>
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" />{cls.enrolledCount || 0}/{cls.maxStudents || 10} students</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{cls.duration} min</span>
                          <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{cls.viewCount || 0} views</span>
                          {cls.scheduleDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(cls.scheduleDate).toLocaleDateString()}
                              {cls.scheduleTime && ` at ${cls.scheduleTime}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedClass(cls)}>
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> Details
                        </Button>
                        <Link href={`/classes/${cls.id}`}>
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View Page
                          </Button>
                        </Link>
                        <Link href={`/create-lesson?classId=${cls.id}`}>
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> + Lesson
                          </Button>
                        </Link>
                        <Link href={`/create-quiz?classId=${cls.id}`}>
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> + Quiz
                          </Button>
                        </Link>
                        <Link href={`/create-assignment?classId=${cls.id}`}>
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20">
                            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> + Assignment
                          </Button>
                        </Link>
                        {cls.zoomMeetingId ? (
                          <>
                            {cls.zoomMeetingUrl && (
                              <a href={cls.zoomMeetingUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="w-full h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/20">
                                  <Video className="w-3.5 h-3.5 mr-1.5" /> Join Meeting
                                </Button>
                              </a>
                            )}
                            <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                              disabled={endZoomMutation.isPending}
                              onClick={() => endZoomMutation.mutate(cls.id)}>
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> End Meeting
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                            disabled={startZoomMutation.isPending}
                            onClick={() => startZoomMutation.mutate(cls.id)}>
                            <Video className="w-3.5 h-3.5 mr-1.5" /> Start Meeting
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setEditingClass(cls); setEditTitle(cls.title); setEditDescription(cls.description || ''); setEditStatus(cls.status || 'active'); }}>
                        <Edit className="w-3 h-3 mr-1.5" /> Edit Class
                      </Button>
                      <Link href={`/teacher-dashboard?tab=students&classId=${cls.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Users className="w-3 h-3 mr-1.5" /> View Students
                        </Button>
                      </Link>
                      <Link href={`/classes/${cls.id}/progress`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-950/20">
                          <TrendingUp className="w-3 h-3 mr-1.5" /> Progress
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/20"
                        onClick={() => { setAnnouncingClass(cls); setAnnounceTitle(''); setAnnounceMessage(''); }}>
                        <Megaphone className="w-3 h-3 mr-1.5" /> Announce
                      </Button>
                      <Link href={`/create-lesson?classId=${cls.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:border-sky-900 dark:hover:bg-sky-950/20">
                          <FileText className="w-3 h-3 mr-1.5" /> Add Lesson
                        </Button>
                      </Link>
                      <Link href="/teacher-dashboard?tab=analytics">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <BarChart3 className="w-3 h-3 mr-1.5" /> View Analytics
                        </Button>
                      </Link>
                      {cls.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
                          disabled={archiveClassMutation.isPending}
                          onClick={() => setConfirmArchive(cls)}>
                          <Archive className="w-3 h-3 mr-1.5" /> Archive Class
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Teaching Tools */}
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI Teaching Tools</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300"
                      disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'quiz'}
                      onClick={() => handleAiTools(cls, 'quiz')}>
                      {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'quiz'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                      Generate Quiz Questions
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-sky-200 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300"
                      disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'summarize'}
                      onClick={() => handleAiTools(cls, 'summarize')}>
                      {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'summarize'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Bot className="w-3.5 h-3.5 mr-1.5" />}
                      Summarize Lesson
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300"
                      disabled={aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'activities'}
                      onClick={() => handleAiTools(cls, 'activities')}>
                      {aiToolsLoading && aiToolsClassId === cls.id && aiToolsType === 'activities'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                      Suggest Activities
                    </Button>
                  </div>
                  {aiToolsClassId === cls.id && aiToolsResult && (
                    <div className="space-y-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none bg-card border border-indigo-100 dark:border-indigo-900 rounded-lg p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {aiToolsResult}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                          disabled={saveAiNoteMutation.isPending}
                          onClick={() => saveAiNoteMutation.mutate({
                            topic: `AI ${aiToolsType === 'quiz' ? 'Quiz Questions' : aiToolsType === 'summarize' ? 'Summary' : 'Activities'}: ${cls.title}`,
                            content: aiToolsResult,
                            classId: cls.id,
                          })}>
                          {saveAiNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Save as Note
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(aiToolsResult).then(() => {
                              setAiToolsCopied(true);
                              setTimeout(() => setAiToolsCopied(false), 2000);
                            });
                          }}>
                          {aiToolsCopied ? 'Copied!' : 'Copy'}
                        </Button>
                        {aiToolsType === 'quiz' && (
                          <a href={`/create-quiz?classId=${cls.id}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                              Create Quiz
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expandable Lessons */}
                <div className="rounded-xl border border-border/60 dark:border-slate-700 bg-card/50 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => setExpandedClassLessons(expandedClassLessons === cls.id ? null : cls.id)}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Lessons ({(myLessons as any[]).filter((l: any) => l.classId === cls.id).length})
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform text-slate-400 ${expandedClassLessons === cls.id ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedClassLessons === cls.id && (
                    <div className="border-t border-slate-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                      {(myLessons as any[]).filter((l: any) => l.classId === cls.id).length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400 italic">
                          No lessons yet.{' '}
                          <Link href={`/create-lesson?classId=${cls.id}`}>
                            <span className="text-indigo-600 hover:underline cursor-pointer">Create one</span>
                          </Link>
                        </p>
                      ) : (
                        (myLessons as any[]).filter((l: any) => l.classId === cls.id).map((lesson: any) => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{lesson.difficulty || 'beginner'} · {lesson.duration || 0} min</p>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/create-lesson?classId=${lesson.classId}&lessonId=${lesson.id}`}>
                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                  <Edit className="w-3 h-3 mr-1" /> Edit
                                </Button>
                              </Link>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                disabled={duplicateLessonMutation.isPending}
                                onClick={() => setConfirmDuplicate(lesson)}>
                                Duplicate
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Classes Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {classSearch ? 'No classes match your search.' : 'Create your first class to start teaching!'}
              </p>
              {!classSearch && (
                <Link href="/classes/create">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Class
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Edit Class Modal ── */}
      {editingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingClass(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Edit Class</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingClass(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title</label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full border border-border/60 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-card text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={editClassMutation.isPending}
                  onClick={() => editClassMutation.mutate({ id: editingClass.id, data: { title: editTitle, description: editDescription, status: editStatus } })}
                >
                  {editClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Announce Modal ── */}
      {announcingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAnnouncingClass(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Announce to {announcingClass.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setAnnouncingClass(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title</label>
                <Input value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)} placeholder="Announcement title..." />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Message</label>
                <Textarea value={announceMessage} onChange={e => setAnnounceMessage(e.target.value)} rows={4} placeholder="Your message to enrolled students..." />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  disabled={announceMutation.isPending || !announceTitle.trim() || !announceMessage.trim()}
                  onClick={() => announceMutation.mutate({ classId: announcingClass.id, title: announceTitle, message: announceMessage })}
                >
                  {announceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
                  Send Announcement
                </Button>
                <Button variant="outline" onClick={() => setAnnouncingClass(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Archive ── */}
      {confirmArchive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmArchive(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-2">Archive Class?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to archive <strong>{confirmArchive.title}</strong>? This will mark it as cancelled.</p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={archiveClassMutation.isPending}
                onClick={() => archiveClassMutation.mutate(confirmArchive.id)}
              >
                {archiveClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Archive
              </Button>
              <Button variant="outline" onClick={() => setConfirmArchive(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Duplicate Lesson ── */}
      {confirmDuplicate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDuplicate(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-2">Duplicate Lesson?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Duplicate <strong>{confirmDuplicate.title}</strong>? A copy will be created.</p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={duplicateLessonMutation.isPending}
                onClick={() => duplicateLessonMutation.mutate(confirmDuplicate)}
              >
                {duplicateLessonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Duplicate
              </Button>
              <Button variant="outline" onClick={() => setConfirmDuplicate(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Class Details Modal ── */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedClass(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">{selectedClass.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
              <div><p className="text-slate-500 font-medium">Status</p><Badge className="mt-1">{selectedClass.status}</Badge></div>
              <div><p className="text-slate-500 font-medium">Category</p><p className="text-foreground mt-1">{selectedClass.category}</p></div>
              <div><p className="text-slate-500 font-medium">Duration</p><p className="text-foreground mt-1">{selectedClass.duration} min</p></div>
              <div><p className="text-slate-500 font-medium">Enrolled</p><p className="text-foreground mt-1">{selectedClass.enrolledCount || 0} / {selectedClass.maxStudents || '∞'}</p></div>
              <div><p className="text-slate-500 font-medium">Views</p><p className="text-foreground mt-1">{selectedClass.viewCount || 0}</p></div>
              <div><p className="text-slate-500 font-medium">Course Type</p><p className="text-foreground mt-1">{selectedClass.courseType}</p></div>
            </div>
            {selectedClass.description && (
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{selectedClass.description}</p>
            )}
            <div className="flex gap-3 pt-4 border-t">
              <Link href={`/classes/${selectedClass.id}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700"><Eye className="w-4 h-4 mr-2" />View on Site</Button>
              </Link>
              <Button variant="outline" onClick={() => setSelectedClass(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
