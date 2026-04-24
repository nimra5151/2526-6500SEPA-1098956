import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListItemSkeleton, EmptyState } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { Users2, Star, MessageSquare } from 'lucide-react';

interface MyTutorsTabProps {
  myTutors: any[];
  tutorsLoading: boolean;
  tutorsError: boolean;
}

export function MyTutorsTab({ myTutors, tutorsLoading, tutorsError }: MyTutorsTabProps) {
  return (
    <div className="space-y-4">
      {tutorsError && !tutorsLoading && (
        <p className="text-sm text-destructive px-1">Failed to load tutors. Please refresh.</p>
      )}
      {tutorsLoading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</div>
      ) : myTutors.length === 0 ? (
        <EmptyState icon={Users2} title="No tutors yet" description="Enrol in classes to connect with volunteer tutors." action={{ label: 'Browse Classes', href: '/classes' }} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTutors.map((tutor: any) => (
            <Card key={tutor.id} className="border border-border/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center overflow-hidden shrink-0">
                    {tutor.avatar
                      ? <img src={tutor.avatar} alt={tutor.name} width={56} height={56} loading="lazy" className="w-full h-full object-cover" />
                      : <span className="text-indigo-700 dark:text-indigo-300 font-bold text-xl">{tutor.name?.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{tutor.name}</h3>
                    {tutor.rating && Number(tutor.rating) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{Number(tutor.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {tutor.bio && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{tutor.bio}</p>}
                {tutor.classes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {tutor.classes.map((cls: any) => (
                      <Badge key={cls.id} variant="secondary" className="text-xs">{cls.title}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/messages?with=${tutor.id}`} className="flex-1">
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">
                      <MessageSquare className="w-3 h-3 mr-1" /> Message
                    </Button>
                  </Link>
                  <Link href={`/profile/${tutor.id}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs">Profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
