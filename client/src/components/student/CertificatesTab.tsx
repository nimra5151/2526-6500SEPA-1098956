import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/skeleton-loader';
import { Certificate } from '@/components/certificate';
import { Link } from 'wouter';
import { Award, ExternalLink, CalendarDays, User } from 'lucide-react';

interface CertificatesTabProps {
  certificates: any[];
  studentName: string;
}

export function CertificatesTab({ certificates, studentName }: CertificatesTabProps) {
  if (certificates.length === 0) {
    return (
      <Card className="border border-border/60 dark:border-slate-800 shadow-sm">
        <CardContent className="py-16">
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Complete a course to earn your first certificate. Certificates are awarded when you finish all lessons and a tutor confirms your completion."
            action={{ label: 'Browse Classes', href: '/classes' }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            My Certificates
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            You have earned {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm px-3 py-1">
          {certificates.length} earned
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {certificates.map((cert: any) => (
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

              {cert.issuedAt && (
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
                  issuedAt={cert.issuedAt}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
