import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useEffect, useState, Suspense } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/api";
import { Home as HomeIcon, BookOpen as BookOpenIcon, MessageSquare as MessageSquareIcon, User as UserIcon, LayoutDashboard as LayoutDashboardIcon, Calendar as CalendarIcon } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeleton-loader";
// Lazy loaded components for code splitting
const Home = React.lazy(() => import("@/pages/home"));
const Login = React.lazy(() => import("@/pages/login"));
const Signup = React.lazy(() => import("@/pages/signup"));
const Dashboard = React.lazy(() => import("@/pages/dashboard"));
const BrowseClasses = React.lazy(() => import("@/pages/browse-classes"));
const ClassDetail = React.lazy(() => import("@/pages/class-detail"));
const CreateClass = React.lazy(() => import("@/pages/create-class"));
const MyClasses = React.lazy(() => import("@/pages/my-classes"));
const Bookings = React.lazy(() => import("@/pages/bookings"));
const Profile = React.lazy(() => import("@/pages/profile"));
const Messages = React.lazy(() => import("@/pages/messages"));
const About = React.lazy(() => import("@/pages/about"));
const Contact = React.lazy(() => import("@/pages/contact"));
const Settings = React.lazy(() => import("@/pages/settings"));
const Safeguarding = React.lazy(() => import("@/pages/safeguarding"));
const Report = React.lazy(() => import("@/pages/report"));
const Privacy = React.lazy(() => import("@/pages/privacy"));
const Terms = React.lazy(() => import("@/pages/terms"));
const NotificationsPage = React.lazy(() => import("@/pages/notifications-page"));
const HelpCenter = React.lazy(() => import("@/pages/help-center"));
const AdminDashboard = React.lazy(() => import("@/pages/admin-dashboard"));
const StudentDashboard = React.lazy(() => import("@/pages/student-dashboard"));
const TeacherDashboard = React.lazy(() => import("@/pages/teacher-dashboard"));
const TeacherClasses = React.lazy(() => import("@/pages/teacher-classes"));
const CreateLesson = React.lazy(() => import("@/pages/create-lesson"));
const CreateQuiz = React.lazy(() => import("@/pages/create-quiz"));
const SendNotification = React.lazy(() => import("@/pages/send-notification"));
const LiveClass = React.lazy(() => import("@/pages/live-class"));
const CreateAssignment = React.lazy(() => import("@/pages/create-assignment"));
const ContactAdmin = React.lazy(() => import("@/pages/contact-admin"));
const TakeQuiz = React.lazy(() => import("@/pages/take-quiz"));
const SubmitAssignment = React.lazy(() => import("@/pages/submit-assignment"));
const VerifyCertificate = React.lazy(() => import("@/pages/verify-certificate"));
const VideoPlayer = React.lazy(() => import("@/pages/video-player"));
const VerifyEmail = React.lazy(() => import("@/pages/verify-email"));
const ForgotPassword = React.lazy(() => import("@/pages/forgot-password"));
const ResetPassword = React.lazy(() => import("@/pages/reset-password"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const SearchPage = React.lazy(() => import("@/pages/search"));
const Leaderboard = React.lazy(() => import("@/pages/leaderboard"));
const ClassProgress = React.lazy(() => import("@/pages/class-progress"));
import { Loader2, Keyboard } from "lucide-react";
import { ErrorBoundary } from "@/components/skeleton-loader";
import { useKeyboardShortcuts, SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { BackToTop } from "@/components/back-to-top";
import { OfflineBanner } from "@/components/offline-banner";
import { useTranslation } from "react-i18next";
import { LANG_NAME_TO_CODE, SUPPORTED_LANGUAGES } from "@/i18n";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function RoleRoute({ component: Component, role }: { component: React.ComponentType; role: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  if (user.role !== role) {
    return <Redirect to="/dashboard" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
        <Route path="/classes" component={BrowseClasses} />
        <Route path="/classes/create">{() => <ProtectedRoute component={CreateClass} />}</Route>
        <Route path="/classes/:id" component={ClassDetail} />
        <Route path="/my-classes">{() => <ProtectedRoute component={MyClasses} />}</Route>
        <Route path="/bookings">{() => <ProtectedRoute component={Bookings} />}</Route>
        <Route path="/profile/:id" component={Profile} />
        <Route path="/messages">{() => <ProtectedRoute component={Messages} />}</Route>
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
        <Route path="/safeguarding" component={Safeguarding} />
        <Route path="/report">{() => <ProtectedRoute component={Report} />}</Route>{/* #141: require auth to prevent spam */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/notifications">{() => <ProtectedRoute component={NotificationsPage} />}</Route>
        <Route path="/help-center" component={HelpCenter} />
        <Route path="/search">{() => <ProtectedRoute component={SearchPage} />}</Route>
        <Route path="/leaderboard">{() => <ProtectedRoute component={Leaderboard} />}</Route>
        <Route path="/classes/:id/progress">{() => <ProtectedRoute component={ClassProgress} />}</Route>
        <Route path="/student-dashboard">{() => <ProtectedRoute component={StudentDashboard} />}</Route>
        <Route path="/teacher-dashboard">{() => <RoleRoute component={TeacherDashboard} role="tutor" />}</Route>
        <Route path="/teacher-classes">{() => <RoleRoute component={TeacherClasses} role="tutor" />}</Route>
        <Route path="/create-lesson">{() => <RoleRoute component={CreateLesson} role="tutor" />}</Route>
        <Route path="/create-quiz">{() => <RoleRoute component={CreateQuiz} role="tutor" />}</Route>
        <Route path="/send-notification">{() => <RoleRoute component={SendNotification} role="coordinator" />}</Route>
        <Route path="/live-class/:id">{() => <ProtectedRoute component={LiveClass} />}</Route>
        <Route path="/create-assignment">{() => <RoleRoute component={CreateAssignment} role="tutor" />}</Route>
        <Route path="/admin">{() => <RoleRoute component={AdminDashboard} role="coordinator" />}</Route>
        <Route path="/contact-admin">{() => <ProtectedRoute component={ContactAdmin} />}</Route>
        <Route path="/take-quiz/:id">{() => <ProtectedRoute component={TakeQuiz} />}</Route>
        <Route path="/submit-assignment/:id">{() => <ProtectedRoute component={SubmitAssignment} />}</Route>
        <Route path="/verify/:code" component={VerifyCertificate} />
        <Route path="/video/:id">{() => <ProtectedRoute component={VideoPlayer} />}</Route>
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Mobile bottom navigation bar (visible only on small screens)
function MobileBottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  const getLinks = () => {
    if (!user) {
      return [
        { href:"/", icon: HomeIcon, label: t("mobileNav.home") },
        { href:"/classes", icon: BookOpenIcon, label: t("mobileNav.classes") },
      ];
    }
    if (user.role ==="coordinator") {
      return [
        { href:"/admin", icon: LayoutDashboardIcon, label: t("mobileNav.dashboard") },
        { href:"/classes", icon: BookOpenIcon, label: t("mobileNav.classes") },
        { href:"/messages", icon: MessageSquareIcon, label: t("mobileNav.messages") },
        { href: `/profile/${user.id}`, icon: UserIcon, label: t("mobileNav.profile") },
      ];
    }
    if (user.role ==="tutor") {
      return [
        { href:"/teacher-dashboard", icon: LayoutDashboardIcon, label: t("mobileNav.dashboard") },
        { href:"/teacher-classes", icon: BookOpenIcon, label: t("mobileNav.classes") },
        { href:"/bookings", icon: CalendarIcon, label: t("mobileNav.bookings") },
        { href:"/messages", icon: MessageSquareIcon, label: t("mobileNav.messages") },
      ];
    }
    return [
      { href:"/student-dashboard", icon: LayoutDashboardIcon, label: t("mobileNav.dashboard") },
      { href:"/classes", icon: BookOpenIcon, label: t("mobileNav.classes") },
      { href:"/messages", icon: MessageSquareIcon, label: t("mobileNav.messages") },
      { href: `/profile/${user.id}`, icon: UserIcon, label: t("mobileNav.profile") },
    ];
  };

  const links = getLinks();

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-[9998] bg-background/95 backdrop-blur-xl border-t border-white/10 flex items-stretch">
      {links.map((link) => {
        const active = location === link.href;
        return (
          <Link key={link.href} href={link.href} className="flex-1">
            <div className={`flex flex-col items-center justify-center py-2 gap-0.5 w-full h-full ${active ?"text-primary" :"text-muted-foreground"}`}>
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

// Syncs the DB-stored theme setting to ThemeProvider after login
function ThemeSync() {
  const { user, token } = useAuth();
  const { setTheme } = useTheme();

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => authFetch("/api/settings"),
    enabled: !!token && !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings && (settings as any).theme) {
      const t = (settings as any).theme as string;
      if (t ==="light" || t ==="dark") {
        setTheme(t);
      }
    }
  }, [settings, setTheme]);

  return null;
}

// Syncs the DB-stored language setting to i18next + sets RTL for Urdu
function LanguageSync() {
  const { user, token } = useAuth();
  const { i18n } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => authFetch("/api/settings"),
    enabled: !!token && !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings && (settings as any).language) {
      const raw = (settings as any).language as string;
      const code = LANG_NAME_TO_CODE[raw] || "en";
      if (i18n.language !== code) {
        i18n.changeLanguage(code);
      }
    }
  }, [settings, i18n]);

  // Handle RTL for Urdu
  useEffect(() => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);
    const dir = lang?.dir || "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", i18n.language);
  }, [i18n.language]);

  return null;
}

// #175: keyboard shortcuts help overlay
function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("show-shortcuts-help", handler);
    return () => window.removeEventListener("show-shortcuts-help", handler);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base">Keyboard Shortcuts</h2>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-0.5 rounded border bg-muted font-mono text-xs">{s.keys}</kbd>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-4 text-center">Press anywhere to close</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [location] = useLocation();
  useKeyboardShortcuts(); // #175
  const hideChrome = location ==="/login" || location ==="/signup" || location.startsWith("/live-class/") || location ==="/forgot-password" || location ==="/reset-password";

  // Handle Google OAuth redirect: pick up ?oauth_token= from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");
    if (oauthToken) {
      localStorage.setItem("token", oauthToken);
      // Remove the token from URL without reload
      window.history.replaceState({}, "", window.location.pathname);
      // Force re-fetch of user
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ThemeSync />
      <LanguageSync />
      <OfflineBanner />
      {!hideChrome && <Navbar />}
      <main id="main-content" className={`flex-1 ${!hideChrome ? "pb-16 md:pb-0" : ""}`}>
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Router />
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
      {!hideChrome && <Footer />}
      {!hideChrome && <MobileBottomNav />}
      <ShortcutsOverlay />
      <BackToTop />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
