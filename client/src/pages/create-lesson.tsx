import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Plus, Trash2, Save, Wand2, FileText,
  Video, Image as ImageIcon, Link as LinkIcon, CheckCircle, BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Class } from '@shared/schema';

interface LessonSection {
  id: number;
  title: string;
  content: string;
  type: string;
}

export default function CreateLesson() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const lessonId = params.get('lessonId');
  const isEditing = !!lessonId;

  const [lesson, setLesson] = useState({
    title: '',
    description: '',
    content: '',
    duration: 30,
    difficulty: 'beginner',
  });

  const [sections, setSections] = useState<LessonSection[]>([
    { id: Date.now(), title: '', content: '', type: 'text' }
  ]);

  const [classId, setClassId] = useState(() => params.get('classId') || '');
  const [myClasses, setMyClasses] = useState<Class[]>([]);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [aiGenerationNote, setAiGenerationNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    authFetch('/api/classes/my/teaching')
      .then(setMyClasses)
      .catch(() => toast({ title: 'Failed to load classes', variant: 'destructive' }));
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    setLoadingExisting(true);
    authFetch(`/api/lessons/${lessonId}`)
      .then((data: any) => {
        setLesson({
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          duration: data.duration || 30,
          difficulty: data.difficulty || 'beginner',
        });
        if (data.classId) setClassId(String(data.classId));
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          const parsed: LessonSection[] = data.sections.map((s: string, i: number) => {
            const parts = String(s).split('||');
            return {
              id: Date.now() + i,
              title: parts[0] || '',
              content: parts[1] || '',
              type: 'text',
            };
          });
          setSections(parsed);
        }
      })
      .catch(() => toast({ title: 'Failed to load lesson', variant: 'destructive' }))
      .finally(() => setLoadingExisting(false));
  }, [lessonId]);

  const handleSaveLesson = async () => {
    if (!lesson.title) {
      toast({ title: 'Please enter a lesson title', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        duration: lesson.duration || 30,
        difficulty: lesson.difficulty,
        sections: sections
          .filter(s => s.title || s.content)
          .map(s => `${s.title.replace(/\|\|/g, '|')}||${s.content.replace(/\|\|/g, '|')}`),
        classId: classId ? Number(classId) : null,
      };

      if (isEditing) {
        await authFetch(`/api/lessons/${lessonId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Lesson updated successfully!' });
      } else {
        await authFetch('/api/lessons', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast({ title: 'Lesson saved successfully!' });
      }
      setLocation('/teacher-dashboard');
    } catch (err: Error | unknown) {
      toast({ title: (err as Error).message || 'Failed to save lesson', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateWithAI = async () => {
    if (!lesson.title) {
      toast({ title: 'Please enter a lesson title first', variant: 'destructive' });
      return;
    }
    setAiAssisting(true);
    try {
      const body: Record<string, unknown> = {
        topic: lesson.title,
        duration: lesson.duration,
        difficulty: lesson.difficulty,
      };
      if (classId) body.classId = Number(classId);

      const data = await authFetch('/api/ai/lesson-plan', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const hasExisting = sections.some(s => s.title.trim() || s.content.trim());
      if (hasExisting && !window.confirm('AI will replace your current sections. Continue?')) {
        setAiAssisting(false);
        return;
      }

      const newSections: LessonSection[] = [];

      // Section 1: Learning Objectives
      if (Array.isArray(data.objectives) && data.objectives.length > 0) {
        newSections.push({
          id: Date.now(),
          title: 'Learning Objectives',
          content: data.objectives.map((o: string) => `• ${o}`).join('\n'),
          type: 'text',
        });
      }

      // Middle sections: one per activity
      if (Array.isArray(data.activities)) {
        data.activities.forEach((a: { name?: string; description?: string; duration?: number }, i: number) => {
          newSections.push({
            id: Date.now() + i + 1,
            title: a.name || `Activity ${i + 1}`,
            content: a.description || '',
            type: 'text',
          });
        });
      }

      // Final section: Assessment Criteria
      if (Array.isArray(data.assessment) && data.assessment.length > 0) {
        newSections.push({
          id: Date.now() + 999,
          title: 'Assessment Criteria',
          content: data.assessment.map((a: string) => `• ${a}`).join('\n'),
          type: 'text',
        });
      }

      if (newSections.length > 0) {
        setSections(newSections);
      }

      // Pre-fill description from first objective if empty
      if (!lesson.description && Array.isArray(data.objectives) && data.objectives[0]) {
        setLesson(prev => ({ ...prev, description: data.objectives[0] }));
      }

      const note = data._ragUsed
        ? 'Generated from course material (RAG)'
        : 'Generated by AI';
      setAiGenerationNote(note);
      toast({
        title: data._ragUsed ? 'Lesson generated from course material!' : 'Lesson generated by AI!',
        description: data._ragUsed
          ? 'Content is grounded in your course lessons.'
          : 'Edit the sections as needed.',
        duration: 6000,
      });
    } catch (err: Error | unknown) {
      toast({ title: 'AI generation failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAiAssisting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {isEditing ? 'Edit Lesson' : 'Create New Lesson'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {isEditing ? 'Update the lesson details below' : 'Use AI to help create engaging course content'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveLesson} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving
                ? (isEditing ? 'Updating...' : 'Saving...')
                : (isEditing ? 'Update Lesson' : 'Save Lesson')}
            </Button>
          </div>
        </div>

        <div className="mb-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">AI-Powered Content Creation</h3>
              <p className="text-white/80">
                {classId
                  ? 'Content will be grounded in the selected course\'s actual lesson material (RAG)'
                  : 'Use artificial intelligence to generate lesson outlines and content automatically'}
              </p>
            </div>
            <Button
              onClick={generateWithAI}
              className="bg-white text-indigo-600 hover:bg-white/90"
              size="lg"
              disabled={aiAssisting}
            >
              <Wand2 className="w-5 h-5 mr-2" />
              {aiAssisting ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Lesson Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Lesson Title *</Label>
                  <Input
                    value={lesson.title}
                    onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                    placeholder="e.g., Introduction to React Hooks"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={lesson.description}
                    onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
                    placeholder="Brief overview of what students will learn..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={lesson.duration}
                      onChange={(e) => setLesson({ ...lesson, duration: Number(e.target.value) || 0 })}
                      placeholder="45"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Difficulty Level</Label>
                    <select
                      value={lesson.difficulty}
                      onChange={(e) => setLesson({ ...lesson, difficulty: e.target.value })}
                      className="mt-2 w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Lesson Content</CardTitle>
                  <Button
                    onClick={generateWithAI}
                    disabled={aiAssisting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {aiAssisting ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border rounded-xl space-y-4 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <Badge>Section {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSections(sections.filter(s => s.id !== section.id))}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[index].title = e.target.value;
                        setSections(updated);
                      }}
                      placeholder="Section title..."
                    />

                    <Textarea
                      value={section.content}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[index].content = e.target.value;
                        setSections(updated);
                      }}
                      placeholder="Section content..."
                      rows={4}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => {
                        const url = window.prompt('Enter image URL:');
                        if (!url) return;
                        const alt = window.prompt('Image description (alt text):', 'Image') || 'Image';
                        const updated = [...sections];
                        updated[index].content += `\n![${alt}](${url})`;
                        setSections(updated);
                      }}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Image
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const updated = [...sections];
                        updated[index].content += '\n[Video: Title](https://url-to-video)';
                        setSections(updated);
                      }}>
                        <Video className="w-4 h-4 mr-2" />
                        Add Video
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const updated = [...sections];
                        updated[index].content += '\n[Link text](https://url)';
                        setSections(updated);
                      }}>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                  </motion.div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setSections([...sections, { id: Date.now(), title: '', content: '', type: 'text' }])}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-950/20">
              <CardHeader className="border-b border-indigo-200 dark:border-indigo-900">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Assistant
                  {classId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <BookOpen className="w-3 h-3" /> RAG — Course material
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {classId
                    ? 'Content will be grounded in the actual lesson material of the selected course'
                    : 'Let AI help you create better lessons faster'}
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={generateWithAI}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={aiAssisting}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Lesson Outline
                  </Button>

                  <Button
                    onClick={generateWithAI}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={aiAssisting}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Expand Content
                  </Button>

                  <Button
                    onClick={generateWithAI}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={aiAssisting}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Generate Quiz Questions
                  </Button>

                  {aiGenerationNote && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{aiGenerationNote}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Publishing Options</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm">Course (optional)</Label>
                  <select
                    value={classId}
                    onChange={(e) => { setClassId(e.target.value); setAiGenerationNote(null); }}
                    className="mt-2 w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">— No course —</option>
                    {myClasses.map((c: Class) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="notify" className="rounded" />
                  <Label htmlFor="notify" className="text-sm">
                    Notify students
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
