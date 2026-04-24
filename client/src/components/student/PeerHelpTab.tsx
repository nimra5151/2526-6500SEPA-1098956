import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, HandHelping, HelpCircle, UserCheck,
  Users2, CheckCircle, CalendarClock, X, Send,
} from 'lucide-react';

interface PeerHelpTabProps {
  enrolledClasses: any[];
  user: any;
  peerHelpClassId: string;
  setPeerHelpClassId: (v: string) => void;
  peerHelpTopic: string;
  setPeerHelpTopic: (v: string) => void;
  peerHelpDesc: string;
  setPeerHelpDesc: (v: string) => void;
  peerHelpSubmitting: boolean;
  setPeerHelpSubmitting: (v: boolean) => void;
  helperTopic: string;
  setHelperTopic: (v: string) => void;
  helperClassId: string;
  setHelperClassId: (v: string) => void;
  bookingRequestId: number | null;
  setBookingRequestId: (v: number | null) => void;
  sessionDate: string;
  setSessionDate: (v: string) => void;
  sessionTime: string;
  setSessionTime: (v: string) => void;
  sessionSubmitting: boolean;
  setSessionSubmitting: (v: boolean) => void;
  myPeerRequests: any[];
  refetchMyRequests: () => void;
  boardRequests: any[];
  refetchBoard: () => void;
  classHelpers: any[];
  myOfferedRequests: any[];
  refetchMyOffers: () => void;
  mySessions: any[];
  refetchSessions: () => void;
}

export function PeerHelpTab({
  enrolledClasses,
  user,
  peerHelpClassId,
  setPeerHelpClassId,
  peerHelpTopic,
  setPeerHelpTopic,
  peerHelpDesc,
  setPeerHelpDesc,
  peerHelpSubmitting,
  setPeerHelpSubmitting,
  helperTopic,
  setHelperTopic,
  helperClassId,
  setHelperClassId,
  bookingRequestId,
  setBookingRequestId,
  sessionDate,
  setSessionDate,
  sessionTime,
  setSessionTime,
  sessionSubmitting,
  setSessionSubmitting,
  myPeerRequests,
  refetchMyRequests,
  boardRequests,
  refetchBoard,
  classHelpers,
  myOfferedRequests,
  refetchMyOffers,
  mySessions,
  refetchSessions,
}: PeerHelpTabProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <HandHelping className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Peer Help Board</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ask peers for help, or offer your knowledge to others</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post a Help Request */}
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              Post a Help Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
              <select
                className="w-full text-sm border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 bg-card text-foreground"
                value={peerHelpClassId}
                onChange={e => setPeerHelpClassId(e.target.value)}
              >
                <option value="">Select a class…</option>
                {enrolledClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Topic</label>
              <Input
                placeholder="e.g. Quadratic equations, Python loops…"
                value={peerHelpTopic}
                onChange={e => setPeerHelpTopic(e.target.value.slice(0, 200))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Describe your question</label>
              <Textarea
                placeholder="What exactly are you struggling with? The more detail, the better help you'll get."
                value={peerHelpDesc}
                onChange={e => setPeerHelpDesc(e.target.value.slice(0, 1000))}
                className="text-sm min-h-[90px]"
              />
              <p className="text-[10px] text-slate-400 text-right mt-1">{peerHelpDesc.length}/1000</p>
            </div>
            <Button
              className="w-full"
              disabled={!peerHelpClassId || !peerHelpTopic.trim() || peerHelpDesc.length < 10 || peerHelpSubmitting}
              onClick={async () => {
                setPeerHelpSubmitting(true);
                try {
                  const res = await authFetch('/api/peer-help-requests', {
                    method: 'POST',
                    body: JSON.stringify({ classId: Number(peerHelpClassId), topic: peerHelpTopic.trim(), description: peerHelpDesc.trim() }),
                  }) as any;
                  toast({ title: res.status === 'matched' ? 'Request posted — a peer helper was matched!' : 'Request posted! Waiting for a peer helper.', variant: 'default' });
                  setPeerHelpTopic('');
                  setPeerHelpDesc('');
                  refetchMyRequests();
                  refetchBoard();
                } catch (e: any) {
                  toast({ title: e.message || 'Failed to post request', variant: 'destructive' });
                } finally {
                  setPeerHelpSubmitting(false);
                }
              }}
            >
              {peerHelpSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Post Request
            </Button>
          </CardContent>
        </Card>

        {/* Volunteer as a Helper */}
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Offer to Help Peers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scored well on a topic? Register as a peer helper — you'll be auto-matched when someone needs help.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
              <select
                className="w-full text-sm border border-border/60 dark:border-slate-700 rounded-md px-3 py-2 bg-card text-foreground"
                value={helperClassId}
                onChange={e => setHelperClassId(e.target.value)}
              >
                <option value="">Select a class…</option>
                {enrolledClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Topic you can help with</label>
              <Input
                placeholder="e.g. Algebra, JavaScript promises…"
                value={helperTopic}
                onChange={e => setHelperTopic(e.target.value.slice(0, 200))}
                className="text-sm"
              />
            </div>
            <Button
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              disabled={!helperClassId || !helperTopic.trim()}
              onClick={async () => {
                try {
                  await authFetch('/api/peer-helpers', {
                    method: 'POST',
                    body: JSON.stringify({ classId: Number(helperClassId), topic: helperTopic.trim() }),
                  });
                  toast({ title: 'Registered as peer helper!', description: `You'll be matched when someone needs help with "${helperTopic}".` });
                  setHelperTopic('');
                  queryClient.invalidateQueries({ queryKey: ['/api/peer-helpers', helperClassId] });
                } catch (e: any) {
                  toast({ title: e.message || 'Failed to register', variant: 'destructive' });
                }
              }}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Register as Helper
            </Button>

            {helperClassId && classHelpers.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current helpers in this class:</p>
                {classHelpers.slice(0, 5).map((h: any) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                      {h.helperName?.[0] || '?'}
                    </div>
                    <span className="font-medium">{h.helperName}</span>
                    <span className="text-slate-400">· {h.topic}</span>
                    {h.quizScore && <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-0">{h.quizScore}%</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Help Requests Board */}
      {peerHelpClassId && (
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-500" />
              Open Requests in This Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {boardRequests.filter((r: any) => r.studentId !== user?.id).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No open requests right now — check back later.</p>
            ) : (
              <div className="space-y-3">
                {boardRequests.filter((r: any) => r.studentId !== user?.id).map((req: any) => (
                  <div key={req.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{req.topic}</span>
                        <Badge className="text-[10px] h-4 bg-amber-100 text-amber-700 border-0">open</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">by {req.studentName} · {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs h-8"
                      onClick={async () => {
                        try {
                          await authFetch(`/api/peer-help-requests/${req.id}/offer`, { method: 'POST' });
                          toast({
                            title: 'Offer submitted — pending coordinator approval',
                            description: `${req.studentName} has been notified. Once they book a session, a coordinator must approve it before it begins.`,
                          });
                          refetchBoard();
                          refetchSessions();
                          refetchMyOffers();
                        } catch (e: any) {
                          toast({ title: e.message || 'Failed', variant: 'destructive' });
                        }
                      }}
                    >
                      <HandHelping className="w-3 h-3 mr-1" />
                      Help
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Pending Offers */}
      {myOfferedRequests.length > 0 && (
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HandHelping className="w-4 h-4 text-amber-500" />
              My Pending Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myOfferedRequests.map((req: any) => (
                <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{req.topic}</span>
                      <Badge className="text-[10px] h-4 border-0 bg-amber-100 text-amber-700">
                        Pending coordinator approval
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Requested by {req.studentName} · waiting for them to book a session
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      {myPeerRequests.length > 0 && (
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myPeerRequests.map((req: any) => (
                <div key={req.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{req.topic}</span>
                      <Badge className={`text-[10px] h-4 border-0 ${
                        req.status === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'resolved' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                    {req.status === 'matched' && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> A peer helper has been matched — book a session below!
                      </p>
                    )}
                    {req.status === 'matched' && bookingRequestId === req.id && (
                      <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Propose a date & time for your session</p>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="flex-1 text-xs border border-border/60 dark:border-slate-700 rounded-md px-2 py-1.5 bg-card text-foreground"
                            value={sessionDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setSessionDate(e.target.value)}
                          />
                          <input
                            type="time"
                            className="flex-1 text-xs border border-border/60 dark:border-slate-700 rounded-md px-2 py-1.5 bg-card text-foreground"
                            value={sessionTime}
                            onChange={e => setSessionTime(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700"
                            disabled={!sessionDate || !sessionTime || sessionSubmitting}
                            onClick={async () => {
                              setSessionSubmitting(true);
                              try {
                                await authFetch('/api/peer-sessions', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    requestId: req.id,
                                    helperId: req.helperId,
                                    classId: req.classId,
                                    proposedDate: sessionDate,
                                    proposedTime: sessionTime,
                                  }),
                                });
                                toast({ title: 'Session request sent!', description: 'Waiting for coordinator approval.' });
                                setBookingRequestId(null);
                                setSessionDate('');
                                setSessionTime('');
                                refetchSessions();
                              } catch (e: any) {
                                toast({ title: e.message || 'Failed to book session', variant: 'destructive' });
                              } finally {
                                setSessionSubmitting(false);
                              }
                            }}
                          >
                            {sessionSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CalendarClock className="w-3 h-3 mr-1" />}
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setBookingRequestId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {req.status === 'matched' && bookingRequestId !== req.id && (
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => { setBookingRequestId(req.id); setSessionDate(''); setSessionTime(''); }}
                      >
                        <CalendarClock className="w-3 h-3 mr-1" />
                        Book Session
                      </Button>
                    )}
                    {req.status === 'open' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-slate-400 hover:text-red-500"
                        onClick={async () => {
                          try {
                            await authFetch(`/api/peer-help-requests/${req.id}/close`, { method: 'PATCH' });
                            toast({ title: 'Request closed' });
                            refetchMyRequests();
                          } catch (e: any) {
                            toast({ title: e.message || 'Failed', variant: 'destructive' });
                          }
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Peer Sessions */}
      {mySessions.length > 0 && (
        <Card className="border border-border/60 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-500" />
              My Peer Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mySessions.map((s: any) => {
                const isRequester = s.requesterId === user?.id;
                const peerName = isRequester ? s.helperName : s.requesterName;
                const statusColors: Record<string, string> = {
                  pending_approval: 'bg-amber-100 text-amber-700',
                  approved: 'bg-emerald-100 text-emerald-700',
                  rejected: 'bg-red-100 text-red-700',
                  completed: 'bg-slate-100 text-slate-600',
                  cancelled: 'bg-slate-100 text-slate-500',
                };
                return (
                  <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{s.className}</span>
                        <Badge className={`text-[10px] h-4 border-0 ${statusColors[s.status] || 'bg-slate-100 text-slate-600'}`}>
                          {s.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isRequester ? 'Helper' : 'Helping'}: <span className="font-medium">{peerName}</span>
                      </p>
                      {(s.proposedDate || s.proposedTime) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.proposedDate} {s.proposedTime && `at ${s.proposedTime}`}
                        </p>
                      )}
                      {s.coordinatorNotes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Note: {s.coordinatorNotes}</p>
                      )}
                    </div>
                    {['pending_approval', 'approved'].includes(s.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-xs h-8 text-slate-400 hover:text-red-500"
                        onClick={async () => {
                          try {
                            await authFetch(`/api/peer-sessions/${s.id}/cancel`, { method: 'PATCH' });
                            toast({ title: 'Session cancelled' });
                            refetchSessions();
                          } catch (e: any) {
                            toast({ title: e.message || 'Failed', variant: 'destructive' });
                          }
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
