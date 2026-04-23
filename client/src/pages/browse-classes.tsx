import { useState, useMemo, useEffect } from"react";
import { useQuery, useMutation } from"@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Badge } from"@/components/ui/badge";
import { CourseCardSkeleton } from "@/components/skeleton-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { motion } from"framer-motion";
import {
  Search,
  Star,
  Users,
  Clock,
  BookOpen,
  Video,
  Tv,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from"lucide-react";

import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { queryClient } from"@/lib/queryClient";
import type { Class } from"@shared/schema";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const CATEGORIES = [
"All",
"Programming & Tech",
"Mathematics",
"Life Skills",
"Languages",
"Science",
"Creative Arts",
"Career & Business",
];

const COURSE_TABS = [
  { label:"All", value:"all", icon: BookOpen },
  { label:"Live", value:"live", icon: Tv },
  { label:"Upcoming", value:"upcoming", icon: Calendar },
  { label:"Recorded", value:"recorded", icon: Video },
];

const SKILL_LEVELS = [
  { label:"All Levels", value:"all" },
  { label:"Beginner", value:"beginner" },
  { label:"Intermediate", value:"intermediate" },
  { label:"Advanced", value:"advanced" },
];

const SORT_OPTIONS = [
  { label:"Popular", value:"popular" },
  { label:"Newest", value:"newest" },
  { label:"Top Rated", value:"top-rated" },
];

const courseTypeBadgeStyles: Record<string, string> = {
"on-demand":"bg-primary/90 text-white",
  live:"bg-primary/90 text-white",
  upcoming:"bg-muted-foreground/80 text-white",
  recorded:"bg-muted-foreground/60 text-white",
};

const courseTypeIcons: Record<string, typeof Video> = {
"on-demand": Video,
  live: Tv,
  upcoming: Calendar,
  recorded: Video,
};


const skillLevelColors: Record<string, string> = {
  beginner:"bg-primary/10 text-primary",
  intermediate:"bg-primary/15 text-primary",
  advanced:"bg-primary/20 text-primary",
};

function CourseTypeBadge({ type }: { type: string }) {
  const Icon = courseTypeIcons[type] || Video;
  const isLive = type ==="live";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium backdrop-blur-sm ${courseTypeBadgeStyles[type] ||"bg-gray-500/80 text-white"}${isLive ?" pulse-live pl-4" :""}`}
      data-testid={`badge-course-type-${type}`}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      <Icon className="w-3 h-3" />
      {type.charAt(0).toUpperCase() + type.slice(1).replace("-","")}
    </span>
  );
}

function RatingStars({ rating, count }: { rating: number; count?: number }) {
  const stars = [];
  const r = Number(rating) || 0;
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i <= Math.round(r) ?"text-amber-400 fill-amber-400" :"text-muted-foreground/20"}`}
      />
    );
  }
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">{stars}</div>
      <span className="text-xs text-muted-foreground">{r.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground/60">({count})</span>
      )}
    </div>
  );
}

function ClassCard({ cls }: { cls: any }) {
  const tutorName = cls.tutorName || cls.tutor?.name || "Tutor";
  const tutorRating = Number(cls.tutorRating || cls.tutor?.rating) || 0;

  const handleMouseEnter = () => {
    // Prefetch class detail data on hover after 300ms delay
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ["/api/classes", cls.id],
        queryFn: () => authFetch(`/api/classes/${cls.id}`),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    }, 300);
    
    // Store timer ID to clear on unmount if needed
    (handleMouseEnter as any)._timer = timer;
  };

  const handleMouseLeave = () => {
    // Clear the timer if mouse leaves before 300ms
    if ((handleMouseEnter as any)._timer) {
      clearTimeout((handleMouseEnter as any)._timer);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="h-full"
    >
      <Card
        className="h-full overflow-hidden border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-800/50"
        data-testid={`card-class-${cls.id}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/classes/${cls.id}`}>
          <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={cls.thumbnailUrl || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop`}
              alt={cls.title}
              loading="lazy"
              width={320}
              height={180}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              data-testid={`img-thumbnail-${cls.id}`}
            />

            <div className="absolute top-3 right-3">
              <Badge className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-0 font-semibold shadow-sm">
                {cls.courseType === 'live' ? 'Live' : cls.courseType === 'on-demand' ? 'On Demand' : cls.courseType === 'upcoming' ? 'Upcoming' : 'Recorded'}
              </Badge>
            </div>

            {cls.zoomMeetingId && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE NOW
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-5 space-y-3">
          <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 no-default-hover-elevate">
            {cls.category}
          </Badge>

          <Link href={`/classes/${cls.id}`}>
            <h3
              className="font-bold text-lg line-clamp-2 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
              data-testid={`text-title-${cls.id}`}
            >
              {cls.title}
            </h3>
          </Link>

          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {cls.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 pt-2 border-t dark:border-slate-700">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {cls.duration} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {cls.enrolledCount || 0}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-slate-900 dark:text-white">
                {tutorRating > 0 ? tutorRating.toFixed(1) :"New"}
              </span>
            </div>
          </div>

          <Link href={`/classes/${cls.id}`}>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
              data-testid={`button-enroll-${cls.id}`}
            >
              Enroll Now
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card className="h-full overflow-hidden border-0 shadow-md">
      <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <CardContent className="p-5 space-y-3">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function BrowseClasses() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // #95: clear all filters when navigating to /classes fresh (no query params)
  useEffect(() => {
    if (location === "/classes") {
      setSearch(""); setDebouncedSearch(""); setCourseType("all");
      setCategory("All"); setSkillLevel("all"); setOrphanage(""); setPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const [courseType, setCourseType] = useState("all");
  const [category, setCategory] = useState("All");
  const [skillLevel, setSkillLevel] = useState("all");
  const [sort, setSort] = useState("popular");
  const [orphanage, setOrphanage] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (courseType !=="all") params.set("courseType", courseType);
    if (category !=="All") params.set("category", category);
    if (skillLevel !=="all") params.set("skillLevel", skillLevel);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (orphanage) params.set("orphanage", orphanage);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [courseType, category, skillLevel, debouncedSearch, orphanage, sort, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/classes", { courseType, category, skillLevel, debouncedSearch, orphanage, sort, page }],
    queryFn: () => authFetch(`/api/classes?${queryParams}`),
  });

  const classes = data?.classes || (Array.isArray(data) ? data : []);
  const totalPages = data?.totalPages || 1;
  const total = data?.total || classes.length;

  const clearAllFilters = () => {
    setCategory("All");
    setSkillLevel("all");
    setSearch("");
    setCourseType("all");
    setSort("popular");
    setOrphanage("");
    setPage(1);
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters = search || orphanage || courseType !=="all" || category !=="All" || skillLevel !=="all";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Page Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center space-y-3">
            <motion.h1 variants={fadeIn} className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-browse-title">
              Browse Classes
            </motion.h1>
            <motion.p variants={fadeIn} className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto" data-testid="text-browse-subtitle">
              Find the right class for you — search by topic, level, or course format.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Sticky search + filter bar */}
      <div className="sticky top-14 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm" data-testid="filter-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
          {/* Row 1: Search + Filters toggle + Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search classes, topics, or subjects..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-2 shrink-0 ${hasActiveFilters ?"border-indigo-500 text-indigo-600 dark:text-indigo-400" :""}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </Button>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9 text-sm shrink-0" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Collapsible filters */}
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height:"auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-3 pt-1 pb-2 border-t border-slate-100 dark:border-slate-800"
            >
              {/* Course type */}
              <div className="flex items-center gap-1 flex-wrap">
                {COURSE_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => { setCourseType(tab.value); setPage(1); }}
                    data-testid={`tab-${tab.value}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      courseType === tab.value
                        ?"bg-indigo-600 text-white"
                        :"bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                  <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={skillLevel} onValueChange={(v) => { setSkillLevel(v); setPage(1); }}>
                  <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-skill-level">
                    <SelectValue placeholder="Skill Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Orphanage / Org"
                    value={orphanage}
                    onChange={(e) => { setOrphanage(e.target.value); setPage(1); }}
                    className="pl-8 h-8 text-xs w-44"
                    data-testid="input-orphanage"
                  />
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-red-600" onClick={clearAllFilters} data-testid="button-clear-filters">
                    Clear all
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Active:</span>
              {courseType !=="all" && <Badge variant="secondary" className="text-xs h-5 rounded no-default-hover-elevate">{courseType}</Badge>}
              {category !=="All" && <Badge variant="secondary" className="text-xs h-5 rounded no-default-hover-elevate">{category}</Badge>}
              {skillLevel !=="all" && <Badge variant="secondary" className="text-xs h-5 rounded no-default-hover-elevate">{skillLevel}</Badge>}
              {search && <Badge variant="secondary" className="text-xs h-5 rounded no-default-hover-elevate">"{search}"</Badge>}
              {orphanage && <Badge variant="secondary" className="text-xs h-5 rounded no-default-hover-elevate">Org: {orphanage}</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isLoading && total > 0 && (
          <p className="text-xs text-slate-400 mb-6" data-testid="text-results-count">
            {total} class{total !== 1 ?"es" :""} found
          </p>
        )}

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : classes.length > 0 ? (
          <>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {classes.map((cls: any) => (
                <motion.div key={cls.id} variants={fadeIn}>
                  <ClassCard cls={cls} />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10" data-testid="pagination">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} data-testid="button-prev-page">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-slate-500" data-testid="text-page-info">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} data-testid="button-next-page">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1" data-testid="text-empty-title">No classes found</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-4" data-testid="text-empty-message">
              {hasActiveFilters ?"Try adjusting your filters or search." :"No classes available yet. Check back soon!"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} data-testid="button-clear-all-filters">Clear Filters</Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
