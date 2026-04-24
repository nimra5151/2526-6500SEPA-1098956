import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Bell, CheckCircle } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function SendNotification() {
  const { toast } = useToast();
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    recipients: 'all',
    type: 'info',
    orphanageName: '',
  });

  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  // Fetch recent notifications for the sidebar
  const { data: recentNotifications } = useQuery({
    queryKey: ['admin', 'notifications', 'recent'],
    queryFn: () => authFetch("/api/admin/notifications?limit=5"),
  });

  const typeToDbType: Record<string, string> = {
    info: "system",
    success: "system",
    warning: "reminder",
    urgent: "system",
  };

  const sendNotification = async () => {
    setSending(true);
    setSentCount(null);
    try {
      const recipientsValue = notification.recipients ==="orphanage"
        ? `orphanage:${notification.orphanageName}`
        : notification.recipients;
      const data = await authFetch("/api/admin/notify", {
        method:"POST",
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          recipients: recipientsValue,
          type: typeToDbType[notification.type] ?? "system",
        }),
      });
      setSentCount(data.sent);
      // #91: report partial failures so admin knows delivery wasn't 100%
      if (data.failed && data.failed > 0) {
        toast({ title: `Sent to ${data.sent} user${data.sent !== 1 ? "s" : ""}, ${data.failed} failed`, variant: "destructive" });
      } else {
        toast({ title: `Notification sent to ${data.sent} user${data.sent !== 1 ? "s" : ""}!` });
      }
      setNotification((n) => ({ ...n, title:"", message:"" }));
    } catch (err: any) {
      toast({ title: err.message ||"Failed to send notification", variant:"destructive" });
    } finally {
      setSending(false);
    }
  };

  const typeStyles: Record<string, { active: string; icon: string }> = {
    info: {
      active: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
      icon: 'bg-blue-100 dark:bg-blue-950/20'
    },
    success: {
      active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
      icon: 'bg-emerald-100 dark:bg-emerald-950/20'
    },
    warning: {
      active: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20',
      icon: 'bg-amber-100 dark:bg-amber-950/20'
    },
    urgent: {
      active: 'border-red-500 bg-red-50 dark:bg-red-950/20',
      icon: 'bg-red-100 dark:bg-red-950/20'
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Send Notification
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Notify students about important updates and announcements
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Notification Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Notification Type</Label>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {[
                      { value: 'info', label: 'Info' },
                      { value: 'success', label: 'Success' },
                      { value: 'warning', label: 'Warning' },
                      { value: 'urgent', label: 'Urgent (System)' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setNotification({ ...notification, type: type.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          notification.type === type.value
                            ? typeStyles[type.value].active
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Recipients</Label>
                  <select
                    value={notification.recipients}
                    onChange={(e) => setNotification({ ...notification, recipients: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="all">All Users</option>
                    <option value="students">All Students</option>
                    <option value="tutors">All Tutors</option>
                    <option value="orphanage">Specific Orphanage</option>
                  </select>
                  {notification.recipients ==="orphanage" && (
                    <Input
                      value={notification.orphanageName}
                      onChange={(e) => setNotification({ ...notification, orphanageName: e.target.value })}
                      placeholder="Enter orphanage or organization name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label>Title *</Label>
                  <Input
                    value={notification.title}
                    onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                    placeholder="e.g., New Assignment Available"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Message *</Label>
                  <Textarea
                    value={notification.message}
                    onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                    placeholder="Write your notification message..."
                    rows={5}
                    className="mt-2"
                  />
                </div>

                {sentCount !== null && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Sent to {sentCount} user{sentCount !== 1 ?"s" :""} successfully.
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={sendNotification}
                    disabled={sending || !notification.title || !notification.message || (notification.recipients ==="orphanage" && !notification.orphanageName)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {sending ? (
                      <>
                        <Bell className="w-4 h-4 mr-2 animate-pulse" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${typeStyles[notification.type]?.icon || 'bg-blue-100 dark:bg-blue-950/20'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">
                        {notification.title || 'Notification Title'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {notification.message || 'Your notification message will appear here...'}
                      </p>
                      <span className="text-xs text-slate-500 mt-2 block">
                        Just now
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {recentNotifications?.slice(0, 5).map((notif: any, index: number) => (
                  <div key={index} className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-white">{notif.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {notif.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                      <span>{notif.recipients || 'All'} recipients</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-sm text-slate-500 text-center py-4">
                    No recent notifications
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
