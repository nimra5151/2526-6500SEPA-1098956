import { useState, useEffect } from"react";
import { useQuery, useMutation } from"@tanstack/react-query";
import { useSearch, useLocation } from"wouter";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { useTheme } from"@/lib/theme";
import { queryClient } from"@/lib/queryClient";
import { useToast } from"@/hooks/use-toast";
import { motion } from"framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Label } from"@/components/ui/label";
import { Switch } from"@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from"@/components/ui/select";
import { Loader2, User, Bell, Shield, Palette, Save, Lock, Eye, MessageSquare, Sun, Moon, Globe, Play, Calendar, LogOut, Monitor } from"lucide-react";
import type { UserSettings } from"@shared/schema";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LANG_NAME_TO_CODE, LANG_CODE_TO_NAME } from "@/i18n";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
type Day = typeof DAYS[number];

interface DaySlot { enabled: boolean; start: string; end: string }
type WeekSchedule = Record<Day, DaySlot>;

const defaultSchedule = (): WeekSchedule =>
  Object.fromEntries(DAYS.map((d) => [d, { enabled: false, start:"09:00", end:"17:00" }])) as WeekSchedule;

function getTabs(t: (key: string) => string) {
  return [
    { id:"account", label: t("settings.account"), icon: User },
    { id:"notifications", label: t("settings.notifications"), icon: Bell },
    { id:"privacy", label: t("settings.privacySecurity"), icon: Shield },
    { id:"appearance", label: t("settings.appearance"), icon: Palette },
  ] as const;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setTheme: applyTheme } = useTheme();
  const search = useSearch();
  const tabFromUrl = new URLSearchParams(search).get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "account");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);
  const [reviewNotifications, setReviewNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [messagingPreference, setMessagingPreference] = useState("everyone");
  const [showProfilePublicly, setShowProfilePublicly] = useState(true);

  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const { t, i18n } = useTranslation();
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [availability, setAvailability] = useState<WeekSchedule>(defaultSchedule());

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: () => authFetch("/api/settings"),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (user) {
      setName(user.name ||"");
      setEmail(user.email ||"");
      setBio(user.bio ||"");
      setAvatarUrl(user.avatar ||"");
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.emailNotifications ?? true);
      setPushNotifications(settings.pushNotifications ?? true);
      setBookingReminders(settings.bookingReminders ?? true);
      setMessageAlerts(settings.messageAlerts ?? true);
      setReviewNotifications(settings.reviewNotifications ?? true);
      setMarketingEmails(settings.marketingEmails ?? false);
      setMessagingPreference(settings.messagingPreference ||"everyone");
      setShowProfilePublicly(settings.showProfilePublicly ?? true);
      setTheme(settings.theme ||"light");
      const rawLang = settings.language || "en";
      setLanguage(LANG_NAME_TO_CODE[rawLang] || rawLang);
      setAutoplayVideos(settings.autoplayVideos ?? true);
      if ((settings as any).availabilitySchedule) {
        try {
          const parsed = JSON.parse((settings as any).availabilitySchedule);
          setAvailability({ ...defaultSchedule(), ...parsed });
        } catch {}
      }
    }
  }, [settings]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      return authFetch(`/api/users/${user.id}`, {
        method:"PATCH",
        body: JSON.stringify({ name, email, bio, avatar: avatarUrl || null }),
      });
    },
    onSuccess: (_data, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", String(user?.id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      const emailChanged = email !== user?.email;
      toast({
        title: t("settings.profileUpdated"),
        description: emailChanged
          ? "Profile saved. A verification email has been sent to your new address — please verify it to keep access."
          : "Your profile has been saved successfully.",
      });
    },
    onError: (err: any) => {
      toast({ title:"Error", description: err.message ||"Failed to update profile.", variant:"destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
      // #148: require complexity — min 8 chars, uppercase, number
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (!/[A-Z]/.test(newPassword)) throw new Error("Password must contain at least one uppercase letter.");
      if (!/[0-9]/.test(newPassword)) throw new Error("Password must contain at least one number.");
      return authFetch(`/api/users/${user.id}/change-password`, {
        method:"POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: t("settings.passwordChanged"), description: t("settings.passwordChangedDesc") });
    },
    onError: (err: any) => {
      toast({ title:"Error", description: err.message ||"Failed to change password.", variant:"destructive" });
    },
  });

  const { data: loginSessions = [] } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authFetch('/api/auth/sessions'),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authFetch('/api/auth/logout-all', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'All sessions invalidated', description: 'You have been logged out of all devices.' });
      logout();
      queryClient.clear();
      setLocation('/login');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to log out all sessions.', variant: 'destructive' });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async () => {
      return authFetch("/api/settings", {
        method:"PUT",
        body: JSON.stringify({
          emailNotifications,
          pushNotifications,
          bookingReminders,
          messageAlerts,
          reviewNotifications,
          marketingEmails,
          messagingPreference,
          showProfilePublicly,
          theme,
          language: LANG_CODE_TO_NAME[language] || language,
          autoplayVideos,
          availabilitySchedule: JSON.stringify(availability),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      applyTheme(theme as "light" | "dark");
      toast({ title: t("settings.settingsSaved"), description: t("settings.settingsSavedDesc") });
    },
    onError: (err: any) => {
      toast({ title:"Error", description: err.message ||"Failed to save settings.", variant:"destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-settings" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-1"
          data-testid="heading-settings"
        >
          {t("nav.settings")}
        </h1>
        <p className="text-muted-foreground mb-6">{t("settings.profileDesc")}</p>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1" data-testid="tabs-settings">
          {[...getTabs(t), ...(user?.role ==="tutor" ? [{ id:"availability", label: t("settings.availability"), icon: Calendar }] : [])].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ?"text-foreground"
                    :"text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-[#667EEA] to-[#764BA2]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeTab ==="account" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="">
              <CardHeader>
                <CardTitle>{t("settings.profileInfo")}</CardTitle>
                <CardDescription>{t("settings.profileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("settings.fullName")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("settings.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                      placeholder="you@example.com"
                      data-testid="input-email"
                    />
                    <p className="text-sm text-muted-foreground">
                      Email address cannot be changed. Contact support if needed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">{t("settings.bio")}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className="resize-none"
                    rows={3}
                    data-testid="input-bio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar-url">{t("settings.avatarUrl")}</Label>
                  <Input
                    id="avatar-url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    data-testid="input-avatar-url"
                  />
                  {/* #149: validate URL format and show preview */}
                  {avatarUrl && (() => {
                    try { new URL(avatarUrl); return true; } catch { return false; }
                  })() ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      width={64}
                      height={64}
                      loading="lazy"
                      className="w-16 h-16 rounded-full object-cover border mt-1"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : avatarUrl ? (
                    <p className="text-xs text-destructive">Enter a valid URL (must start with https://)</p>
                  ) : null}
                </div>
                <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending} data-testid="button-save-profile">
                  {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t("settings.saveProfile")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab ==="notifications" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="">
              <CardHeader>
                <CardTitle>{t("settings.notifications")}</CardTitle>
                <CardDescription>{t("settings.emailNotificationsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: t("settings.emailNotifications"), desc: t("settings.emailNotificationsDesc"), checked: emailNotifications, onChange: setEmailNotifications, testId:"switch-email-notifications" },
                  { label: t("settings.pushNotifications"), desc: t("settings.pushNotificationsDesc"), checked: pushNotifications, onChange: setPushNotifications, testId:"switch-push-notifications" },
                  { label: t("settings.bookingReminders"), desc: t("settings.bookingRemindersDesc"), checked: bookingReminders, onChange: setBookingReminders, testId:"switch-booking-reminders" },
                  { label: t("settings.messageAlerts"), desc: t("settings.messageAlertsDesc"), checked: messageAlerts, onChange: setMessageAlerts, testId:"switch-message-alerts" },
                  { label: t("settings.reviewNotifications"), desc: t("settings.reviewNotificationsDesc"), checked: reviewNotifications, onChange: setReviewNotifications, testId:"switch-review-notifications" },
                  { label: t("settings.marketingEmails"), desc: t("settings.marketingEmailsDesc"), checked: marketingEmails, onChange: setMarketingEmails, testId:"switch-marketing-emails" },
                ].map((item) => (
                  <div key={item.testId} className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="font-medium">{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={item.checked}
                      onCheckedChange={item.onChange}
                      data-testid={item.testId}
                    />
                  </div>
                ))}
                <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} data-testid="button-save-notifications">
                  {settingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t("settings.saveSettings")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab ==="privacy" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="">
              <CardHeader>
                <CardTitle>{t("settings.changePassword")}</CardTitle>
                <CardDescription>{t("settings.profileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t("settings.currentPassword")}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("settings.confirmPassword")}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => passwordMutation.mutate()}
                  disabled={passwordMutation.isPending || !currentPassword || !newPassword}
                  data-testid="button-change-password"
                >
                  {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {t("settings.updatePassword")}
                </Button>
              </CardContent>
            </Card>

            <Card className="">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your visibility and messaging preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="font-medium">{t("settings.showProfilePublicly")}</Label>
                    <p className="text-sm text-muted-foreground">{t("settings.showProfilePubliclyDesc")}</p>
                  </div>
                  <Switch
                    checked={showProfilePublicly}
                    onCheckedChange={setShowProfilePublicly}
                    data-testid="switch-show-profile-publicly"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">{t("settings.messagingPreference")}</Label>
                  <p className="text-sm text-muted-foreground mb-2">{t("settings.messagingPreference")}</p>
                  <Select value={messagingPreference} onValueChange={setMessagingPreference}>
                    <SelectTrigger data-testid="select-messaging-preference">
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">{t("settings.everyone")}</SelectItem>
                      <SelectItem value="tutors-students">Tutors & Students Only</SelectItem>
                      <SelectItem value="no-one">No One</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} data-testid="button-save-privacy">
                  {settingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t("settings.saveSettings")}
                </Button>
              </CardContent>
            </Card>

            {/* Security — Active Sessions (Phase 3) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  {t("settings.activeSessions")}
                </CardTitle>
                <CardDescription>Recent logins to your account. If you see anything unfamiliar, change your password and log out all devices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(loginSessions as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No login history found.</p>
                ) : (
                  <div className="space-y-2">
                    {(loginSessions as any[]).map((session: any) => (
                      <div key={session.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full ${session.isCurrent ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <Monitor className={`w-3.5 h-3.5 ${session.isCurrent ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                              {/* #147: use isCurrent from API instead of array index */}
                              {session.isCurrent && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">Current</span>}
                              IP: {session.ip || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{session.userAgent ? session.userAgent.slice(0, 60) + (session.userAgent.length > 60 ? '…' : '') : 'Unknown device'}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{session.createdAt ? new Date(session.createdAt).toLocaleString() : ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t dark:border-slate-700">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={logoutAllMutation.isPending}
                    onClick={() => {
                      if (confirm('Log out of all devices? You will need to log in again on this device.')) {
                        logoutAllMutation.mutate();
                      }
                    }}
                  >
                    {logoutAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                    {t("settings.logoutAll")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab ==="appearance" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="">
              <CardHeader>
                <CardTitle>{t("settings.appearance")}</CardTitle>
                <CardDescription>{t("settings.autoplayVideosDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-medium">{t("settings.theme")}</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger data-testid="select-theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t("settings.light")}</SelectItem>
                        <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">{t("settings.language")}</Label>
                    <Select value={language} onValueChange={(val) => { setLanguage(val); i18n.changeLanguage(val); }}>
                      <SelectTrigger data-testid="select-language">
                        <SelectValue placeholder={t("settings.selectLanguage")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="font-medium">{t("settings.autoplayVideos")}</Label>
                    <p className="text-sm text-muted-foreground">{t("settings.autoplayVideosDesc")}</p>
                  </div>
                  <Switch
                    checked={autoplayVideos}
                    onCheckedChange={setAutoplayVideos}
                    data-testid="switch-autoplay-videos"
                  />
                </div>
                <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} data-testid="button-save-appearance">
                  {settingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t("settings.saveSettings")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {activeTab ==="availability" && user?.role ==="tutor" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Weekly Availability
                </CardTitle>
                <CardDescription>Set the days and hours when you're available for students to book sessions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map((day) => {
                  const slot = availability[day];
                  return (
                    <div key={day} className="flex items-center gap-3 p-3 rounded-lg border bg-background/50">
                      <Switch
                        checked={slot.enabled}
                        onCheckedChange={(v) =>
                          setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], enabled: v } }))
                        }
                        data-testid={`switch-avail-${day}`}
                      />
                      <span className="w-24 text-sm font-medium capitalize">{day}</span>
                      {slot.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))
                            }
                            className="w-32 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))
                            }
                            className="w-32 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground flex-1">Not available</span>
                      )}
                    </div>
                  );
                })}
                <Button
                  className="mt-4"
                  onClick={() => settingsMutation.mutate()}
                  disabled={settingsMutation.isPending}
                  data-testid="button-save-availability"
                >
                  {settingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t("settings.saveSettings")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
