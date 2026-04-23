import { Card, CardContent } from"@/components/ui/card";
import { motion } from"framer-motion";
import { Lock, Database, ShieldCheck, Baby, Mail } from"lucide-react";

const sections = [
  {
    icon: Database,
    title:"Data Collection",
    content: [
"We collect personal information necessary to provide our tutoring services, including names, email addresses, and user roles (student, tutor, or coordinator).",
"For students who are minors, we collect only the minimum information required, with consent from their designated coordinator or guardian.",
"We collect usage data such as session logs, booking history, and message records to maintain platform safety and improve our services.",
"Technical data including IP addresses, browser type, and device information may be collected automatically for security and analytics purposes.",
    ],
  },
  {
    icon: ShieldCheck,
    title:"Data Usage",
    content: [
"Personal data is used solely to facilitate tutoring sessions, manage bookings, and enable communication between tutors and students.",
"Session and message data is used for safeguarding purposes, including monitoring for inappropriate content and ensuring student safety.",
"We may use aggregated, anonymised data to improve platform features and measure the effectiveness of our tutoring programmes.",
"We will never sell, rent, or share personal data with third parties for marketing or advertising purposes.",
    ],
  },
  {
    icon: Lock,
    title:"Data Protection",
    content: [
"All data is encrypted in transit using TLS/SSL and at rest using industry-standard encryption protocols.",
"Access to personal data is restricted to authorised personnel who require it for safeguarding or platform administration.",
"We conduct regular security audits and vulnerability assessments to protect against unauthorised access or data breaches.",
"In the event of a data breach, affected users and relevant authorities will be notified promptly in accordance with applicable regulations.",
    ],
  },
  {
    icon: Baby,
    title:"Children's Privacy",
    content: [
"TutorBridge is designed with children's privacy as a core principle. We comply with applicable child data protection regulations.",
"We do not collect more data from minors than is strictly necessary to provide our tutoring services.",
"Parental or coordinator consent is required before any minor can create an account or participate in tutoring sessions.",
"Children's data is subject to enhanced security measures and stricter access controls than standard user data.",
"Coordinators and guardians may request access to, correction of, or deletion of a child's data at any time.",
    ],
  },
  {
    icon: Mail,
    title:"Contact Information",
    content: [
"For any questions about this privacy policy or how we handle your data, please contact our Data Protection team.",
"Email: privacy@tutorbridge.org",
"You have the right to request access to your personal data, request corrections, or request deletion of your data at any time.",
"If you believe your data rights have been violated, you may lodge a complaint with your local data protection authority.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-primary text-primary-foreground mb-2">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-display font-semibold" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            TutorBridge is committed to protecting the privacy and security of all users,
            especially the children we serve. This policy explains how we collect, use, and
            protect your personal information.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: February 2026</p>
        </div>

        {sections.map((section) => (
          <Card key={section.title} data-testid={`section-${section.title.toLowerCase().replace(/[' ]/g,"-")}`}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                  <section.icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-display font-semibold">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((point, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </div>
  );
}
