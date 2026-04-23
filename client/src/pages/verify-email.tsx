import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [location] = useLocation();
  const { toast } = useToast();
  // #68: strip any non-alphanumeric/dash chars to prevent injection before sending to API
  const rawToken = new URLSearchParams(window.location.search).get("token") || "";
  const token = rawToken.replace(/[^a-zA-Z0-9_\-]/g, "");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // #69: resend state
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("No verification token found."); return; }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) { setStatus("success"); }
        else { setStatus("error"); setErrorMsg(data.message ||"Verification failed."); }
      })
      .catch(() => { setStatus("error"); setErrorMsg("Network error. Please try again."); });
  }, [token]);

  // #69: resend verification email helper
  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (res.ok) {
        setResendSent(true);
        toast({ title: "Verification email sent! Check your inbox." });
      } else {
        const d = await res.json();
        toast({ title: d.message || "Failed to resend", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Try again.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Verifying your email…</h1>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Email verified!</h1>
            <p className="text-sm text-muted-foreground mb-6">Your account is now fully activated.</p>
            <Button asChild><Link href="/login">Go to Login</Link></Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Verification failed</h1>
            <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
            {/* #69: offer resend if link is expired/invalid */}
            {!resendSent ? (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-muted-foreground">Enter your email to resend the verification link:</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleResend} disabled={resendLoading || !resendEmail}>
                    {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-green-600 mb-4">Check your inbox for the new link.</p>
            )}
            <Button variant="outline" asChild><Link href="/login">Back to Login</Link></Button>
          </>
        )}
      </div>
    </div>
  );
}
