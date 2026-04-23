import { useQuery, useMutation } from"@tanstack/react-query";
import { authFetch } from"@/lib/api";
import { queryClient } from"@/lib/queryClient";
import { Link } from"wouter";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { Skeleton } from"@/components/ui/skeleton";
import { useToast } from"@/hooks/use-toast";
import { motion } from"framer-motion";
import {
  Calendar,
  Clock,
  X,
  Star,
  BookOpen,
  Filter,
  CalendarDays,
  CheckCircle,
  XCircle,
  ArrowRight,
  Video,
} from"lucide-react";
import { useState } from"react";
import { useAuth } from"@/lib/auth";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color:"bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock, label:"Pending" },
  confirmed: { color:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle, label:"Confirmed" },
  completed: { color:"bg-blue-500/10 text-blue-400 border-blue-500/20", icon: CheckCircle, label:"Completed" },
  cancelled: { color:"bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle, label:"Cancelled" },
"no-show": { color:"bg-gray-500/10 text-gray-400 border-gray-500/20", icon: XCircle, label:"No Show" },
};

type FilterTab ="all" |"upcoming" |"completed" |"cancelled";

function BookingCard({
  booking,
  onCancel,
  onReview,
  isCancelling,
}: {
  booking: any;
  onCancel: (id: number) => void;
  onReview: (booking: any) => void;
  isCancelling: boolean;
}) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="card-hover-lift" data-testid={`card-booking-${booking.id}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <Link href={`/classes/${booking.classId}`}>
              <h3 className="font-semibold text-sm cursor-pointer hover:text-[#667EEA] transition-colors" data-testid={`text-booking-title-${booking.id}`}>
                {booking.classTitle ||"Class"}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1.5">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[10px] bg-primary text-white">
                  {(booking.tutorName || booking.studentName ||"U")[0]}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground">
                with {booking.tutorName || booking.studentName ||"User"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${status.color}`}>
            <StatusIcon className="w-3 h-3" /> {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#667EEA]" />
            {booking.scheduledDate
              ? new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                  weekday:"short",
                  month:"short",
                  day:"numeric",
                })
              :"TBD"}
          </span>
          {booking.scheduledTime && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> {booking.scheduledTime}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> {booking.duration || 60}min
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(booking.status ==="pending" || booking.status ==="confirmed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(booking.id)}
              disabled={isCancelling}
              className="text-red-400 border-red-500/20"
              data-testid={`button-cancel-${booking.id}`}
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
          )}
          {booking.status ==="confirmed" && (
            <Link href={`/live-class/${booking.classId}`}>
              <Button
                size="sm"
                className="neon-btn bg-primary text-white border-0"
                data-testid={`button-join-${booking.id}`}
              >
                <Video className="w-3.5 h-3.5" /> Join Class
              </Button>
            </Link>
          )}
          {booking.status ==="completed" && !booking.hasReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReview(booking)}
              data-testid={`button-review-${booking.id}`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" /> Leave Review
            </Button>
          )}
          <Link href={`/classes/${booking.classId}`}>
            <Button variant="ghost" size="sm" data-testid={`button-view-class-${booking.id}`}>
              View Class <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: () => authFetch("/api/bookings"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/bookings/${id}/cancel`, { method:"PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title:"Booking cancelled successfully" });
    },
    onError: (err: any) => toast({ title: err.message, variant:"destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      authFetch("/api/reviews", {
        method:"POST",
        body: JSON.stringify({
          reviewerId: user?.id,
          revieweeId: reviewBooking.tutorId,
          classId: reviewBooking.classId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title:"Review submitted!" });
      setReviewBooking(null);
      setReviewComment("");
      setReviewRating(5);
    },
    onError: (err: any) => toast({ title: err.message, variant:"destructive" }),
  });

  const allBookings = bookings || [];
  const upcoming = allBookings.filter((b: any) => ["pending","confirmed"].includes(b.status));
  const completed = allBookings.filter((b: any) => b.status ==="completed");
  const cancelled = allBookings.filter((b: any) => ["cancelled","no-show"].includes(b.status));

  const filteredBookings =
    activeTab ==="upcoming" ? upcoming :
    activeTab ==="completed" ? completed :
    activeTab ==="cancelled" ? cancelled :
    allBookings;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key:"all", label:"All", count: allBookings.length },
    { key:"upcoming", label:"Upcoming", count: upcoming.length },
    { key:"completed", label:"Completed", count: completed.length },
    { key:"cancelled", label:"Cancelled", count: cancelled.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
        <motion.div variants={fadeIn}>
          <div className="rounded-md bg-gradient-to-r from-[#667EEA] to-[#764BA2] p-6 md:p-8">
            <div className="relative">
              <div className="absolute inset-0 dot-pattern opacity-30" />
              <div className="relative z-10">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white" data-testid="text-bookings">
                  My Bookings
                </h1>
                <p className="text-white/80 mt-1 text-sm">
                  Track your upcoming and past tutoring sessions
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeIn}>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ?"default" :"outline"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={activeTab === tab.key ?"bg-primary text-white border-0" :""}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeIn}>
          {isLoading ? (
            <BookingSkeleton />
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-4">
              {filteredBookings.map((b: any) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={(id) => { if (!window.confirm("Cancel this booking?")) return; cancelMutation.mutate(id); }}
                  onReview={(booking) => { setReviewBooking(booking); setReviewRating(5); setReviewComment(""); }}
                  isCancelling={cancelMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <Card className="">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4 opacity-60">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold font-display mb-1" data-testid="text-no-bookings">
                  No {activeTab !=="all" ? activeTab :""} bookings yet
                </h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                  {activeTab ==="upcoming"
                    ?"You don't have any upcoming sessions. Browse classes to book one."
                    :"Your booking history will appear here."}
                </p>
                <Link href="/classes">
                  <Button className="bg-primary text-white border-0" data-testid="button-browse-classes">
                    <BookOpen className="w-4 h-4" /> Browse Classes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {reviewBooking && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setReviewBooking(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <h3 className="font-semibold font-display text-lg">Leave a Review</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">for {reviewBooking.classTitle}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setReviewRating(i + 1)}
                        data-testid={`button-star-${i + 1}`}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            i < reviewRating ?"text-amber-400 fill-amber-400" :"text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full p-3 rounded-md border bg-background text-sm resize-none min-h-[100px] focus:ring-1 focus:ring-[#667EEA] focus:border-[#667EEA] outline-none transition-colors"
                    placeholder="Share your experience..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    data-testid="input-review-comment"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setReviewBooking(null)}
                      data-testid="button-cancel-review"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => reviewMutation.mutate()}
                      disabled={reviewMutation.isPending || reviewRating < 1 || reviewRating > 5}
                      className="flex-1 bg-primary text-white border-0"
                      data-testid="button-submit-review"
                    >
                      Submit Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
