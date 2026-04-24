import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseCardSkeleton, EmptyState } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { Loader2, Heart, FileText, Download, Bookmark, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UseMutationResult } from '@tanstack/react-query';

interface LibraryTabProps {
  favorites: any[];
  favoritesLoading: boolean;
  notes: any[];
  mySubmissions: any[];
  enrolledClasses: any[];
  isCreatingNote: boolean;
  setIsCreatingNote: (v: boolean) => void;
  newNote: { classId: string; topic: string; content: string; tags: string };
  setNewNote: (v: { classId: string; topic: string; content: string; tags: string }) => void;
  removeFavoriteMutation: UseMutationResult<any, Error, number, unknown>;
  deleteNoteMutation: UseMutationResult<any, Error, number, unknown>;
  saveNoteMutation: UseMutationResult<any, Error, any, unknown>;
}

export function LibraryTab({
  favorites,
  favoritesLoading,
  notes,
  mySubmissions,
  enrolledClasses,
  isCreatingNote,
  setIsCreatingNote,
  newNote,
  setNewNote,
  removeFavoriteMutation,
  deleteNoteMutation,
  saveNoteMutation,
}: LibraryTabProps) {
  return (
    <div className="space-y-8">
      {/* Saved Classes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" /> Saved Classes
          </h2>
          <Link href="/classes"><Button variant="ghost" size="sm" className="text-xs text-indigo-600">Browse more</Button></Link>
        </div>
        {favoritesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <CourseCardSkeleton key={i} />)}
          </div>
        ) : !Array.isArray(favorites) || favorites.length === 0 ? (
          <EmptyState icon={Heart} title="No saved classes" description="Bookmark classes you like while browsing." action={{ label: 'Browse Classes', href: '/classes' }} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav: any) => {
              const cls = fav.class || { title: fav.classTitle, category: fav.classCategory, thumbnailUrl: fav.classThumbnail, id: fav.classId };
              return (
                <Card key={fav.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="h-36 overflow-hidden bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center relative">
                    {cls.thumbnailUrl
                      ? <img src={cls.thumbnailUrl} alt={cls.title || 'Class'} width={320} height={180} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <Heart className="w-10 h-10 text-rose-300" />}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">{cls.title || `Class #${fav.classId}`}</h3>
                    {cls.category && <p className="text-xs text-slate-500 mb-3">{cls.category}</p>}
                    <div className="flex gap-2">
                      <Link href={`/classes/${fav.classId || cls.id}`} className="flex-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">View Class</Button>
                      </Link>
                      <Button variant="outline" size="icon" className="w-8 h-8 shrink-0"
                        onClick={() => removeFavoriteMutation.mutate(fav.classId || cls.id)} disabled={removeFavoriteMutation.isPending}>
                        {removeFavoriteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* My Notes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> My Notes
          </h2>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs" onClick={() => setIsCreatingNote(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Note
          </Button>
        </div>
        {notes.length === 0 ? (
          <EmptyState icon={FileText} title="No notes yet" description="Create notes to keep track of what you learn." action={{ label: 'Create Note', onClick: () => setIsCreatingNote(true) }} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note: any) => {
              const tagList: string[] = note.tags ?? [];
              return (
                <Card key={note.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{note.topic || note.course || 'Untitled'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(note.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-slate-400 hover:text-red-500 ml-2"
                        onClick={() => deleteNoteMutation.mutate(note.id)} disabled={deleteNoteMutation.isPending}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap mb-3">{note.content}</p>
                    {tagList.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tagList.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs px-1.5">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* My Submitted Files */}
      {mySubmissions.filter((s: any) => s.fileUrl).length > 0 && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-800" />
          <section>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-violet-500" /> My Submitted Files
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySubmissions.filter((s: any) => s.fileUrl).map((sub: any) => (
                <Card key={sub.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sub.assignmentTitle || `Assignment #${sub.assignmentId}`}</p>
                      <p className="text-xs text-slate-500">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Submitted'}</p>
                      {sub.grade !== null && sub.grade !== undefined && (
                        <Badge className="mt-1 text-xs bg-emerald-100 text-emerald-700">Grade: {sub.grade}/{sub.maxScore || 100}</Badge>
                      )}
                    </div>
                    <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-8 text-xs shrink-0"><Download className="w-3 h-3 mr-1" />Open</Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Create Note Modal */}
      {isCreatingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsCreatingNote(false)}>
          <div role="dialog" aria-modal="true" aria-label="New Note" className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border/60 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 dark:border-slate-800">
              <h3 className="text-base font-semibold text-foreground">New Note</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsCreatingNote(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Course <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <select
                  className="w-full border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-card text-foreground"
                  value={newNote.classId}
                  onChange={(e) => setNewNote({ ...newNote, classId: e.target.value })}
                >
                  <option value="">No course selected</option>
                  {enrolledClasses.map((cls: any) => (
                    <option key={cls.id} value={String(cls.id)}>{cls.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Topic</label>
                <Input placeholder="e.g. Introduction to Algebra" value={newNote.topic} onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Notes</label>
                <Textarea placeholder="Write your notes here..." rows={5} value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Tags <span className="normal-case font-normal text-slate-400">(comma-separated)</span></label>
                <Input placeholder="algebra, equations, maths" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setIsCreatingNote(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!newNote.content || saveNoteMutation.isPending}
                onClick={() => {
                  const tagsArray = newNote.tags ? newNote.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                  saveNoteMutation.mutate({ topic: newNote.topic, content: newNote.content, tags: tagsArray, ...(newNote.classId ? { classId: newNote.classId } : {}) });
                }}
              >
                {saveNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
