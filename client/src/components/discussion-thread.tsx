import { useState } from"react";
import { useQuery, useMutation } from"@tanstack/react-query";
import { queryClient } from"@/lib/queryClient";
import { authFetch } from"@/lib/api";
import { useAuth } from"@/lib/auth";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { MessageSquare, Plus, Send, ChevronDown, ChevronUp, Loader2 } from"lucide-react";
import { useToast } from"@/hooks/use-toast";
import { formatDistanceToNow } from"date-fns";

interface DiscussionThreadProps {
  classId: number;
}

export function DiscussionThread({ classId }: DiscussionThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ["discussions", classId],
    queryFn: () => authFetch(`/api/classes/${classId}/discussions`),
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["discussion-replies", expandedId],
    queryFn: () => authFetch(`/api/discussions/${expandedId}/replies`),
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      authFetch(`/api/classes/${classId}/discussions`, {
        method:"POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions", classId] });
      setNewTitle("");
      setNewContent("");
      setShowNewForm(false);
      toast({ title:"Discussion posted!" });
    },
    onError: (err: Error) => toast({ title: "Failed to post", description: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ discussionId, content }: { discussionId: number; content: string }) =>
      authFetch(`/api/discussions/${discussionId}/replies`, {
        method:"POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, { discussionId }) => {
      queryClient.invalidateQueries({ queryKey: ["discussion-replies", discussionId] });
      queryClient.invalidateQueries({ queryKey: ["discussions", classId] });
      setReplyContent(prev => ({ ...prev, [discussionId]:"" }));
      toast({ title:"Reply posted!" });
    },
    onError: (err: Error) => toast({ title: "Failed to post", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          Discussion Forum
        </h3>
        {user && (
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1" />
            New Thread
          </Button>
        )}
      </div>

      {showNewForm && (
        <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Discussion title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="Share your thoughts, questions, or insights..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!newTitle || !newContent || createMutation.isPending}
                onClick={() => createMutation.mutate({ title: newTitle, content: newContent })}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      )}

      {!isLoading && (discussions as any[]).length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No discussions yet. Start a conversation!</p>
        </div>
      )}

      {(discussions as any[]).map((d: any) => (
        <Card key={d.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                  {(d.authorName ||"?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{d.title}</h4>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{d.authorName}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{d.content}</p>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs h-7 px-2 text-indigo-600"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                >
                  {expandedId === d.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                  {d.replyCount || 0} {d.replyCount === 1 ?"reply" :"replies"}
                </Button>

                {expandedId === d.id && (
                  <div className="mt-3 pl-4 border-l-2 border-indigo-200 space-y-3">
                    {(replies as any[]).map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2">
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarFallback className="text-[10px] bg-slate-100">
                            {(r.authorName ||"?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{r.authorName}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{r.content}</p>
                        </div>
                      </div>
                    ))}

                    {user && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Write a reply..."
                          className="h-8 text-xs"
                          value={replyContent[d.id] ||""}
                          onChange={e => setReplyContent(prev => ({ ...prev, [d.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key ==="Enter" && !e.shiftKey && replyContent[d.id]?.trim()) {
                              e.preventDefault();
                              replyMutation.mutate({ discussionId: d.id, content: replyContent[d.id] });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700"
                          disabled={!replyContent[d.id]?.trim() || replyMutation.isPending}
                          onClick={() => {
                            if (replyContent[d.id]?.trim()) {
                              replyMutation.mutate({ discussionId: d.id, content: replyContent[d.id] });
                            }
                          }}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
