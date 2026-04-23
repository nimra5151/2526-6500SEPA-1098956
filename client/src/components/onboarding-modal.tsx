// #181: First-time onboarding modal — shows a welcome message and a "Get Started"
// checklist the first time a user lands on their dashboard. Dismissed permanently
// per-user via localStorage.
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, BookOpen, User, MessageCircle, Calendar, X,
  GraduationCap, ClipboardList, Users2, CheckCircle2,
} from "lucide-react";

interface OnboardingStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  cta: string;
}

interface OnboardingModalProps {
  userId: number | undefined;
  userName: string;
  role: "student" | "tutor" | "coordinator";
}

const STUDENT_STEPS: OnboardingStep[] = [
  {
    icon: BookOpen,
    title: "Browse classes",
    description: "Discover free courses taught by volunteer tutors.",
    href: "/classes",
    cta: "Browse",
  },
  {
    icon: Calendar,
    title: "Book your first session",
    description: "Schedule a 1-on-1 lesson with a tutor that matches your goals.",
    href: "/classes",
    cta: "Find tutors",
  },
  {
    icon: User,
    title: "Complete your profile",
    description: "Add your interests so we can recommend the right classes.",
    href: "/profile",
    cta: "Edit profile",
  },
  {
    icon: MessageCircle,
    title: "Say hi to a tutor",
    description: "Send a message to introduce yourself before your first session.",
    href: "/messages",
    cta: "Open messages",
  },
];

const TUTOR_STEPS: OnboardingStep[] = [
  {
    icon: User,
    title: "Complete your tutor profile",
    description: "Add your bio, skills, and availability so students can find you.",
    href: "/profile",
    cta: "Edit profile",
  },
  {
    icon: GraduationCap,
    title: "Create your first class",
    description: "Publish a class to start welcoming students.",
    href: "/classes/create",
    cta: "Create class",
  },
  {
    icon: ClipboardList,
    title: "Add a lesson or quiz",
    description: "Build out your course with rich learning content.",
    href: "/create-lesson",
    cta: "Add content",
  },
  {
    icon: MessageCircle,
    title: "Check your messages",
    description: "Students may already be reaching out!",
    href: "/messages",
    cta: "Open messages",
  },
];

const COORDINATOR_STEPS: OnboardingStep[] = [
  {
    icon: Users2,
    title: "Review pending tutors",
    description: "Approve new volunteers so they can start teaching.",
    href: "/admin-dashboard",
    cta: "Review",
  },
  {
    icon: BookOpen,
    title: "Browse all classes",
    description: "See what's being offered on the platform.",
    href: "/classes",
    cta: "Browse",
  },
  {
    icon: User,
    title: "Update your contact info",
    description: "Make sure your profile is current.",
    href: "/profile",
    cta: "Edit profile",
  },
];

export function OnboardingModal({ userId, userName, role }: OnboardingModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const key = `tutorbridge_onboarded_${userId}`;
    try {
      if (!localStorage.getItem(key)) {
        // Small delay so the dashboard renders first
        const t = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [userId]);

  const dismiss = () => {
    if (userId) {
      try { localStorage.setItem(`tutorbridge_onboarded_${userId}`, "1"); } catch {}
    }
    setOpen(false);
  };

  const steps =
    role === "tutor" ? TUTOR_STEPS :
    role === "coordinator" ? COORDINATOR_STEPS :
    STUDENT_STEPS;

  const roleLabel =
    role === "tutor" ? "tutor" :
    role === "coordinator" ? "coordinator" :
    "student";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-0 shadow-2xl overflow-hidden">
              {/* Gradient header */}
              <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-8 text-white">
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Close onboarding"
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    initial={{ rotate: -20, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold">Welcome to TutorBridge, {userName}!</h2>
                    <p className="text-sm text-white/80">Let's get you set up as a {roleLabel}.</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                  Here are a few things you can do to get the most out of TutorBridge:
                </p>
                <div className="space-y-3">
                  {steps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{step.description}</p>
                        </div>
                        <Link href={step.href}>
                          <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={dismiss}>
                            {step.cta}
                          </Button>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    You can revisit these any time from your dashboard.
                  </div>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={dismiss}
                  >
                    Got it!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
