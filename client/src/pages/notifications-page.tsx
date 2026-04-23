import { useState } from"react";
import { useLocation } from"wouter";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Skeleton } from"@/components/ui/skeleton";
import { useQuery, useMutation } from"@tanstack/react-query";
import { queryClient } from"@/lib/queryClient";
import { authFetch } from"@/lib/api";
import { motion } from"framer-motion";
import {
  Bell,
  CalendarCheck,
  MessageSquare,
  Star,
  Info,
  CheckCheck,
} from"lucide-react";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const filterTypes = ["All","Bookings","Messages","Reviews","System"] as const;
type FilterType = (typeof filterTypes)[number];

function getNotificationIcon(type: string) {
  switch (type) {
    case"booking":
      return <CalendarCheck className="w-5 h-5" />;
    case"message":
      return <MessageSquare className="w-5 h-5" />;
    case"review":
      return <Star className="w-5 h-5" />;
    case"system":
      return <Info className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
}

function filterMatch(notificationType: string, filter: FilterType): boolean {
  if (filter === "All") return true;
  // #150: compare case-insensitively so "Booking" and "booking" both match
  const map: Record<string, string> = {
    Bookings: "booking",
    Messages:"message",
    Reviews:"review",
    System:"system",
  };
  return notificationType.toLowerCase() === map[filter];
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return"Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [, navigate] = useLocation();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit: 50 }],
    queryFn: () => authFetch("/api/notifications?limit=50"),
  });

  const markOneRead = useMutation({
    mutationFn: (id: number) => authFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markOneRead.mutate(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = useMutation({
    mutationFn: () => authFetch("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const filtered = (notifications ?? []).filter((n) => filterMatch(n.type, activeFilter));
  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold" data-testid="text-notifications-title">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {filterTypes.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ?"default" :"outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              data-testid={`button-filter-${filter.toLowerCase()}`}
            >
              {filter}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-display mb-1" data-testid="text-no-notifications">
                No notifications yet
              </h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                {activeFilter !=="All"
                  ?"No notifications match this filter. Try selecting a different category."
                  :"You're all caught up! New notifications will appear here."}
              </p>
              {activeFilter !=="All" && (
                <Button
                  variant="outline"
                  onClick={() => setActiveFilter("All")}
                  data-testid="button-clear-filter"
                >
                  Show All Notifications
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification) => (
              <Card
                key={notification.id}
                className={`${!notification.isRead ?"ring-1 ring-primary/30" :""} ${notification.link ?"cursor-pointer hover:bg-muted/40 transition-colors" :""}`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-md shrink-0 ${
                        notification.isRead
                          ?"bg-muted text-muted-foreground"
                          :"bg-primary/10 text-primary"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3
                          className={`text-sm ${notification.isRead ?"font-normal" :"font-semibold"}`}
                          data-testid={`text-notification-title-${notification.id}`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTimestamp(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="mt-2" data-testid={`badge-unread-${notification.id}`}>
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
