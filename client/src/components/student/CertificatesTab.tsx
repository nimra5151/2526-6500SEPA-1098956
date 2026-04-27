import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/skeleton-loader';
import { Certificate } from '@/components/certificate';
import { Link } from 'wouter';
import { Award, ExternalLink, CalendarDays, User, Clock, XCircle, CheckCircle } from 'lucide-react';

interface CertificatesTabProps {
  certificates: any[];
  studentName: string;
}

export function CertificatesTab({ certificates, studentName }: CertificatesTabProps) {
  const approved = certificates.filter(c => c.status === 'approved' || !c.status);
  const pending  = certificates.filter(c => c.status === 'pending');
  const rejected = certificates.filter(c => c.status === 'rejected');

  if (certificates.length === 0) {
    return (
      <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
        <CardContent className="py-16">
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Complete a course to earn your first certificate. Your certificate will be reviewed by a coordinator before it's issued."
            action={{ label: 'Browse Classes', href: '/classes' }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            My Certificates
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {approved.length} approved · {pending.length} awaiting approval
            {rejected.length > 0 && ` · ${rejected.length} not approved`}
          </p>
        </div>
        {approved.length > 0 && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm px-3 py-1">
            {approved.length} earned
          </Badge>
        )}
      </div>

      {/* Pending certificates */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Awaiting Coordinator Approval
          </h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {pending.map((cert: any) => (
              <Card key={cert.id} className="border border-amber-200 dark:border-amber-800/40 shadow-sm bg-amber-50/40 dark:bg-amber-950/10">
                <CardHeader className="pb-3 border-b border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {cert.courseName}
                      </CardTitle>
                      <Badge className="mt-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-xs">
                        Pending Approval
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-5 space-y-2">
                  {cert.tutorName && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">Taught by <span className="font-medium text-foreground">{cert.tutorName}</span></span>
                    </div>
                  )}
                  {cert.issuedAt && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>Completed {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    A coordinator will review and approve your certificate shortly.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved certificates */}
      {approved.length > 0 && (
        <div className="space-y-3">
          {(pending.length > 0 || rejected.length > 0) && (
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Approved Certificates
            </h3>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {approved.map((cert: any) => (
              <Card
                key={cert.id}
                className="border border-emerald-200 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900"
              >
                <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {cert.courseName}
                      </CardTitle>
                      <Badge className="mt-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs">
                        Certificate of Completion
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 pb-5 space-y-3">
                  {cert.tutorName && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">Taught by <span className="font-medium text-foreground">{cert.tutorName}</span></span>
                    </div>
                  )}
                  {cert.approvedAt && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>Approved {new Date(cert.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}
                  {!cert.approvedAt && cert.issuedAt && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>Issued {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}

                  {cert.verificationCode && (
                    <div className="flex items-center gap-2">
                      <Link href={`/verify/${cert.verificationCode}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-2 -ml-2">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Verify certificate
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-xs text-slate-500 mb-2">Download your certificate</p>
                    <Certificate
                      studentName={cert.studentName || studentName}
                      courseName={cert.courseName}
                      tutorName={cert.tutorName}
                      verificationCode={cert.verificationCode}
                      issuedAt={cert.approvedAt || cert.issuedAt}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejected certificates */}
      {rejected.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> Not Approved
          </h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {rejected.map((cert: any) => (
              <Card key={cert.id} className="border border-red-200 dark:border-red-800/40 shadow-sm bg-red-50/30 dark:bg-red-950/10">
                <CardHeader className="pb-3 border-b border-red-100 dark:border-red-900/30">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {cert.courseName}
                      </CardTitle>
                      <Badge className="mt-1.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-xs">
                        Not Approved
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-5 space-y-2">
                  {cert.tutorName && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">Taught by <span className="font-medium text-foreground">{cert.tutorName}</span></span>
                    </div>
                  )}
                  {cert.rejectionReason && (
                    <div className="rounded-lg bg-red-100 dark:bg-red-950/30 px-3 py-2">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">Reason from coordinator:</p>
                      <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{cert.rejectionReason}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">Contact your coordinator or teacher for more information.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
