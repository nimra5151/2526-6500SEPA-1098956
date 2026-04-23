import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Award } from "lucide-react";

// #170: Student leaderboard page
const RANK_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="w-5 h-5 text-yellow-500" />,
  2: <Medal className="w-5 h-5 text-slate-400" />,
  3: <Medal className="w-5 h-5 text-amber-600" />,
};

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: leaders = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: () => authFetch("/api/leaderboard"),
    staleTime: 60_000,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top students by sessions, quizzes &amp; certificates</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex justify-between">
            <span>Student</span>
            <span>Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : leaders.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No activity yet. Complete sessions to appear here!</div>
          ) : (
            <ul className="divide-y">
              {(leaders as any[]).map((entry: any) => {
                const isMe = entry.userId === user?.id;
                return (
                  <li key={entry.userId} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}>
                    <div className="w-7 flex justify-center shrink-0">
                      {RANK_ICONS[entry.rank] || <span className="text-sm font-semibold text-muted-foreground">{entry.rank}</span>}
                    </div>
                    <Avatar className="w-8 h-8 shrink-0">
                      {entry.avatar && <AvatarImage src={entry.avatar} />}
                      <AvatarFallback className="text-xs bg-indigo-600 text-white font-semibold">
                        {entry.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">
                      {entry.name}
                      {isMe && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                    </span>
                    <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                      <Star className="w-3.5 h-3.5" />
                      {entry.score.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Score = 10 pts per session · 5 pts per quiz passed · 20 pts per certificate
      </p>
    </div>
  );
}
