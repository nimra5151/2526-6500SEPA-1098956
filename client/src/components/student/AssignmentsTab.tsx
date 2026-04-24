import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListItemSkeleton, TableRowSkeleton } from '@/components/skeleton-loader';
import { Link } from 'wouter';
import { Download, Calendar, CheckCircle, Send, AlertCircle, ClipboardList, CalendarClock } from 'lucide-react';

interface AssignmentsTabProps {
  deadlines: any[];
  deadlinesLoading: boolean;
  deadlinesError: boolean;
  classAssignments: any[];
  classAssignmentsLoading: boolean;
  mySubmissions: any[];
  submissionsLoading: boolean;
  submissionsError: boolean;
}

export function AssignmentsTab({
  deadlines,
  deadlinesLoading,
  deadlinesError,
  classAssignments,
  classAssignmentsLoading,
  mySubmissions,
  submissionsLoading,
  submissionsError,
}: AssignmentsTabProps) {
  return (
    <div className="space-y-4">
      {/* Upcoming Deadlines */}
      <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-rose-500" /> Upcoming Deadlines
            {!deadlinesLoading && deadlines.length > 0 && (
              <Badge className="bg-rose-100 text-rose-700 ml-1">{deadlines.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deadlinesLoading ? (
            <div className="p-4 space-y-2">{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</div>
          ) : deadlinesError ? (
            <p className="text-sm text-destructive px-6 py-4">Failed to load deadlines. Please refresh.</p>
          ) : deadlines.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
              No upcoming deadlines in the next 14 days
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deadlines.map((d: any) => {
                const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 2;
                return (
                  <div key={d.id} className={`flex items-center justify-between px-6 py-4 ${isUrgent ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'} transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{d.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{d.className}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Due: {new Date(d.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <Badge className={`ml-4 shrink-0 text-xs ${daysLeft === 0 ? 'bg-red-100 text-red-700' : daysLeft === 1 ? 'bg-red-100 text-red-700' : daysLeft <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days left`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending / To-Do Assignments */}
      <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Pending Assignments
            {!classAssignmentsLoading && classAssignments.filter((a: any) => !a.submitted).length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 ml-1">
                {classAssignments.filter((a: any) => !a.submitted).length} to do
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {classAssignmentsLoading ? (
            <div className="divide-y dark:divide-slate-700">
              {[0, 1, 2].map(i => <div key={i} className="px-6 py-4 animate-pulse"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" /><div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div>)}
            </div>
          ) : classAssignments.filter((a: any) => !a.submitted).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="text-sm">All caught up! No pending assignments.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {classAssignments.filter((a: any) => !a.submitted).map((asgn: any) => (
                <div key={asgn.id} className="flex items-center justify-between px-6 py-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{asgn.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-slate-500">
                      {asgn.dueDate && (
                        <span className={`flex items-center gap-1 ${asgn.isOverdue ? 'text-red-500 font-medium' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(asgn.dueDate).toLocaleDateString()}
                          {asgn.isOverdue && <Badge className="bg-red-100 text-red-700 text-xs ml-1">Overdue</Badge>}
                        </span>
                      )}
                      <span>Max: {asgn.maxScore || 100} pts</span>
                      {asgn.allowLateSubmission === false && asgn.isOverdue && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Late submissions closed</Badge>
                      )}
                    </div>
                    {asgn.instructions && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{asgn.instructions}</p>
                    )}
                  </div>
                  <Link href={`/submit-assignment/${asgn.id}`}>
                    <Button size="sm" className={`shrink-0 gap-1.5 ${asgn.isOverdue ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                      <Send className="w-3.5 h-3.5" /> Submit
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted Assignments */}
      {submissionsError && !submissionsLoading && (
        <p className="text-sm text-destructive px-1">Failed to load submissions. Please refresh.</p>
      )}
      {submissionsLoading ? (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-0">
            <table className="w-full">
              <tbody className="divide-y dark:divide-slate-700">
                {[0, 1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : mySubmissions.length > 0 && (
        <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" /> Submitted ({mySubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Assignment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Feedback</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {mySubmissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{sub.assignmentTitle || `Assignment #${sub.assignmentId}`}</td>
                      <td className="px-6 py-4">
                        {sub.grade !== null && sub.grade !== undefined
                          ? <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>
                          : <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        {sub.grade !== null && sub.grade !== undefined ? `${sub.grade} / ${sub.maxScore || 100}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {sub.feedback || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {sub.fileUrl
                          ? <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="h-8 text-xs"><Download className="w-3 h-3 mr-1" />File</Button></a>
                          : <span className="text-xs text-slate-400">No file</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
