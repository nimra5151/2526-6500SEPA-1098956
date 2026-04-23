import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Users, Shield, AlertTriangle, BookOpen, Scale, Mail } from "lucide-react";

const sections = [
  {
    icon: Users,
    title: "Eligibility & Accounts",
    content: [
      "TutorBridge is a free volunteer tutoring platform designed primarily for orphanage students. Users must be at least 13 years old, or have explicit consent from a coordinator or legal guardian.",
      "Students under 18 must have their account created or approved by a designated coordinator who acts as their responsible adult on the platform.",
      "Tutors must be approved by a coordinator before they can access teaching features. Coordinator accounts require approval from an existing coordinator.",
      "You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately if you suspect unauthorised access.",
      "We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.",
    ],
  },
  {
    icon: BookOpen,
    title: "Use of the Platform",
    content: [
      "TutorBridge is provided free of charge for educational purposes. You may not use the platform for any commercial, illegal, or harmful activity.",
      "All content uploaded by tutors (lessons, quizzes, assignments) must be original or properly licensed. You retain ownership of content you create.",
      "By uploading content, you grant TutorBridge a non-exclusive licence to display, distribute, and store that content for the purpose of delivering educational services.",
      "You agree not to upload content that is offensive, discriminatory, sexually explicit, or otherwise inappropriate for a platform serving minors.",
      "AI-powered features (Study Buddy, Quiz Generator, Lesson Planner) are assistive tools. Tutors remain responsible for reviewing and approving all AI-generated content before it reaches students.",
    ],
  },
  {
    icon: Shield,
    title: "Safeguarding & Child Protection",
    content: [
      "The safety of children is our highest priority. All users must comply with our Safeguarding Policy, accessible at /safeguarding.",
      "Any interaction with minors must be conducted through the platform's official channels. Private, off-platform contact with students is strictly prohibited.",
      "All tutoring sessions, messages, and content are subject to monitoring by coordinators for safeguarding purposes.",
      "Users must report any concerns about a child's safety immediately using the platform's Report function or by contacting a coordinator directly.",
      "TutorBridge cooperates fully with law enforcement and child protection authorities. We will disclose user data when legally required or when necessary to protect a child.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Prohibited Conduct",
    content: [
      "Harassment, bullying, discrimination, or abusive behaviour towards any user, especially minors, will result in immediate account termination.",
      "Attempting to circumvent platform security, access other users' accounts, or exploit system vulnerabilities is strictly prohibited.",
      "Sharing, distributing, or soliciting personal contact information of minors outside the platform is forbidden.",
      "Creating multiple accounts, impersonating other users, or providing false information during registration is not permitted.",
      "Using the platform to distribute spam, malware, or any form of unsolicited content is prohibited.",
    ],
  },
  {
    icon: Scale,
    title: "Limitation of Liability",
    content: [
      "TutorBridge is provided 'as is' without warranties of any kind, express or implied. We do not guarantee uninterrupted or error-free service.",
      "We are not responsible for the quality, accuracy, or completeness of educational content provided by volunteer tutors.",
      "To the maximum extent permitted by law, TutorBridge shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform.",
      "Volunteer tutors act in their personal capacity and are not employees, agents, or representatives of TutorBridge.",
      "We reserve the right to modify, suspend, or discontinue any part of the platform at any time without prior notice.",
    ],
  },
  {
    icon: FileText,
    title: "Data & Privacy",
    content: [
      "Your use of TutorBridge is also governed by our Privacy Policy, available at /privacy.",
      "We collect only the minimum personal data necessary to provide our services. For minors, enhanced data protections apply.",
      "You may request access to, correction of, or deletion of your personal data at any time by contacting us.",
      "Account deletion requests will be processed within 30 days. Some data may be retained as required by law or for safeguarding records.",
    ],
  },
  {
    icon: Mail,
    title: "Changes & Contact",
    content: [
      "We may update these Terms of Service from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.",
      "We will notify users of significant changes via email or an in-app notification.",
      "For questions about these terms, contact us at: legal@tutorbridge.org",
      "These terms are governed by and construed in accordance with the laws of England and Wales.",
    ],
  },
];

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-primary text-primary-foreground mb-2">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-display font-semibold" data-testid="text-terms-title">
            Terms of Service
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            By using TutorBridge, you agree to these terms. Please read them carefully,
            especially the sections on safeguarding and child protection which are central
            to our mission of providing safe education for orphanage students.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: April 2026</p>
        </div>

        {sections.map((section) => (
          <Card key={section.title} data-testid={`section-${section.title.toLowerCase().replace(/[& ]/g, "-")}`}>
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
