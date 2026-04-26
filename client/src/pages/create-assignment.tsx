import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Save, Sparkles, Wand2, Upload, BookOpen
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Class } from '@shared/schema';

export default function CreateAssignment() {
  const search = useSearch();
  const [assignment, setAssignment] = useState({
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    dueTime: '',
    maxPoints: 100,
    classId: new URLSearchParams(search).get('classId') || '',
    allowLateSubmission: true
  });
  const [myClasses, setMyClasses] = useState<Class[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerationNote, setAiGenerationNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await authFetch('/api/upload/assignment', {
        method: 'POST',
        body: formData,
      });
      if (data.fileUrl) setUploadedFileUrl(data.fileUrl);
      setUploadedFileName(file.name);
      toast({ title: 'File uploaded', description: file.name });
    } catch (err: Error | unknown) {
      toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    authFetch("/api/classes/my/teaching").then(setMyClasses).catch(() => toast({ title: "Failed to load classes", variant: "destructive" }));
  }, []);

  const handleSave = async () => {
    if (!assignment.title) {
      toast({ title:"Please enter an assignment title", variant:"destructive" });
      return;
    }
    if (assignment.dueDate) {
      const due = new Date(`${assignment.dueDate}T${assignment.dueTime || "23:59"}`);
      if (due < new Date()) {
        toast({ title: "Due date must be in the future", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      await authFetch("/api/assignments", {
        method:"POST",
        body: JSON.stringify({
          title: assignment.title,
          description: assignment.description,
          instructions: assignment.instructions,
          dueDate: assignment.dueDate
            ? new Date(`${assignment.dueDate}T${assignment.dueTime ||"23:59"}`).toISOString()
            : null,
          maxScore: assignment.maxPoints,
          classId: assignment.classId ? Number(assignment.classId) : null,
          allowLateSubmission: assignment.allowLateSubmission,
          fileUrl: uploadedFileUrl || undefined,
        }),
      });
      toast({ title:"Assignment saved successfully!" });
      setLocation("/teacher-dashboard");
    } catch (err: Error | unknown) {
      toast({ title: (err as Error).message || "Failed to save", variant:"destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateInstructionsWithAI = async () => {
    if (!assignment.title) {
      toast({ title:"Please enter an assignment title first", variant:"destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const body: Record<string, unknown> = {
        topic: assignment.title,
        duration: 60,
        difficulty:"beginner",
        targetAge:"10-18",
      };
      if (assignment.classId) body.classId = Number(assignment.classId);

      const data = await authFetch("/api/ai/lesson-plan", {
        method:"POST",
        body: JSON.stringify(body),
      });
      // lesson-plan returns: objectives[], activities[{name, description}], assessment[]
      const activities = Array.isArray(data.activities)
        ? data.activities.map((a: { name?: string; description?: string } | string, i: number) =>
            typeof a === "string" ? `${i + 1}. ${a}` : `${i + 1}. ${a.name || ""}: ${a.description || ""}`)
            .join("\n")
        : "1. Complete all required tasks\n2. Submit before the deadline";
      const objectives = Array.isArray(data.objectives)
        ? data.objectives.map((o: string) => `- ${o}`).join("\n")
        : "- Cover all required topics";
      const assessment = Array.isArray(data.assessment)
        ? data.assessment.map((a: string) => `- ${a}`).join("\n")
        : "- Quality of work\n- Timeliness";
      const generated = [
        `Assignment: ${data.title || assignment.title}`,
"",
        `Objectives:\n${objectives}`,
"",
"Instructions:",
        activities,
"",
"Assessment Criteria:",
        assessment,
      ].join("\n");
      setAssignment((prev: typeof assignment) => ({ ...prev, instructions: generated }));
      const note = data._ragUsed
        ? "Generated from course material (RAG)"
        : "Generated by AI";
      setAiGenerationNote(note);
      toast({
        title: data._ragUsed ? "Instructions generated from course material!" : "Instructions generated by AI!",
        description: data._ragUsed ? "Content is grounded in your course lessons." : "Edit the instructions as needed.",
        duration: 8000,
      });
    } catch (err: Error | unknown) {
      toast({ title:"AI generation failed", description: (err as Error).message, variant:"destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Create Assignment
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Create and manage student assignments with AI assistance
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ?"Saving..." :"Save Assignment"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Assignment Title *</Label>
                  <Input
                    value={assignment.title}
                    onChange={(e) => setAssignment({ ...assignment, title: e.target.value })}
                    placeholder="e.g., Essay on Climate Change"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={assignment.description}
                    onChange={(e) => setAssignment({ ...assignment, description: e.target.value })}
                    placeholder="Brief overview of the assignment..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={assignment.dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAssignment({ ...assignment, dueDate: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Due Time *</Label>
                    <Input
                      type="time"
                      value={assignment.dueTime}
                      onChange={(e) => setAssignment({ ...assignment, dueTime: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Max Points</Label>
                    <Input
                      type="number"
                      value={assignment.maxPoints}
                      onChange={(e) => setAssignment({ ...assignment, maxPoints: Number(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Instructions</CardTitle>
                  <Button
                    onClick={generateInstructionsWithAI}
                    disabled={aiGenerating}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {aiGenerating ? (
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
              <CardContent className="p-6">
                <Textarea
                  value={assignment.instructions}
                  onChange={(e) => setAssignment({ ...assignment, instructions: e.target.value })}
                  placeholder="Detailed assignment instructions..."
                  rows={12}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleUploadFiles}
                />
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Upload reference materials, rubrics, or example files
                  </p>
                  {uploadedFileName && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">
                      ✓ {uploadedFileName}
                    </p>
                  )}
                  <Button variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10">
              <CardHeader className="border-b border-indigo-200 dark:border-indigo-900">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Assistant
                  {assignment.classId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <BookOpen className="w-3 h-3" /> RAG — Course material
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {assignment.classId
                    ? "Instructions will be grounded in the actual lesson content of the selected course"
                    : "Let AI help you create better assignments"}
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={generateInstructionsWithAI}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={aiGenerating}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Instructions
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
                <CardTitle className="text-sm">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow Late Submission</Label>
                  <input
                    type="checkbox"
                    checked={assignment.allowLateSubmission}
                    onChange={(e) => setAssignment({ ...assignment, allowLateSubmission: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </div>

                <div>
                  <Label className="text-sm">Course (optional)</Label>
                  <select
                    value={assignment.classId}
                    onChange={(e) => setAssignment({ ...assignment, classId: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">— No course —</option>
                    {myClasses.map((c: Class) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
