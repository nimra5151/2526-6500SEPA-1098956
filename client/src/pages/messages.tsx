import { useState, useEffect, useRef, useCallback } from"react";
import { useQuery, useMutation } from"@tanstack/react-query";
import { useSearch } from"wouter";
import { useAuth } from"@/lib/auth";
import { authFetch } from"@/lib/api";
import { queryClient } from"@/lib/queryClient";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { Badge } from"@/components/ui/badge";
import { Skeleton } from"@/components/ui/skeleton";
import { ScrollArea } from"@/components/ui/scroll-area";
import { motion } from"framer-motion";
import { Send, MessageSquare, ArrowLeft, Shield, SquarePen, Search } from"lucide-react";
import { useToast } from"@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from"@/components/ui/dialog";

function getWsUrl(token: string) {
  const protocol = window.location.protocol ==="https:" ?"wss:" :"ws:";
  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const toUserId = new URLSearchParams(search).get("to");
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedConvoRef = useRef<any>(null);
  // #129: ref map for scrolling active conversation button into view
  const convoButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  // Keep ref in sync so the WS handler always has the latest value
  useEffect(() => { selectedConvoRef.current = selectedConvo; }, [selectedConvo]);
  // #129: scroll selected conversation button into view when selection changes
  useEffect(() => {
    if (selectedConvo?.otherUserId) {
      convoButtonRefs.current[selectedConvo.otherUserId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedConvo?.otherUserId]);

  const handleUserSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await authFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const startNewConversation = (user: any) => {
    setSelectedConvo({ otherUserId: user.id, otherUserName: user.name, unreadCount: 0, lastMessage: "" });
    setNewChatOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const { data: conversations, isLoading: convosLoading } = useQuery({
    queryKey: ["/api/messages/conversations"],
    queryFn: () => authFetch("/api/messages/conversations"),
    // No refetchInterval — WS handler calls invalidateQueries on every new message
  });

  // Auto-select conversation when navigated from a profile's Message button (?to=userId)
  useEffect(() => {
    if (!toUserId || !conversations || selectedConvo) return;
    const existing = (conversations as any[]).find((c: any) => String(c.otherUserId) === toUserId);
    if (existing) {
      setSelectedConvo(existing);
    } else {
      // No existing conversation — create a synthetic placeholder so the chat panel opens
      setSelectedConvo({ otherUserId: Number(toUserId), otherUserName: "New Conversation", unreadCount: 0, lastMessage: "" });
    }
  }, [toUserId, conversations]);

  const { data: chatMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ["/api/messages", selectedConvo?.otherUserId],
    queryFn: () => authFetch(`/api/messages/${selectedConvo?.otherUserId}`),
    enabled: !!selectedConvo?.otherUserId,
  });

  const wsRetriesRef = useRef(0);

  // WebSocket connection
  const connectWs = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl(token));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type ==="message") {
          const msg = data.payload;
          const convo = selectedConvoRef.current;
          // Update the active conversation messages
          if (convo && (msg.senderId === convo.otherUserId || msg.receiverId === convo.otherUserId)) {
            queryClient.setQueryData(
              ["/api/messages", convo.otherUserId],
              (old: any[] = []) => {
                if (old.find((m) => m.id === msg.id)) return old;
                return [...old, msg];
              }
            );
            // Mark incoming messages as read immediately so DB stays in sync
            if (msg.senderId === convo.otherUserId) {
              authFetch(`/api/messages/${convo.otherUserId}/read`, { method: "PATCH" }).catch(() => {});
            }
          }
          // Refresh conversation list to update unread counts / last message
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
        }
      } catch (e) { console.warn("WS message parse error:", e); }
    };

    ws.onerror = (err) => { console.error("Messages WS error:", err); };

    ws.onopen = () => {
      wsRetriesRef.current = 0; // reset backoff counter on successful connect
    };

    ws.onclose = () => {
      if (wsRetriesRef.current < 10) {
        setTimeout(connectWs, Math.min(3000 * Math.pow(2, wsRetriesRef.current), 30000));
        wsRetriesRef.current++;
      }
    };
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWs]);

  const sendMutation = useMutation({
    mutationFn: () =>
      authFetch("/api/messages", {
        method:"POST",
        body: JSON.stringify({
          receiverId: selectedConvo?.otherUserId,
          content: message,
          conversationId: [user?.id, selectedConvo?.otherUserId].sort().join("-"),
        }),
      }),
    onSuccess: () => {
      setMessage("");
      // The WS broadcast will update the messages list automatically;
      // also invalidate as a fallback for the sender side
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConvo?.otherUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to send message", variant: "destructive" }),
  });

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) sendMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" data-testid="text-messages">Messages</h1>
            <p className="text-sm text-muted-foreground">Chat with tutors and students</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setNewChatOpen(true)}>
            <SquarePen className="w-4 h-4" /> New Chat
          </Button>
        </div>

        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {searchLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-md text-left hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Type a name to search</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height:"calc(100vh - 16rem)" }}>
          <Card className={`${selectedConvo ?"hidden md:block" :""}`}>
            <CardContent className="pt-4 p-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  {convosLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                  ) : (conversations?.length || 0) > 0 ? (
                    conversations.map((convo: any) => {
                      const initials = convo.otherUserName
                        ? convo.otherUserName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                        :"U";
                      return (
                        <button
                          key={convo.otherUserId}
                          ref={(el) => { convoButtonRefs.current[convo.otherUserId] = el; }}
                          onClick={() => setSelectedConvo(convo)}
                          className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                            selectedConvo?.otherUserId === convo.otherUserId
                              ? "bg-primary/10"
                              : ""
                          }`}
                          data-testid={`convo-${convo.otherUserId}`}
                        >
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-medium text-sm truncate">{convo.otherUserName}</p>
                              {convo.unreadCount > 0 && (
                                <Badge variant="default" className="text-[10px] h-5 min-w-5 px-1.5">{convo.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{convo.lastMessage}</p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                        <MessageSquare className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1" data-testid="text-no-conversations">
                        No conversations yet
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                        Start a conversation by messaging a tutor or student from their profile.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className={`md:col-span-2 ${!selectedConvo ?"hidden md:flex" :"flex"} flex-col`}>
            <CardContent className="flex flex-col h-full pt-4 p-0">
              {selectedConvo ? (
                <>
                  <div className="flex items-center gap-3 px-4 pb-3 border-b">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedConvo(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {selectedConvo.otherUserName?.[0]?.toUpperCase() ||"U"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{selectedConvo.otherUserName}</p>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-muted-foreground/60 border-b" data-testid="safety-banner">
                    <Shield className="w-3 h-3 shrink-0" /> Messages are monitored for safety
                  </div>

                  <ScrollArea className="flex-1 px-4 py-3" ref={messagesContainerRef as any}>
                    <div className="space-y-3">
                      {msgsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-3/4" />)
                      ) : (
                        (chatMessages || []).map((msg: any) => {
                          const isMine = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isMine ?"justify-end" :"justify-start"}`}>
                              <div
                                className={`max-w-[75%] px-3 py-2 rounded-md text-sm ${
                                  isMine
                                    ?"bg-primary text-primary-foreground"
                                    :"bg-muted"
                                }`}
                              >
                                {msg.content}
                                <p className={`text-[10px] mt-1 ${isMine ?"text-primary-foreground/60" :"text-muted-foreground"}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                        className="flex-1 pr-14"
                        data-testid="input-message"
                        maxLength={2000}
                      />
                      {message.length > 1800 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{2000 - message.length}</span>
                      )}
                    </div>
                    {/* #126: show pending spinner while message is being sent */}
                    <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending} data-testid="button-send">
                      {sendMutation.isPending
                        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
