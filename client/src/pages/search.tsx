import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Search, FileText, ClipboardList, BookOpen, Loader2 } from "lucide-react";

// #163: Global search page
export default function SearchPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const [query, setQuery] = useState(params.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () => authFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const lessons = data?.lessons || [];
  const quizzes = data?.quizzes || [];
  const assignments = data?.assignments || [];
  const total = lessons.length + quizzes.length + assignments.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Search Content</h1>
        <p className="text-sm text-muted-foreground">Search across all lessons, quizzes and assignments</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons, quizzes, assignments…"
          className="pl-9"
          data-testid="input-global-search"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching…
        </div>
      )}

      {debouncedQuery.length >= 2 && !isLoading && total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No results for "{debouncedQuery}"</p>
      )}

      {lessons.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Lessons
          </h2>
          {lessons.map((item: any) => (
            <Link key={item.id} href={`/classes/${item.classId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0">Lesson</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}

      {quizzes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Quizzes
          </h2>
          {quizzes.map((item: any) => (
            <Link key={item.id} href={`/classes/${item.classId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0">Quiz</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}

      {assignments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Assignments
          </h2>
          {assignments.map((item: any) => (
            <Link key={item.id} href={`/classes/${item.classId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0">Assignment</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
