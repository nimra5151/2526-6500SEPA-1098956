import React, { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  AnimatePresence,
  useInView,
} from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Users, GraduationCap, Star, ArrowRight, Play,
  CheckCircle, Award, Shield, Zap, Heart, ChevronLeft,
  ChevronRight, MapPin, Globe, Sparkles, Calculator,
  FlaskConical, Laptop, Palette, ScrollText, Compass,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ─── Animated Counter ───────────────────────────────────────────────────── */
function AnimatedNumber({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 2000;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.floor(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center p-6 rounded-2xl
                 bg-card/80 backdrop-blur-xl border border-border shadow-lg
                 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
    >
      <div className="text-4xl md:text-5xl font-serif font-bold text-primary mb-2">
        {display.toLocaleString()}+
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium text-center">
        {label}
      </div>
    </div>
  );
}

/* ─── 3-D Tilt Subject Card ──────────────────────────────────────────────── */
function TiltSubjectCard({
  title, image, icon: Icon, students, category,
}: {
  title: string; image: string; icon: React.ComponentType<{ className?: string }>;
  students: number; category: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 280, damping: 28 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 280, damping: 28 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <Link href={`/classes?category=${encodeURIComponent(category)}`}>
      <motion.div
        ref={ref}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative h-72 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-500 group"
      >
        <img
          src={image} alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
        {/* Shine sweep */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 55%)" }}
        />
        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white" style={{ transform: "translateZ(20px)" }}>
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {students.toLocaleString()}
            </span>
          </div>
          <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-2xl font-serif font-bold mb-2">{title}</h3>
            <div className="h-0.5 w-10 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Teacher Card ───────────────────────────────────────────────────────── */
// Curated gradient palettes — cycled per card so every tutor has a distinct identity.
const TEACHER_GRADIENTS = [
  "from-indigo-500 via-blue-500 to-sky-400",
  "from-fuchsia-500 via-purple-500 to-indigo-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-500 via-orange-500 to-rose-500",
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function TeacherCard({ name, role, bio, rating, reviews, skills, gradientIdx }: {
  name: string;
  role: string;
  bio: string;
  rating: number;
  reviews: number;
  skills: string[];
  gradientIdx: number;
}) {
  const gradient = TEACHER_GRADIENTS[gradientIdx % TEACHER_GRADIENTS.length];
  const initials = getInitials(name);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-2xl flex flex-col"
    >
      {/* Gradient header with initials avatar */}
      <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full border-2 border-white/20" />
        <div className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full border-2 border-white/10" />

        {/* Initials avatar */}
        <div className="relative z-10 w-20 h-20 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-xl ring-4 ring-white/30 group-hover:scale-110 transition-transform duration-300">
          <span className={`text-2xl font-serif font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>
            {initials}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-foreground leading-tight">{name}</h3>
        <p className="text-primary text-sm font-semibold mb-2">{role}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3 text-xs">
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">({reviews} reviews)</span>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4 flex-1">
          {bio}
        </p>

        {/* Skill pills */}
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Quote SVG ──────────────────────────────────────────────────────────── */
function QuoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const { t } = useTranslation();
  const { data: liveStats } = useQuery({
    queryKey: ["/api/public/stats"],
    queryFn: () => fetch("/api/public/stats").then((r) => r.json()).catch(() => null),
    staleTime: 300_000,
  });

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.6], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);

  const [slide, setSlide] = useState(0);
  const testimonials = [
    { text: t("home.testimonial1Text"), author: t("home.testimonial1Author"), role: t("home.testimonial1Role") },
    { text: t("home.testimonial2Text"), author: t("home.testimonial2Author"), role: t("home.testimonial2Role") },
    { text: t("home.testimonial3Text"), author: t("home.testimonial3Author"), role: t("home.testimonial3Role") },
  ];

  useEffect(() => {
    const t = setInterval(() => setSlide((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  const subjects = [
    { title: "Mathematics",  category: "Mathematics",       image: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&q=80",  icon: Calculator,  students: 3200 },
    { title: "Science",      category: "Science",           image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",  icon: FlaskConical,students: 2800 },
    { title: "English",      category: "Languages",         image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",  icon: BookOpen,    students: 4100 },
    { title: "Urdu",         category: "Languages",         image: "https://images.unsplash.com/photo-1585036156171-384164a8c675?w=800&q=80",  icon: ScrollText,  students: 1200 },
    { title: "Computer",     category: "Programming & Tech",image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",  icon: Laptop,      students: 1500 },
    { title: "Art",          category: "Creative Arts",     image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",  icon: Palette,     students: 950  },
    { title: "History",      category: "Life Skills",       image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&q=80",  icon: Globe,       students: 1800 },
    { title: "Geography",    category: "Life Skills",       image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80",    icon: Compass,     students: 1450 },
  ];

  // Real TutorBridge volunteers (seeded in DB). Bios, skills and ratings
  // mirror our actual tutor profiles so visitors meet real people.
  const teachers = [
    {
      name: "Priya Sharma",
      role: "English & Languages",
      bio: "English literature graduate helping students improve reading, writing, and communication through engaging stories and creative activities.",
      rating: 4.9,
      reviews: 32,
      skills: ["English", "Writing", "Spanish"],
    },
    {
      name: "Fatima Al-Rashidi",
      role: "Mathematics & Physics",
      bio: "Former university professor specialising in mathematics and physics. Every student can master hard sciences with the right approach.",
      rating: 4.85,
      reviews: 22,
      skills: ["Mathematics", "Physics", "Calculus"],
    },
    {
      name: "James Owusu",
      role: "Math & Computer Science",
      bio: "Mathematics and Computer Science teacher passionate about making complex concepts accessible with patience and guidance.",
      rating: 4.8,
      reviews: 24,
      skills: ["Python", "Algebra", "Statistics"],
    },
    {
      name: "Amara Diallo",
      role: "Science Educator",
      bio: "Science enthusiast with 5 years of experience making physics and chemistry come alive through real-world experiments.",
      rating: 4.6,
      reviews: 18,
      skills: ["Physics", "Chemistry", "Biology"],
    },
  ];

  const stats = [
    { value: liveStats?.totalStudents ?? 12500, label: t("home.statsStudents")     },
    { value: liveStats?.totalTutors   ?? 840,   label: t("home.statsTutors")      },
    { value: liveStats?.totalClasses  ?? 45,    label: t("home.statsClasses")     },
    { value: 120,                               label: t("home.statsOrphanages") },
  ];

  const missionPoints = [
    t("home.missionPoint1"),
    t("home.missionPoint2"),
    t("home.missionPoint3"),
    t("home.missionPoint4"),
  ];

  const steps = [
    { icon: Users,    title: t("home.step1Title"), desc: t("home.step1Desc") },
    { icon: BookOpen, title: t("home.step2Title"), desc: t("home.step2Desc") },
    { icon: Play,     title: t("home.step3Title"), desc: t("home.step3Desc") },
    { icon: Award,    title: t("home.step4Title"), desc: t("home.step4Desc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">

      {/* ══════════════════════════════════════════════════════════════════
          HERO — cinematic fullscreen
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">

        {/* Parallax image */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-900/65 to-background z-10" />
          <img
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=85"
            alt="Children learning"
            className="w-full h-full object-cover object-center scale-105"
          />
        </motion.div>

        {/* Aurora blobs (Framer Motion — bypasses CSS animation-duration override) */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] rounded-full blur-[100px]"
            style={{ background: "hsl(221 83% 53% / 0.25)" }}
            animate={{ x: [0, 50, -30, 0], y: [0, -60, 40, 0], scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] rounded-full blur-[120px]"
            style={{ background: "hsl(210 100% 56% / 0.18)" }}
            animate={{ x: [0, -50, 30, 0], y: [0, 30, -40, 0], scale: [1, 0.9, 1.1, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 right-1/3 w-[20rem] h-[20rem] rounded-full blur-[80px]"
            style={{ background: "hsl(190 100% 50% / 0.12)" }}
            animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/50"
              style={{ width: `${1 + (i % 2)}px`, height: `${1 + (i % 2)}px`, left: `${(i * 41 + 9) % 98}%`, top: `${(i * 57 + 13) % 95}%` }}
              animate={{ y: [0, -20, 0], opacity: [0.15, 0.7, 0.15] }}
              transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 relative z-20 pt-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 text-sm font-medium text-white/90
                              bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
                <Heart className="w-4 h-4 fill-primary text-primary" />
                {t("home.badge")}
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.08] mb-7 tracking-tight text-white">
                {t("home.heroTitle1")}
                <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #93c5fd 0%, #60a5fa 40%, #38bdf8 100%)" }}
                >
                  {t("home.heroTitle2")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                {t("home.heroSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg"
                    className="rounded-full h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90
                               text-primary-foreground shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 group">
                    {t("home.volunteerToTeach")}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline"
                    className="rounded-full h-14 px-8 text-base font-semibold text-white border-white/30
                               hover:bg-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300">
                    {t("home.registerAsStudent")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll line */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="w-px h-16 bg-gradient-to-b from-primary/60 to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <AnimatedNumber value={s.value} label={s.label} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MISSION / ABOUT
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-60"
          style={{ background: "hsl(var(--primary) / 0.06)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-60"
          style={{ background: "hsl(var(--primary) / 0.04)" }} />

        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-foreground leading-tight">
                {t("home.missionTitle1")}
                <br />
                <span className="text-primary">{t("home.missionTitle2")}</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {t("home.missionDesc1")}
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t("home.missionDesc2")}
              </p>
              <ul className="space-y-4 mb-10">
                {missionPoints.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Star className="w-3 h-3 text-primary fill-current" />
                    </div>
                    <span className="font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about">
                <Button variant="outline"
                  className="rounded-full px-8 h-12 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all duration-300">
                  {t("home.readFullStory")}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative">
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80"
                  alt="Student learning" className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                    <p className="text-lg font-serif italic text-white mb-3">
                      {t("home.missionQuote")}
                    </p>
                    <p className="text-sm text-white/75 font-medium">{t("home.missionQuoteAuthor")}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-2xl -z-10"
                style={{ background: "hsl(var(--primary) / 0.15)" }} />
              <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full blur-2xl -z-10"
                style={{ background: "hsl(var(--primary) / 0.10)" }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SUBJECTS — 4 × 2 grid, 3D tilt
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-muted/40">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
              {t("home.subjectsTitle")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("home.subjectsDesc")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: "1200px" }}>
            {subjects.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <TiltSubjectCard {...s} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href="/classes">
              <Button variant="outline"
                className="rounded-full px-8 h-12 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all duration-300">
                {t("home.browseAllSubjects")}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[100px] -z-0 pointer-events-none opacity-50"
          style={{ background: "hsl(var(--primary) / 0.05)" }} />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
              {t("home.howItWorksTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("home.howItWorksSubtitle")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting line desktop */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px"
              style={{ background: "linear-gradient(to right, hsl(var(--primary)/0.3), hsl(var(--primary)/0.6), hsl(var(--primary)/0.3))" }} />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl"
                    style={{ boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)" }}
                  >
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm">
                    <span className="text-xs font-black text-primary">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TEACHERS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-muted/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[100px] -z-0 pointer-events-none opacity-50"
          style={{ background: "hsl(var(--primary) / 0.05)" }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
                {t("home.teachersTitle")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("home.teachersDesc")}
              </p>
            </motion.div>
            <Link href="/classes">
              <Button variant="outline"
                className="rounded-full flex-shrink-0 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all duration-300">
                {t("home.viewAllTeachers")}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teachers.map((teacher, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <TeacherCard {...teacher} gradientIdx={i} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TESTIMONIALS — dark cinematic band
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1510531704581-5b2870972060?w=1600&q=40')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950 to-slate-950/80" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white">{t("home.testimonialsTitle")}</h2>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <QuoteIcon className="w-12 h-12 mx-auto mb-8" style={{ color: "hsl(var(--primary) / 0.5)" }} />
                <p className="text-2xl md:text-3xl font-serif italic leading-relaxed mb-8 text-white/90">
                  "{testimonials[slide].text}"
                </p>
                <div>
                  <h4 className="font-bold text-lg text-white">{testimonials[slide].author}</h4>
                  <p className="text-primary">{testimonials[slide].role}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-4 mt-12">
              <button
                onClick={() => setSlide((p) => (p - 1 + testimonials.length) % testimonials.length)}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-primary hover:border-primary transition-all duration-200"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                    className={`rounded-full transition-all duration-300 ${i === slide ? "w-7 h-3 bg-primary" : "w-3 h-3 bg-white/30 hover:bg-white/50"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setSlide((p) => (p + 1) % testimonials.length)}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-primary hover:border-primary transition-all duration-200"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PLATFORM FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">{t("home.featuresTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("home.featuresDesc")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield,       title: t("home.featureChildSafe"),   desc: t("home.featureChildSafeDesc"),  bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400"   },
              { icon: Zap,          title: t("home.featureAI"),           desc: t("home.featureAIDesc"),          bg: "bg-primary/10",                    text: "text-primary"                       },
              { icon: Award,        title: t("home.featureCerts"),        desc: t("home.featureCertsDesc"),       bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
              { icon: Globe,        title: t("home.featureMultilingual"), desc: t("home.featureMultilingualDesc"),bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
              { icon: Play,         title: t("home.featureLive"),         desc: t("home.featureLiveDesc"),        bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-600 dark:text-rose-400"   },
              { icon: GraduationCap,title: t("home.featureExperts"),      desc: t("home.featureExpertsDesc"),     bg: "bg-indigo-50 dark:bg-indigo-900/20",text: "text-indigo-600 dark:text-indigo-400"},
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-default"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${f.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-6 h-6 ${f.text}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 font-serif">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA — glass card
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-muted/40">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[3rem] p-10 md:p-20 text-center overflow-hidden bg-card/80 backdrop-blur-xl border border-border shadow-2xl"
          >
            {/* Corner glows */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
              style={{ background: "hsl(var(--primary) / 0.12)" }} />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
              style={{ background: "hsl(var(--primary) / 0.08)" }} />

            <div className="relative z-10 max-w-3xl mx-auto">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-8"
              >
                <Heart className="w-8 h-8 text-primary" fill="currentColor" />
              </motion.div>

              <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-foreground">
                {t("home.ctaTitle")}
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                {t("home.ctaDesc")}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
                <Link href="/signup">
                  <Button size="lg"
                    className="rounded-full h-14 px-8 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground
                               shadow-xl hover:scale-105 transition-all duration-300"
                    style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)" }}
                  >
                    {t("home.applyVolunteer")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/classes">
                  <Button size="lg" variant="outline"
                    className="rounded-full h-14 px-8 text-base font-bold border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all duration-300">
                    {t("home.browseCourses")}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                {[t("home.noFees"), t("home.bgChecked"), t("home.childSafe")].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
