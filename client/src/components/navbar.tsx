import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen, Menu, X, User, LogOut, LayoutDashboard, MessageSquare,
  Calendar, Settings, Sun, Moon, Bell, AlertCircle, Star, Shield,
  Plus, FileText, Award, PhoneCall, Bookmark, Search,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "booking": return <Bell className="w-4 h-4" />;
    case "message": return <MessageSquare className="w-4 h-4" />;
    case "review": return <Star className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
}

function NotificationBell() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification") {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          }
        } catch (e) { console.warn("WS message parse error:", e); }
      };
      ws.onerror = (err) => { console.error("Notification WS error:", err); };
      ws.onclose = () => {
        if (retriesRef.current < 10) {
          setTimeout(connect, Math.min(3000 * Math.pow(2, retriesRef.current), 30000));
          retriesRef.current++;
        }
      };
    };

    connect();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [token]);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => authFetch("/api/notifications/unread-count"),
    enabled: !!token,
  });

  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications", { limit: 5 }],
    queryFn: () => authFetch("/api/notifications?limit=5"),
  });

  const markAllRead = useMutation({
    mutationFn: () => authFetch("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notification-bell" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium px-1 animate-bounce" data-testid="text-unread-count">
              {unreadCount > 99 ?"99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 rounded-xl p-1.5">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">{t("nav.notifications")}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} data-testid="button-mark-all-read">
              {t("nav.markAllRead")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
        {notifications && notifications.length > 0 ? (
          notifications.map((n: any) => (
            <DropdownMenuItem key={n.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" data-testid={`notification-item-${n.id}`}>
              <div className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400">{getNotificationIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!n.read ?"font-semibold text-slate-900 dark:text-white" :"font-normal text-slate-700 dark:text-slate-300"}`}>{n.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.message}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("nav.noNotifications")}</div>
        )}
        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="flex items-center justify-center gap-1 py-2.5 text-sm cursor-pointer rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-medium" data-testid="link-view-all-notifications">
            {t("nav.viewAllNotifications")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  const themeMutation = useMutation({
    mutationFn: async (newTheme: "light" | "dark") => {
      const cached: any = queryClient.getQueryData(["/api/settings"]) ?? {};
      return authFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ ...cached, theme: newTheme }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggleTheme();
    if (user) {
      themeMutation.mutate(nextTheme);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Primary nav links — max 4 per role
  const getPrimaryLinks = () => {
    if (!user) return [
      { href:"/classes", label: t("nav.browseClasses") },
      { href:"/about", label: t("nav.about") },
    ];
    if (user.role ==="coordinator") return [
      { href:"/admin", label: t("nav.dashboard") },
      { href:"/classes", label: t("nav.classes") },
      { href:"/messages", label: t("nav.messages") },
    ];
    if (user.role ==="tutor") return [
      { href:"/teacher-dashboard", label: t("nav.dashboard") },
      { href:"/teacher-classes", label: t("nav.myClasses") },
      { href:"/messages", label: t("nav.messages") },
    ];
    return [
      { href:"/student-dashboard", label: t("nav.dashboard") },
      { href:"/classes", label: t("nav.browseClasses") },
      { href:"/bookings", label: t("nav.bookings") },
      { href:"/messages", label: t("nav.messages") },
    ];
  };

  // Secondary links shown in mobile menu + user dropdown
  const getSecondaryLinks = () => {
    if (!user) return [];
    if (user.role ==="tutor") return [
      { href:"/classes/create", label: t("nav.createClass"), icon: Plus },
      { href:"/create-lesson", label: t("nav.createLesson"), icon: FileText },
      { href:"/create-quiz", label: t("nav.createQuiz"), icon: Award },
      { href:"/create-assignment", label: t("nav.createAssignment"), icon: Award },
      { href:"/bookings", label: t("nav.bookings"), icon: Calendar },
      { href:"/contact-admin", label: t("nav.contactAdmin"), icon: PhoneCall },
    ];
    if (user.role ==="coordinator") return [
      { href:"/send-notification", label: t("nav.sendNotification"), icon: Bell },
    ];
    return [
      { href:"/notifications", label: t("nav.notifications"), icon: Bell },
      { href:"/contact-admin", label: t("nav.contactAdmin"), icon: PhoneCall },
      { href:"/help-center", label: t("nav.helpCenter"), icon: BookOpen },
    ];
  };

  const primaryLinks = getPrimaryLinks();
  const secondaryLinks = getSecondaryLinks();

  const dashboardHref = user?.role ==="coordinator" ?"/admin" : user?.role ==="tutor" ?"/teacher-dashboard" :"/student-dashboard";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    :"";

  return (
    <header className={`sticky top-0 z-[9999] transition-all duration-300 ${
      scrolled
        ?"bg-background/95 backdrop-blur-xl shadow-lg shadow-slate-200/10 dark:shadow-slate-900/20 border-b border-border/60"
        :"bg-background/80 backdrop-blur-md border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0 group" data-testid="link-home">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:inline group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            TutorBridge
          </span>
        </Link>

        {/* Primary nav — desktop */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-2 flex-1 justify-center">
          {primaryLinks.map((link) => {
            const active = location === link.href || location.startsWith(link.href +"/");
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={`px-5 py-2 text-sm font-medium rounded-xl transition-all duration-200 relative group ${
                    active
                      ?"text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20"
                      :"text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g,"-")}`}
                >
                  {link.label}
                  {!active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 group-hover:w-full transition-all duration-300" />}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="w-9 h-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={handleThemeToggle} aria-label="Toggle theme" title="Toggle theme (also in Settings)" data-testid="button-theme-toggle">
            {theme ==="dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </Button>

          {/* #163: quick-access search button in navbar */}
          {user && (
            <Link href="/search">
              <Button variant="ghost" size="icon" className="w-9 h-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Search content">
                <Search className="w-4.5 h-4.5" />
              </Button>
            </Link>
          )}

          {user && <NotificationBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="User menu" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ''} />}
                    <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 rounded-xl p-1.5">
                <DropdownMenuLabel className="font-normal px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-900 dark:to-purple-900 dark:text-indigo-300 w-fit capitalize">
                      {user.role}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.id}`} className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {t("nav.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref} className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {t("nav.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                {secondaryLinks.length > 0 && <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />}
                {secondaryLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <link.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem onClick={logout} className="cursor-pointer px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30" data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="h-8 text-sm" data-testid="link-login">{t("nav.login")}</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="h-8 text-sm bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="link-signup">{t("nav.signup")}</Button>
              </Link>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden w-9 h-9" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} data-testid="button-mobile-menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height:"auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 overflow-hidden bg-background"
          >
            <nav className="flex flex-col p-3 gap-1">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <button className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location === link.href
                      ?"bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                      :"text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`} data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g,"-")}`}>
                    {link.label}
                  </button>
                </Link>
              ))}
              {secondaryLinks.length > 0 && (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                  {secondaryLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                      <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                        <link.icon className="w-4 h-4" /> {link.label}
                      </button>
                    </Link>
                  ))}
                </>
              )}
              {user && (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                  <Link href="/settings" onClick={() => setMobileOpen(false)}>
                    <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                      <Settings className="w-4 h-4" /> {t("nav.settings")}
                    </button>
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> {t("nav.logout")}
                  </button>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
