import { useState } from"react";
import { Link } from"wouter";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { useToast } from"@/hooks/use-toast";
import { BookOpen, ArrowLeft, Mail, Loader2, CheckCircle } from"lucide-react";
import { motion } from"framer-motion";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // #65: validate email format before sending to backend
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (!isValidEmail(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("Too many requests. Please wait a few minutes and try again.");
        throw new Error(data.message || "Something went wrong");
      }
      setSent(true);
    } catch (err: any) {
      toast({ title: err.message ||"Something went wrong", variant:"destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-8">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="font-display text-xl font-bold">TutorBridge</span>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              If <strong>{email}</strong> is registered, we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <Link href="/login">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold mb-2">Forgot your password?</h1>
              <p className="text-muted-foreground text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-email-forgot"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary" disabled={loading || !email}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :"Send Reset Link"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
