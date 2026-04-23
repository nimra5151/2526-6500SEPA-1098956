import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Shield, Award, Loader2, Printer, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyCertificate() {
  const [, params] = useRoute("/verify/:code");
  const code = params?.code;
  const { toast } = useToast();

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: async () => {
      const res = await fetch(`/api/certificates/verify/${code}`);
      if (!res.ok) throw new Error("Certificate not found");
      return res.json();
    },
    enabled: !!code,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Certificate</h2>
            <p className="text-slate-500 mb-4">This verification code does not match any certificate in our system.</p>
            <Badge className="bg-red-100 text-red-700">INVALID</Badge>
            <p className="text-xs text-slate-400 mt-4">Code: {code}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
            <Shield className="w-6 h-6" />
            <span className="font-semibold">TutorBridge Certificate Verification</span>
          </div>
        </div>

        <Card className="border-0 shadow-xl border-t-4 border-t-green-500">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-green-100">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-700 mb-4 text-sm px-4 py-1">
              ✓ VERIFIED AUTHENTIC
            </Badge>

            <div className="my-6 py-6 border-y">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Award className="w-8 h-8 text-indigo-500" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Certificate of Completion</h2>
              </div>
              <p className="text-slate-500 text-sm">TutorBridge Peer Learning Platform</p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-slate-500">Student Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{cert.studentName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-slate-500">Course</span>
                <span className="font-semibold text-slate-900 dark:text-white">{cert.courseName}</span>
              </div>
              {cert.tutorName && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-slate-500">Instructor</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{cert.tutorName}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-slate-500">Issued On</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {new Date(cert.issuedAt).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}
                </span>
              </div>
              {/* #151: show certificate expiry date (2 years from issue) */}
              {cert.issuedAt && (() => {
                const expiry = new Date(cert.issuedAt);
                expiry.setFullYear(expiry.getFullYear() + 2);
                const isExpired = expiry < new Date();
                return (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-slate-500">Valid Until</span>
                    <span className={`font-semibold ${isExpired ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                      {expiry.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      {isExpired && <span className="ml-2 text-xs text-red-500">(Expired)</span>}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-500">Verification Code</span>
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{cert.verificationCode}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* #177: print and share actions */}
        <div className="flex gap-2 justify-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Verification link copied!" });
          }}>
            <Share2 className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 print:text-black">
          This certificate was issued by TutorBridge and is valid for 2 years. To verify authenticity, the verification code must match our records.
        </p>
      </div>
    </div>
  );
}
