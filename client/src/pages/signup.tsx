import { useState } from"react";
import { Link, useLocation } from"wouter";
import { useAuth } from"@/lib/auth";
import type { signupSchema } from"@shared/schema";
import type { z } from"zod";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { useToast } from"@/hooks/use-toast";
import {
  GraduationCap,
  BookOpen,
  Shield,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Loader2,
  Calendar,
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useQuery } from"@tanstack/react-query";
import { useTranslation } from "react-i18next";

const skillOptions = [
"Programming",
"Mathematics",
"Science",
"Languages",
"Life Skills",
"Creative Arts",
"Career & Business",
];

function getRoles(t: (key: string) => string) {
  return [
    {
      value:"student" as const,
      label: t("signup.student"),
      description: t("signup.studentDesc"),
      icon: GraduationCap,
      gradient:"from-[#667EEA] to-[#764BA2]",
    },
    {
      value:"tutor" as const,
      label: t("signup.volunteerTutor"),
      description: t("signup.tutorDesc"),
      icon: BookOpen,
      gradient:"from-[#667EEA] to-[#764BA2]",
    },
    {
      value:"coordinator" as const,
      label: t("signup.coordinator"),
      description: t("signup.coordinatorDesc"),
      icon: Shield,
      gradient:"from-[#667EEA] to-[#764BA2]",
    },
  ];
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score;
}

function PasswordStrengthBar({ strength, t }: { strength: number; t: (key: string) => string }) {
  const labels = ["", t("signup.passwordStrengthWeak"), t("signup.passwordStrengthFair"), t("signup.passwordStrengthGood"), t("signup.passwordStrengthStrong"), t("signup.passwordStrengthVeryStrong")];
  const colors = [
"bg-muted",
"bg-red-500",
"bg-orange-500",
"bg-yellow-500",
"bg-green-500",
"bg-emerald-500",
  ];
  return (
    <div className="space-y-1 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] :"bg-muted"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-xs text-muted-foreground">{labels[strength]}</p>
      )}
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const roles = getRoles(t);
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
// Fetch public stats for the signup page
  const { data: stats } = useQuery({
    queryKey: ["/api/public/stats"],
    queryFn: () => fetch("/api/public/stats").then((res) => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  
  const [formData, setFormData] = useState({
    name:"",
    email:"",
    password:"",
    confirmPassword:"",
    role:"" as"student" |"tutor" |"coordinator" |"",
    dateOfBirth:"",
    orphanage:"",
    organization:"",
    bio:"",
    skillsTaught: [] as string[],
    skillsLearning: [] as string[],
  });

  const updateField = (key: string, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSkill = (skill: string) => {
    const field = formData.role ==="tutor" ?"skillsTaught" :"skillsLearning";
    const current = formData[field];
    if (current.includes(skill)) {
      updateField(
        field,
        current.filter((s) => s !== skill),
      );
    } else {
      updateField(field, [...current, skill]);
    }
  };

  const selectRole = (role:"student" |"tutor" |"coordinator") => {
    updateField("role", role);
    setTimeout(() => setStep(2), 300);
  };

  const validateStep2 = () => {
    if (formData.name.length < 2) {
      toast({
        title:"Name must be at least 2 characters",
        variant:"destructive",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title:"Please enter a valid email address",
        variant:"destructive",
      });
      return false;
    }
    if (formData.password.length < 8) {
      toast({
        title:"Password must be at least 8 characters",
        variant:"destructive",
      });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title:"Passwords do not match", variant:"destructive" });
      return false;
    }
    // Validate date of birth for students (must be 13+)
    if (formData.role === "student") {
      if (!formData.dateOfBirth) {
        toast({ title: "Date of birth is required for student accounts", variant: "destructive" });
        return false;
      }
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 13) {
        toast({ title: "You must be at least 13 years old to create a student account", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.role) return;
    if (formData.role === "tutor" && formData.skillsTaught.length === 0) {
      toast({ title: "Please select at least one skill you can teach", variant: "destructive" });
      return;
    }
    if (formData.role === "student" && formData.skillsLearning.length === 0) {
      toast({ title: "Please select at least one skill you want to learn", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      await signup(submitData as z.infer<typeof signupSchema>);
      toast({ title: "Account created!", description: "Please check your email and click the verification link before logging in." });
      setLocation("/login");
    } catch (err: any) {
      toast({
        title: err.message ||"Signup failed",
        variant:"destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const canProceedStep2 =
    formData.name.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    (formData.role !== "student" || formData.dateOfBirth.length > 0);

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-[#667EEA] via-[#764BA2] to-[#F093FB]">
        <div className="absolute inset-0">
          <div
            className="absolute top-[15%] left-[10%] w-20 h-20 border border-white/20 rounded-lg animate-float"
            style={{ animationDelay:"0s" }}
          />
          <div
            className="absolute top-[45%] right-[15%] w-16 h-16 border border-white/20 rounded-full animate-float"
            style={{ animationDelay:"1s" }}
          />
          <div
            className="absolute bottom-[25%] left-[20%] w-12 h-12 border border-white/20 rounded-md animate-float"
            style={{ animationDelay:"2s" }}
          />
          <div
            className="absolute top-[70%] right-[30%] w-24 h-24 border border-white/20 rounded-xl animate-float"
            style={{ animationDelay:"0.5s" }}
          />
          <div
            className="absolute top-[10%] right-[25%] w-10 h-10 border border-white/20 rounded-full animate-float"
            style={{ animationDelay:"1.5s" }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-8 lg:p-12 w-full">
          <div className="mb-auto pt-8">
            <Link href="/" className="flex items-center gap-2 text-white/90">
              <BookOpen className="w-6 h-6" />
              <span className="font-display text-xl font-bold">
                TutorBridge
              </span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white leading-tight">
                {t("signup.startJourney")}
              </h2>
              <p className="text-white/70 mt-3 text-sm lg:text-base">
                {t("signup.joinThousands")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t("signup.students"), value: `${stats?.students || 240}+` },
                { label: t("signup.classes"), value: `${stats?.classes || 38}+` },
                { label: t("signup.tutors"), value: `${stats?.tutors || 15}+` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md p-3 text-center">
                  <p className="text-xl lg:text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-6">
              <p className="text-white/90 text-sm italic leading-relaxed">
"TutorBridge transformed how we deliver education. Our students
                now have access to quality tutors who genuinely care about their
                growth."
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  SK
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Sarah K.</p>
                  <p className="text-white/50 text-xs">
                    Education Coordinator
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pb-8" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <div className="w-full h-1 bg-muted">
          <motion.div
            className="h-full bg-primary rounded-r-full"
            initial={{ width:"0%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.5, ease:"easeInOut" }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-display text-lg font-bold">
                TutorBridge
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        s < step
                          ?"bg-primary text-white"
                          : s === step
                            ?"bg-primary text-white"
                            :"bg-muted text-muted-foreground"
                      }`}
                    >
                      {s < step ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-8 lg:w-12 h-0.5 rounded-full transition-all duration-300 ${
                          s < step ?"bg-primary" :"bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("signup.step", { current: step, total: 3 })}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="font-display text-2xl font-bold mb-1">
                    {t("signup.chooseRole")}
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {t("signup.howUse")}
                  </p>

                  <div className="space-y-3">
                    {roles.map((role) => {
                      const isSelected = formData.role === role.value;
                      return (
                        <motion.button
                          key={role.value}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectRole(role.value)}
                          className={`w-full flex items-center gap-4 p-4 rounded-md border-2 transition-all text-left ${
                            isSelected
                              ?"border-indigo-500 bg-indigo-500/5"
                              :"border-border hover-elevate"
                          }`}
                          data-testid={`button-role-${role.value}`}
                        >
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-md shrink-0 bg-gradient-to-br ${role.gradient} text-white`}
                          >
                            <role.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {role.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {role.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="font-display text-2xl font-bold mb-1">
                    {t("signup.createAccount")}
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {t("signup.fillDetails")}
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("signup.fullName")}</Label>
                      <Input
                        id="name"
                        placeholder={t("signup.namePlaceholder")}
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        data-testid="input-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t("signup.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("signup.emailPlaceholder")}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        data-testid="input-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t("signup.password")}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ?"text" :"password"}
                          placeholder={t("signup.passwordPlaceholder")}
                          value={formData.password}
                          onChange={(e) =>
                            updateField("password", e.target.value)
                          }
                          className="pr-10"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {formData.password.length > 0 && (
                        <PasswordStrengthBar strength={passwordStrength} t={t} />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("signup.confirmPassword")}</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirm ?"text" :"password"}
                          placeholder={t("signup.confirmPlaceholder")}
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            updateField("confirmPassword", e.target.value)
                          }
                          className="pr-10"
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          data-testid="button-toggle-confirm"
                        >
                          {showConfirm ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {formData.confirmPassword.length > 0 &&
                        formData.password !== formData.confirmPassword && (
                          <p className="text-xs text-destructive">
                            {t("signup.passwordsNoMatch")}
                          </p>
                        )}
                    </div>

                    {formData.role ==="student" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">
                            Date of Birth <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="dateOfBirth"
                              type="date"
                              value={formData.dateOfBirth}
                              onChange={(e) =>
                                updateField("dateOfBirth", e.target.value)
                              }
                              max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                              className="pr-10"
                              data-testid="input-date-of-birth"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            You must be at least 13 years old to register
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="orphanage">{t("signup.orphanageName")}</Label>
                          <Input
                            id="orphanage"
                            placeholder={t("signup.orphanagePlaceholder")}
                            value={formData.orphanage}
                            onChange={(e) =>
                              updateField("orphanage", e.target.value)
                            }
                            data-testid="input-orphanage"
                          />
                        </div>
                      </>
                    )}

                    {formData.role ==="tutor" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="organization">{t("signup.organization")}</Label>
                          <Input
                            id="organization"
                            placeholder={t("signup.orgPlaceholder")}
                            value={formData.organization}
                            onChange={(e) =>
                              updateField("organization", e.target.value)
                            }
                            data-testid="input-organization"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="bio">{t("signup.bio")}</Label>
                            <span className="text-xs text-muted-foreground">
                              {formData.bio.length}/300
                            </span>
                          </div>
                          <Textarea
                            id="bio"
                            placeholder={t("signup.bioPlaceholder")}
                            value={formData.bio}
                            onChange={(e) =>
                              updateField(
"bio",
                                e.target.value.slice(0, 300),
                              )
                            }
                            className="resize-none"
                            rows={3}
                            data-testid="input-bio-step2"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        data-testid="button-back-step2"
                      >
                        <ArrowLeft className="w-4 h-4" /> {t("signup.back")}
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!canProceedStep2}
                        onClick={() => {
                          if (validateStep2()) setStep(3);
                        }}
                        data-testid="button-next-step2"
                      >
                        {t("signup.next")} <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && formData.role !== 'coordinator' && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="font-display text-2xl font-bold mb-1">
                    {t("signup.profileSetup")}
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {formData.role ==="tutor"
                      ? t("signup.whatTeach")
                      : t("signup.whatLearn")}
                  </p>

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">
                        {formData.role ==="tutor"
                          ? t("signup.skillsTeach")
                          : t("signup.skillsLearn")}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {skillOptions.map((skill) => {
                          const field =
                            formData.role ==="tutor"
                              ?"skillsTaught"
                              :"skillsLearning";
                          const isSelected =
                            formData[field].includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                isSelected
                                  ?"bg-primary text-white border-transparent"
                                  :"border-border text-muted-foreground hover-elevate"
                              }`}
                              data-testid={`chip-skill-${skill.toLowerCase().replace(/\s+/g,"-")}`}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {formData.role !=="tutor" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="bio-step3">{t("signup.briefBio")}</Label>
                          <span className="text-xs text-muted-foreground">
                            {formData.bio.length}/300
                          </span>
                        </div>
                        <Textarea
                          id="bio-step3"
                          placeholder={t("signup.bioPlaceholderShort")}
                          value={formData.bio}
                          onChange={(e) =>
                            updateField("bio", e.target.value.slice(0, 300))
                          }
                          className="resize-none"
                          rows={3}
                          data-testid="input-bio"
                        />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground pt-4">
                      {t("signup.agreeTerms")}{" "}
                      <Link href="/terms" className="text-primary underline hover:text-primary/80">{t("signup.termsOfService")}</Link>{" "}
                      {t("signup.and")}{" "}
                      <Link href="/privacy" className="text-primary underline hover:text-primary/80">{t("signup.privacyPolicy")}</Link>.
                    </p>
                    <div className="flex items-center gap-3 pt-3 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setStep(2)}
                        data-testid="button-back-step3"
                      >
                        <ArrowLeft className="w-4 h-4" /> {t("signup.back")}
                      </Button>
                      <Button
                        className="flex-1 bg-primary text-white border-transparent neon-btn"
                        disabled={loading}
                        onClick={handleSubmit}
                        data-testid="button-signup"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {t("signup.completeSetup")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && formData.role === 'coordinator' && (
                <motion.div
                  key="step3-coordinator"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h1 className="font-display text-2xl font-bold mb-1">
                      {t("signup.coordinatorReg")}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      {t("signup.coordinatorDesc2")}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization-coord">{t("signup.organization")} <span className="text-destructive">*</span></Label>
                      <Input
                        id="organization-coord"
                        placeholder={t("signup.orgPlaceholderRequired")}
                        value={formData.organization}
                        onChange={(e) => updateField("organization", e.target.value)}
                        className={!formData.organization.trim() ? "border-destructive/50" : ""}
                      />
                      {!formData.organization.trim() && (
                        <p className="text-xs text-destructive">{t("signup.orgRequired")}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bio-coord">{t("signup.briefBio")}</Label>
                        <span className="text-xs text-muted-foreground">
                          {formData.bio.length}/300
                        </span>
                      </div>
                      <Textarea
                        id="bio-coord"
                        placeholder={t("signup.bioCoordPlaceholder")}
                        value={formData.bio}
                        onChange={(e) => updateField("bio", e.target.value.slice(0, 300))}
                        className="resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-4">
                    {t("signup.agreeTerms")}{" "}
                    <Link href="/terms" className="text-primary underline hover:text-primary/80">{t("signup.termsOfService")}</Link>{" "}
                    {t("signup.and")}{" "}
                    <Link href="/privacy" className="text-primary underline hover:text-primary/80">{t("signup.privacyPolicy")}</Link>.
                  </p>
                  <div className="flex items-center gap-3 pt-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      data-testid="button-back-step3"
                    >
                      <ArrowLeft className="w-4 h-4" /> {t("signup.back")}
                    </Button>
                    <Button
                      className="flex-1 bg-primary text-white border-transparent neon-btn"
                      disabled={loading || !formData.organization.trim()} // #61: require organization for coordinators
                      onClick={handleSubmit}
                      data-testid="button-signup"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          {t("signup.completeSetup")}
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {t("signup.alreadyAccount")}{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium"
                  data-testid="link-to-login"
                >
                  {t("signup.logIn")}
                </Link>
              </p>
              {import.meta.env.DEV && (
                <p className="text-center text-xs text-muted-foreground/60">
                  Demo: james@example.com / password123
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
