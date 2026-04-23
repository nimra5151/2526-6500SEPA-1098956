import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Link } from"wouter";
import { motion } from"framer-motion";
import { Shield, AlertTriangle, Eye, Phone, FileText, CheckCircle } from"lucide-react";

const conductPoints = [
"Never engage in one-on-one unsupervised sessions with minors",
"Maintain professional boundaries at all times during tutoring",
"Report any suspicious behaviour or safeguarding concerns immediately",
"Never share personal contact details with students outside the platform",
"Use appropriate language and materials suitable for the student's age",
"Follow all platform guidelines for content sharing and communication",
"Complete mandatory safeguarding training before starting to tutor",
"Respect the privacy and dignity of every student",
];

const monitoringPoints = [
  { title:"Booking Records", description:"All tutoring sessions are tracked through booking records with timestamps and participant information for accountability." },
  { title:"Coordinator Oversight", description:"Designated coordinators monitor platform activity through the admin dashboard and can review reports and user activity." },
  { title:"Report System", description:"Students and tutors can report concerns through a dedicated safeguarding report system for immediate coordinator review." },
  { title:"Regular Audits", description:"We conduct periodic reviews of tutor activity, user feedback, and booking records to ensure compliance with our policies." },
];

export default function Safeguarding() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-3" data-testid="section-safeguarding-hero">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-primary text-primary-foreground mb-2">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-display font-semibold" data-testid="text-safeguarding-title">
            Our Commitment to Child Safety
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The safety and wellbeing of every child on TutorBridge is our highest priority.
            We maintain rigorous safeguarding standards to ensure a secure learning environment
            for all students.
          </p>
        </div>

        <Card data-testid="section-code-of-conduct">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">Code of Conduct for Tutors</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              All tutors on TutorBridge must adhere to the following code of conduct. Violations may result in
              immediate suspension or permanent removal from the platform.
            </p>
            <ul className="space-y-3">
              {conductPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="section-reporting-concerns">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">Reporting Concerns</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              If you witness or suspect any form of abuse, harassment, or inappropriate behaviour,
              please report it immediately. All reports are treated with the utmost confidentiality
              and are investigated promptly by our safeguarding team.
            </p>
            <p className="text-sm text-muted-foreground">
              You can submit a report anonymously if you prefer. We take every concern seriously
              and will act swiftly to protect the safety of our students.
            </p>
            <Link href="/report">
              <Button data-testid="button-report-concern">
                <AlertTriangle className="w-4 h-4" />
                Report a Concern
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="section-monitoring">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">How We Monitor Sessions</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              TutorBridge employs multiple layers of oversight to ensure the safety of every
              tutoring session on the platform.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {monitoringPoints.map((item) => (
                <div key={item.title} className="space-y-1">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="section-emergency-contacts">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <Phone className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">Emergency Contacts</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              If a child is in immediate danger, please contact your local emergency services first.
              For platform-related concerns, use the contacts below.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">TutorBridge Safeguarding Team</p>
                  <p className="text-muted-foreground">safeguarding@tutorbridge.org</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Emergency Services</p>
                  <p className="text-muted-foreground">Call 999 (UK) / 911 (US) / 112 (EU)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Childline</p>
                  <p className="text-muted-foreground">0800 1111 (UK) - Free, confidential helpline</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
