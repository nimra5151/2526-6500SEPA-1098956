import { useState, useEffect, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MessageSquare,
  Phone, PlayCircle, ExternalLink, Circle,
  Loader2, ArrowLeft, Wifi, WifiOff, Copy, Check, AlertTriangle,
} from 'lucide-react';

function safeOpen(url: string | undefined | null) {
  if (!url) return;
  if (!url.startsWith('https://') && !url.startsWith('http://')) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function LiveClass() {
  const [, params] = useRoute('/live-class/:id');
  const classId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  // Local camera state (preview only — actual meeting is on Zoom)
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [copied, setCopied] = useState(false);
  // #127: track how long student has been waiting for teacher
  const [waitSeconds, setWaitSeconds] = useState(0);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Fetch class details
  const { data: cls } = useQuery({
    queryKey: ["/api/classes", classId],
    queryFn: () => authFetch(`/api/classes/${classId}`),
    enabled: !!classId && classId !== 'new',
  });

  // Fetch Zoom meeting info
  const { data: zoomInfo, isLoading: zoomLoading, isError: zoomError, error: zoomErrorMsg } = useQuery({
    queryKey: ['zoom', classId],
    queryFn: () => authFetch(`/api/live-class/${classId}/zoom`),
    enabled: !!classId && classId !== 'new',
    refetchInterval: 30000,
  });
  const isTeacher = user && cls && user.id === cls.tutorId;

  // Check if user is enrolled in the class
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', classId, user?.id],
    queryFn: () => authFetch(`/api/classes/${classId}/enrollment`),
    enabled: !!classId && !!user && classId !== 'new' && !isTeacher,
  });
  const isEnrolled = !!(enrollment as any)?.isEnrolled;

  // #165: recordings
  const { data: recordings = [] } = useQuery<any[]>({
    queryKey: ['zoom-recordings', classId],
    queryFn: () => authFetch(`/api/live-class/${classId}/zoom/recordings`),
    enabled: !!classId && classId !== 'new',
    staleTime: 60_000,
  });

  // #127: start / stop wait timer when student is waiting
  useEffect(() => {
    const zoomExists = (zoomInfo as any)?.exists;
    if (!isTeacher && isEnrolled && !zoomExists && !zoomLoading && !zoomError) {
      waitTimerRef.current = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    } else {
      if (waitTimerRef.current) clearInterval(waitTimerRef.current);
      setWaitSeconds(0);
    }
    return () => { if (waitTimerRef.current) clearInterval(waitTimerRef.current); };
  }, [isTeacher, isEnrolled, (zoomInfo as any)?.exists, zoomLoading, zoomError]);

  // Create Zoom meeting
  const createMeetingMutation = useMutation({
    mutationFn: () =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom', classId] });
      toast({ title: 'Zoom meeting created! Opening host link...' });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not create Zoom meeting',
        description: err.message?.includes('not configured')
          ? 'Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET in your .env file'
          : err.message,
        variant: 'destructive',
      });
    },
  });

  // End Zoom meeting
  const endMeetingMutation = useMutation({
    mutationFn: () =>
      authFetch(`/api/live-class/${classId}/zoom`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom', classId] });
      toast({ title: 'Zoom meeting ended' });
    },
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Start local camera preview
  const goLive = async () => {
    if (isLive) return; // prevent duplicate streams
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isCameraOn, audio: isMicOn });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setIsLive(true);
    } catch {
      toast({ title: 'Camera/mic access denied', variant: 'destructive' });
    }
  };

  const endLive = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsLive(false);
  };

  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOn(p => !p);
  };

  const copyJoinLink = () => {
    if (zoomInfo?.joinUrl) {
      navigator.clipboard.writeText(zoomInfo.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateAndOpen = async () => {
    const result = await createMeetingMutation.mutateAsync();
    if (result?.hostUrl) safeOpen(result.hostUrl);
  };

  const zoomExists = zoomInfo?.exists;
  const joinUrl = zoomInfo?.joinUrl;
  const hostUrl = zoomInfo?.hostUrl;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={user?.role === "tutor" ? "/teacher-dashboard" : user?.role === "coordinator" ? "/admin" : "/student-dashboard"}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">
              {cls?.title || 'Live Class Studio'}
            </h1>
            {isLive && (
              <Badge className="bg-red-500 text-white border-0 animate-pulse">
                <Circle className="w-3 h-3 mr-1 fill-white" /> LIVE PREVIEW
              </Badge>
            )}
            {zoomExists && (
              <Badge className="bg-green-600 text-white border-0">
                <Wifi className="w-3 h-3 mr-1" /> Zoom Active
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isTeacher && (
              <>
                {!zoomExists ? (
                  <Button
                    onClick={handleCreateAndOpen}
                    disabled={createMeetingMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {createMeetingMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                      : <><Video className="w-4 h-4 mr-2" /> Start Zoom Meeting</>}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => safeOpen(hostUrl)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Open Zoom (Host)
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => endMeetingMutation.mutate()}
                      disabled={endMeetingMutation.isPending}
                    >
                      <WifiOff className="w-4 h-4 mr-2" /> End Meeting
                    </Button>
                  </>
                )}
              </>
            )}

            {!isTeacher && zoomExists && (
              <Button
                onClick={() => safeOpen(joinUrl)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Join Zoom Meeting
              </Button>
            )}

            {/* Camera preview controls */}
            {!isLive ? (
              <Button onClick={goLive} className="bg-slate-700 hover:bg-slate-600 text-white">
                <PlayCircle className="w-4 h-4 mr-2" /> Preview Camera
              </Button>
            ) : (
              <Button onClick={endLive} variant="outline" className="border-slate-600 text-slate-300">
                Stop Preview
              </Button>
            )}

          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Main area */}
        <div className="flex-1 p-4 flex flex-col gap-4">

          {/* Zoom Meeting Banner */}
          {zoomLoading ? (
            <div className="flex items-center justify-center h-20 bg-slate-800 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : zoomError ? (
            <Card className="bg-red-900/40 border-red-600/50">
              <CardContent className="p-5 text-center">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <h3 className="text-red-400 font-semibold mb-2">Unable to Access Live Session</h3>
                <p className="text-slate-300 text-sm">
                  {zoomErrorMsg?.message || 'You must be enrolled in this class to join the live session.'}
                </p>
              </CardContent>
            </Card>
          ) : zoomExists ? (
            <Card className="bg-blue-900/40 border-blue-600/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 font-semibold text-sm">Zoom Meeting Active</span>
                    </div>
                    <p className="text-slate-300 text-sm">
                      {isTeacher
                        ? 'Your Zoom meeting is live. Students can join using the link below.'
                        : 'Your teacher has started a Zoom meeting. Click to join.'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs text-blue-300 bg-blue-950/60 px-3 py-1 rounded-lg break-all max-w-md">
                        {joinUrl}
                      </code>
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7 w-7 p-0" onClick={copyJoinLink}>
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {isTeacher && hostUrl && (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 font-semibold"
                        onClick={() => safeOpen(hostUrl)}
                      >
                        <Video className="w-4 h-4 mr-2" /> Open as Host
                      </Button>
                    )}
                    {joinUrl && (
                      <Button
                        variant="outline"
                        className="border-blue-500 text-blue-300 hover:bg-blue-900/40"
                        onClick={() => safeOpen(joinUrl)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {isTeacher ? 'Join as Participant' : 'Join Meeting'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/60 border-slate-700 border-dashed">
              <CardContent className="p-5 text-center">
                {isTeacher ? (
                  <>
                    <Video className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-300 font-medium mb-1">No Zoom meeting yet</p>
                    <p className="text-slate-500 text-sm mb-4">
                      Click "Start Zoom Meeting" in the header to create a meeting. Students will instantly see the join link.
                    </p>
                    <Button
                      onClick={handleCreateAndOpen}
                      disabled={createMeetingMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createMeetingMutation.isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating meeting...</>
                        : <><Video className="w-4 h-4 mr-2" /> Start Zoom Meeting</>}
                    </Button>
                  </>
                ) : (
                  <>
                    {waitSeconds >= 600 ? (
                      <>
                        <p className="text-amber-400 font-medium">The teacher hasn't started the meeting yet.</p>
                        <p className="text-slate-500 text-sm mt-1">It's been over 10 minutes. The class may have been cancelled or rescheduled.</p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-10 h-10 mx-auto mb-3 text-slate-500 animate-spin" />
                        <p className="text-slate-300 font-medium">Waiting for teacher to start the meeting...</p>
                        <p className="text-slate-500 text-sm mt-1">This page checks automatically every 30 seconds.</p>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Camera Preview */}
          <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden relative min-h-[200px]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rounded-xl"
              style={{ display: isLive ? 'block' : 'none' }}
            />
            {!isLive && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Monitor className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Local camera preview</p>
                  <p className="text-xs mt-1 opacity-60">Click "Preview Camera" to test your camera</p>
                </div>
              </div>
            )}

            {/* Floating controls */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-700">
              <Button onClick={toggleCamera} variant={isCameraOn ? 'default' : 'destructive'} size="lg" className="rounded-full w-12 h-12 p-0">
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
              <Button onClick={() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setIsMicOn(p => !p); }} variant={isMicOn ? 'default' : 'destructive'} size="lg" className="rounded-full w-12 h-12 p-0">
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <div className="w-px h-8 bg-slate-600" />
              <Button onClick={() => setShowChat(p => !p)} variant="outline" size="lg" className="rounded-full w-12 h-12 p-0">
                <MessageSquare className="w-5 h-5" />
              </Button>
              {isTeacher && (
                <>
                  <div className="w-px h-8 bg-slate-600" />
                  <Button
                    onClick={() => { endLive(); endMeetingMutation.mutate(); }}
                    variant="destructive" size="lg" className="rounded-full w-12 h-12 p-0"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 bg-slate-800 flex flex-col border-l border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Live Chat</h3>
              <p className="text-xs text-slate-400 mt-0.5">Use Zoom chat during the meeting</p>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Chat is available inside Zoom</p>
                {zoomExists && joinUrl && (
                  <Button
                    size="sm"
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => safeOpen(joinUrl)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Zoom
                  </Button>
                )}
              </div>
            </div>
            {/* #165: cloud recordings panel */}
            {recordings.length > 0 && (
              <div className="border-t border-slate-700 p-4">
                <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" /> Recordings
                </h4>
                <ul className="space-y-1">
                  {recordings.map((r: any) => (
                    <li key={r.id}>
                      <a
                        href={r.play_url || r.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {r.recording_type === 'shared_screen_with_speaker_view' ? 'Speaker View' : r.file_type || 'Recording'}
                        {r.file_size ? ` (${(r.file_size / 1e6).toFixed(1)} MB)` : ''}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
