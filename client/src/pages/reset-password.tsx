import { useState, useEffect } from"react";
import { Link, useLocation } from"wouter";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { useToast } from"@/hooks/use-toast";
import { BookOpen, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from"lucide-react";
import { motion } from"framer-motion";

// #66: password strength helpers (mirrors signup.tsx)
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score;
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["bg-muted", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];
  return (
    <div className="space-y-1 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? colors[strength] : "bg-muted"}`} />
        ))}
      </div>
      {strength > 0 && <p className="text-xs text-muted-foreground">{labels[strength]}</p>}
    </div>
  );
}

export default function ResetPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setTokenMissing(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title:"Passwords do not match", variant:"destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title:"Password must be at least 8 characters", variant:"destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: any) {
      toast({ title: err.message ||"Failed to reset password", variant:"destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (tokenMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Invalid reset link</h2>
          <p className="text-muted-foreground text-sm">This link is missing or invalid.</p>
          <Link href="/forgot-password">
            <Button variant="outline">Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="font-display text-xl font-bold">TutorBridge</span>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Password reset!</h1>
            <p className="text-muted-foreground text-sm">
              Your password has been changed. Redirecting you to login…
            </p>
            <Link href="/login">
              <Button className="mt-2 bg-primary">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold mb-2">Set a new password</h1>
              <p className="text-muted-foreground text-sm">Choose a strong password — at least 8 characters.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ?"text" :"password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && <PasswordStrengthBar strength={getPasswordStrength(newPassword)} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary" disabled={loading || !newPassword}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :"Reset Password"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
