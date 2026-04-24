import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CourseCardSkeleton, EmptyState } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { BookOpen, CheckCircle } from 'lucide-react';

interface CoursesTabProps {
  enrolledClasses: any[];
  classesLoading: boolean;
  progressMap: Record<number, any>;
  getCompletionPct: (cls: any) => number;
}

export function CoursesTab({ enrolledClasses, classesLoading, progressMap, getCompletionPct }: CoursesTabProps) {
  return (
    <>
      {classesLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map(i => <CourseCardSkeleton key={i} />)}
        </div>
      ) : enrolledClasses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No enrolled courses" description="Find and enrol in classes to get started." action={{ label: 'Browse Classes', href: '/classes' }} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledClasses.map((cls: any) => {
            const pct = getCompletionPct(cls);
            const p = progressMap[cls.id];
            return (
              <Card key={cls.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="relative h-44 overflow-hidden bg-indigo-100 dark:bg-indigo-900">
                  {cls.thumbnailUrl
                    ? <img src={cls.thumbnailUrl} alt={cls.title} width={320} height={180} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-indigo-400" /></div>}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-white/90 text-slate-800 text-xs">{cls.courseType}</Badge>
                    {p?.completed && <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="rgba(15,23,42,0.55)" />
                        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="24"
                          fill="none"
                          stroke={p?.completed ? '#10b981' : '#818cf8'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(100, Math.max(0, pct)) / 100)}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                        {pct}%
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{cls.title}</h3>
                  <p className="text-xs text-slate-500 mb-3">{cls.category} · {cls.skillLevel}</p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Progress</span><span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <Link href={`/classes/${cls.id}`}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm">
                      {p?.completed ? 'Rewatch' : pct > 0 ? 'Continue' : 'Start Learning'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
