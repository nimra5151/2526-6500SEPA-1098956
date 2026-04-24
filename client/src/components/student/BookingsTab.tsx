import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListItemSkeleton, EmptyState } from '@/components/skeleton-loader';
import { Certificate } from '@/components/certificate';
import { Loader2, Calendar, Clock, Star, XCircle, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { Booking } from '@shared/schema';
import type { UseMutationResult } from '@tanstack/react-query';

interface BookingsTabProps {
  bookings: any[];
  bookingsLoading: boolean;
  user: any;
  reviewingBooking: Booking | null;
  setReviewingBooking: (v: Booking | null) => void;
  reviewRating: number;
  setReviewRating: (v: number) => void;
  reviewComment: string;
  setReviewComment: (v: string) => void;
  cancelBookingMutation: UseMutationResult<any, Error, number, unknown>;
  submitReviewMutation: UseMutationResult<any, Error, any, unknown>;
}

export function BookingsTab({
  bookings,
  bookingsLoading,
  user,
  reviewingBooking,
  setReviewingBooking,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  cancelBookingMutation,
  submitReviewMutation,
}: BookingsTabProps) {
  return (
    <div className="space-y-4">
      {bookingsLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
        </div>
      ) : !Array.isArray(bookings) || bookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings yet" description="Book a class to see your sessions here." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <Card key={b.id} className="border border-border/60 dark:border-slate-800 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-foreground text-sm">{b.classTitle || b.className || `Session #${b.id}`}</h4>
                      <Badge className={
                        b.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : b.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : b.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }>{b.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(b.scheduledDate).toLocaleDateString()}</span>
                      {b.scheduledTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.scheduledTime}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.duration || 60} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === 'completed' && (
                      <>
                        <Certificate
                          studentName={user?.name || 'Student'}
                          courseName={b.classTitle || b.className || 'Completed Course'}
                          completionDate={new Date(b.scheduledDate).toLocaleDateString()}
                        />
                        <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 h-8 text-xs"
                          onClick={() => { setReviewingBooking(b); setReviewRating(5); setReviewComment(''); }}>
                          <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Rate
                        </Button>
                      </>
                    )}
                    {(b.status === 'confirmed' || b.status === 'pending') && (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 text-xs"
                        onClick={() => cancelBookingMutation.mutate(b.id)} disabled={cancelBookingMutation.isPending}>
                        {cancelBookingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><XCircle className="w-3.5 h-3.5 mr-1" />Cancel</>}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReviewingBooking(null)}>
          <div role="dialog" aria-modal="true" aria-label="Rate Your Session" className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border/60 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 dark:border-slate-800">
              <h3 className="text-base font-semibold text-foreground">Rate Your Session</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setReviewingBooking(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Session: <span className="font-medium text-foreground">{(reviewingBooking as any).classTitle || (reviewingBooking as any).className || `Session #${reviewingBooking.id}`}</span></p>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wide">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)}
                      className={`w-9 h-9 rounded-lg text-lg transition-colors ${n <= reviewRating ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">{reviewRating}/5</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Comment <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <Textarea placeholder="Share your experience with this tutor..." rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setReviewingBooking(null)}>Skip</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={submitReviewMutation.isPending}
                onClick={() => submitReviewMutation.mutate({
                  revieweeId: reviewingBooking.tutorId,
                  classId: reviewingBooking.classId,
                  rating: reviewRating,
                  comment: reviewComment,
                })}
              >
                {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
