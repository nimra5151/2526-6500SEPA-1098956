import { useState, useEffect } from"react";
import { Link, useLocation } from"wouter";
import { useAuth } from"@/lib/auth";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { useToast } from"@/hooks/use-toast";
import { Eye, EyeOff, BookOpen, ArrowRight, LogIn, Loader2, MailCheck } from"lucide-react";
import { motion } from"framer-motion";
import { useQuery } from"@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Fetch public stats for the login page
  const { data: stats } = useQuery({
    queryKey: ["/api/public/stats"],
    queryFn: () => fetch("/api/public/stats").then((res) => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Redirect when user state is committed — handles both normal login and already-logged-in users
  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user]);

  // Handle Google OAuth token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    if (oauthToken) {
      // Store the token and fetch user data
      localStorage.setItem("token", oauthToken);
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${oauthToken}` },
      }).then(res => res.ok ? res.json() : null).then(userData => {
        if (userData) {
          // Full reload so AuthProvider re-initializes with the stored token
          window.location.href = '/dashboard';
        } else {
          localStorage.removeItem("token");
          toast({ title:"OAuth Error", description:"Could not retrieve user data.", variant:"destructive" });
        }
      }).catch(() => {
        localStorage.removeItem("token");
        toast({ title:"OAuth Error", description:"Google login failed. Please try again.", variant:"destructive" });
      });
    }
    const error = params.get('error');
    if (error) {
      toast({ title:"OAuth Error", description:"Google login failed. Please try again.", variant:"destructive" });
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = t("login.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("login.emailInvalid");
    }
    if (!password) {
      newErrors.password = t("login.passwordRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: t("login.welcomeBackToast") });
      // Redirect is handled reactively by the useEffect above once user state commits
    } catch (err: any) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
        setResendSent(false);
      } else if (err.code === "ACCOUNT_LOCKED") {
        toast({ title: "Account temporarily locked", description: err.message || "Too many failed login attempts. Please try again later.", variant: "destructive" });
      } else {
        toast({ title: err.message || "Login failed", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      if (!res.ok) throw new Error("Server error");
      setResendSent(true);
      toast({ title: "Verification email sent!", description: "Check your inbox and spam folder." });
    } catch {
      toast({ title: "Failed to resend email. Try again.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-[#667EEA] via-[#764BA2] to-[#F093FB]">
        <div className="absolute inset-0">
          <div
            className="absolute top-[15%] left-[10%] w-20 h-20 border border-white/20 rounded-lg animate-float"
            style={{ animationDelay:"0s" }}
          />
          <div
            className="absolute top-[45%] right-[15%] w-16 h-16 border border-white/20 rounded-full animate-float"
            style={{ animationDelay:"1s" }}
          />
          <div
            className="absolute bottom-[25%] left-[20%] w-12 h-12 border border-white/20 rounded-md animate-float"
            style={{ animationDelay:"2s" }}
          />
          <div
            className="absolute top-[70%] right-[30%] w-24 h-24 border border-white/20 rounded-xl animate-float"
            style={{ animationDelay:"0.5s" }}
          />
          <div
            className="absolute top-[10%] right-[25%] w-10 h-10 border border-white/20 rounded-full animate-float"
            style={{ animationDelay:"1.5s" }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-8 lg:p-12 w-full">
          <div className="mb-auto pt-8">
            <Link href="/" className="flex items-center gap-2 text-white/90">
              <BookOpen className="w-6 h-6" />
              <span className="font-display text-xl font-bold">
                TutorBridge
              </span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white leading-tight">
                {t("login.welcomeBack")}
              </h2>
              <p className="text-white/70 mt-3 text-sm lg:text-base">
                {t("login.continueJourney")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t("login.students"), value: `${stats?.students || 240}+` },
                { label: t("login.classes"), value: `${stats?.classes || 38}+` },
                { label: t("login.tutors"), value: `${stats?.tutors || 15}+` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md p-3 text-center">
                  <p className="text-xl lg:text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-6">
              <p className="text-white/90 text-sm italic leading-relaxed">
"The platform made it so easy to find the right tutor. I've improved my grades significantly since joining TutorBridge."
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  JM
                </div>
                <div>
                  <p className="text-white text-sm font-medium">James M.</p>
                  <p className="text-white/50 text-xs">
                    Student
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pb-8" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="md:hidden flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-display text-lg font-bold">
                TutorBridge
              </span>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold mb-1" data-testid="text-login-heading">
                {t("login.heading")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("login.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive" data-testid="error-email">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ?"text" :"password"}
                    placeholder={t("login.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive" data-testid="error-password">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  {t("login.forgotPassword")}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary neon-btn"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t("login.logIn")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {unverifiedEmail && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MailCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      {t("login.emailNotVerified")}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                      {t("login.verificationSent")} <span className="font-medium">{unverifiedEmail}</span>. {t("login.checkInbox")}
                    </p>
                  </div>
                </div>
                {resendSent ? (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
                    {t("login.verificationResent")}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
                    onClick={handleResend}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <MailCheck className="w-3 h-3 mr-2" />
                    )}
                    {t("login.resendVerification")}
                  </Button>
                )}
              </div>
            )}

            {stats?.googleOAuthEnabled && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t("login.orContinueWith")}</span>
                </div>
              </div>
            )}

            {stats?.googleOAuthEnabled && (
              <a href="/api/auth/google">
                <Button type="button" variant="outline" className="w-full" data-testid="button-google-login">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t("login.continueGoogle")}
                </Button>
              </a>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("login.noAccount")}{" "}
              <Link href="/signup" className="text-primary font-medium" data-testid="link-to-signup">
                {t("login.signUp")}
              </Link>
            </p>

            {import.meta.env.DEV && (
              <p className="text-center text-xs text-muted-foreground/60 mt-4" data-testid="text-demo-hint">
                Demo: james@example.com / password123
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
