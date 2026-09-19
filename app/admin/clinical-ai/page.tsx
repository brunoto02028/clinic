"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic, MicOff, Loader2, FileText, Search, Brain, Play, Square,
  Sparkles, ClipboardCopy, CheckCircle, AlertTriangle, BookOpen,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { setAmbientRecordingActive } from "@/lib/ambient-recording-guard";

type ActiveTool = "scribe" | "history" | "evidence" | "intelligence";

// Distinguishes "session creation failed" from "mic access failed" inside
// startRecording's single catch block, so the error toast (and the
// zombie-session cleanup) reflect what actually went wrong.
class StartRecordingError extends Error {
  stage: "session" | "mic";
  constructor(stage: "session" | "mic", message: string) {
    super(message);
    this.stage = stage;
  }
}

export default function ClinicalAIPage() {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<ActiveTool>("scribe");
  // A live recording's MediaRecorder/timer/pending uploads live entirely
  // inside AmbientScribe's own state — unmounting it (by switching tabs)
  // orphans all of that with no way to stop or finish it. Block switching
  // away while it's active, same reasoning as the beforeunload guard.
  const [scribeRecording, setScribeRecording] = useState(false);

  const guardedSetActiveTool = (tool: ActiveTool) => {
    if (scribeRecording && tool !== "scribe") {
      toast({
        title: "Recording in progress",
        description: "Stop the current recording before switching tools — leaving this tab would lose the session.",
        variant: "destructive",
      });
      return;
    }
    setActiveTool(tool);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-violet-600" />
          Clinical AI Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ambient Scribe, Evidence Search, and Patient Intelligence — powered by AI
        </p>
      </div>

      {/* Tool Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTool === "scribe" ? "default" : "ghost"}
          size="sm"
          onClick={() => guardedSetActiveTool("scribe")}
          className="gap-2"
        >
          <Mic className="h-4 w-4" /> Ambient Scribe
        </Button>
        <Button
          variant={activeTool === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => guardedSetActiveTool("history")}
          disabled={scribeRecording}
          className="gap-2"
        >
          <FileText className="h-4 w-4" /> History
        </Button>
        <Button
          variant={activeTool === "evidence" ? "default" : "ghost"}
          size="sm"
          onClick={() => guardedSetActiveTool("evidence")}
          disabled={scribeRecording}
          className="gap-2"
        >
          <Search className="h-4 w-4" /> Evidence Search
        </Button>
        <Button
          variant={activeTool === "intelligence" ? "default" : "ghost"}
          size="sm"
          onClick={() => guardedSetActiveTool("intelligence")}
          disabled={scribeRecording}
          className="gap-2"
        >
          <Brain className="h-4 w-4" /> Patient Intelligence
        </Button>
      </div>

      {activeTool === "scribe" && <AmbientScribe onRecordingStateChange={setScribeRecording} />}
      {activeTool === "history" && <AmbientScribeHistory />}
      {activeTool === "evidence" && <EvidenceSearch />}
      {activeTool === "intelligence" && <PatientIntelligence />}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AMBIENT CLINICAL SCRIBE
// ═══════════════════════════════════════════════════

function AmbientScribe({ onRecordingStateChange }: { onRecordingStateChange?: (active: boolean) => void }) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState<any>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [patientRecordings, setPatientRecordings] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [language, setLanguage] = useState("en");
  const [patientId, setPatientId] = useState("");
  const [appointmentType, setAppointmentType] = useState("physiotherapy");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  // Mirrors `recordingTime` for use inside closures set up once at recorder
  // start (ondataavailable), which would otherwise only ever see time=0.
  const recordingTimeRef = useRef(0);
  // Live ambient-recording session (activity 64, T-2) — each MediaRecorder
  // timeslice is uploaded to this session as it's generated, so the
  // recording is durable on the server well before "Stop" is clicked.
  const ambientSessionIdRef = useRef<string | null>(null);
  const nextChunkIndexRef = useRef(0);
  // T-3: how far the recording is actually confirmed-saved, shown next to
  // the timer so there's never a silent gap between "recording" and "safe".
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Count, not a boolean a later successful chunk could silently clear —
  // uploads run concurrently, so chunk 7 succeeding must never hide that
  // chunk 5 permanently failed. Only reset at the start of a new recording.
  const [failedChunkCount, setFailedChunkCount] = useState(0);
  // Points to the session-detail page (T-6) once a recording finishes, so
  // there's an immediate way to reach the transcript/SOAP without waiting
  // for the history list (T-7).
  const [lastFinishedSessionId, setLastFinishedSessionId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  // Every in-flight chunk upload, so "Stop" can wait for them instead of
  // letting the last ~30s vanish if the tab navigates away right after.
  const pendingUploadsRef = useRef<Set<Promise<void>>>(new Set());
  // Chains uploads one at a time — under a degraded connection, each chunk
  // already retries up to ~66s on its own; letting multiple chunks' retry
  // loops run concurrently would only pile more requests onto an already
  // struggling link. A new chunk's upload (retries included) only starts
  // once the previous one has settled.
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Distinguishes a deliberate Stop click from the recorder's track ending
  // on its own — read once inside onstop, which is the single place that
  // resolves isRecording/finalizing regardless of which one happened.
  const userInitiatedStopRef = useRef(false);
  // Re-entrancy guard for startRecording (ref for the synchronous check,
  // state to actually disable the button — see startRecording's comment).
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  // T-8: "live" is the T-2/T-3 incremental-upload flow above. "local" is for
  // a consultation with no internet at all (e.g. a home visit) — the whole
  // recording stays in the browser (chunksRef only, nothing uploaded) until
  // Stop, when the complete file is sent in one shot to the T-8 upload
  // route. No incremental-save protection during the recording itself, but
  // there was no connectivity to protect it with anyway (plan.md Decisão 8).
  const [recordingMode, setRecordingMode] = useState<"live" | "local">("live");
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const uploadChunk = async (sessionId: string, chunkIndex: number, blob: Blob, capturedAt: number) => {
    const formData = new FormData();
    formData.append("audio", blob, `chunk-${chunkIndex}.webm`);
    formData.append("chunkIndex", String(chunkIndex));

    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const res = await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}/chunk`, {
          method: "POST",
          body: formData,
          // A stalled connection (not an immediate network error) would
          // otherwise never resolve/reject, leaving this permanently in
          // pendingUploadsRef and hanging "Stop" forever.
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          // Chunks can resolve out of order under slow networks — only move
          // the "saved up to" mark forward, never backward.
          setLastSavedAt((prev) => (prev === null || capturedAt > prev ? capturedAt : prev));
          return;
        }
      } catch {
        // network error or timeout — fall through to retry
      }
      if (attempt < attempts) await sleep(2000 * attempt);
    }
    // All retries exhausted — surface this loudly. The recording itself
    // keeps running (losing one 30s chunk isn't fatal), but the therapist
    // needs to know, not find out after the consultation is over.
    setFailedChunkCount((n) => n + 1);
    toast({
      title: "Recording chunk failed to save",
      description: "The recording is still running, but part of it may not be backed up. Check your connection.",
      variant: "destructive",
    });
  };

  // Shared by "Gravação local" (Stop, above) and "Enviar áudio gravado"
  // (the file picker, below) — both already have a complete audio file in
  // hand and just need it to enter the pipeline at the same point T-4's
  // merge job would leave it (activity 64, T-8; plan.md Decisão 6). Returns
  // the new session id on success, null on failure (toast already shown).
  const uploadCompleteAudio = async (fileOrBlob: Blob, filename: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("audio", fileOrBlob, filename);
    if (patientId) formData.append("patientId", patientId);
    formData.append("language", language);
    try {
      const res = await fetch("/api/admin/clinical-scribe/sessions/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast({ title: "Recording uploaded", description: "Processing has started — it'll appear as Transcribing shortly." });
      return data.sessionId as string;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const uploadExistingFile = async (file: File) => {
    setUploadingFile(true);
    try {
      const sessionId = await uploadCompleteAudio(file, file.name);
      if (sessionId) setLastFinishedSessionId(sessionId);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    // Re-entrancy guard — the button is only `disabled` by `finalizing`, not
    // during this function's own async gap (session-creation fetch +
    // getUserMedia). A fast double-click in that gap would otherwise start
    // two concurrent recordings sharing the same refs (session id, chunk
    // index, upload queue), corrupting the merge.
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    let sessionCreated = false;
    const mode = recordingMode;
    try {
      // Local mode never talks to the server until Stop — no session to
      // create yet, since there's nothing to upload incrementally against.
      if (mode === "live") {
        const sessionRes = await fetch("/api/admin/clinical-scribe/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: patientId || undefined, language }),
        });
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok) throw new StartRecordingError("session", sessionData.error || "Could not start recording session");
        sessionCreated = true;
        ambientSessionIdRef.current = sessionData.sessionId;
      } else {
        ambientSessionIdRef.current = null;
      }
      nextChunkIndexRef.current = 0;
      // Defensive reset — a promise from a prior recording that somehow
      // never settled must not poison this new one's finalization.
      pendingUploadsRef.current = new Set();
      uploadQueueRef.current = Promise.resolve();
      userInitiatedStopRef.current = false;
      setLastFinishedSessionId(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        throw new StartRecordingError("mic", err.message);
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        chunksRef.current.push(e.data);
        const sessionId = ambientSessionIdRef.current;
        if (mode === "live" && sessionId) {
          const chunkIndex = nextChunkIndexRef.current++;
          const capturedAt = recordingTimeRef.current;
          const upload = uploadQueueRef.current.then(() => uploadChunk(sessionId, chunkIndex, e.data, capturedAt));
          uploadQueueRef.current = upload.catch(() => {});
          pendingUploadsRef.current.add(upload);
          upload.finally(() => pendingUploadsRef.current.delete(upload));
        }
      };

      mediaRecorder.onstop = async () => {
        // onstop fires whether the user clicked Stop OR the track ended on
        // its own (mic disconnected, OS revoked permission, bluetooth
        // headset dropped mid-consultation) — this must be the ONE place
        // that resolves isRecording/finalizing, not stopRecording()'s click
        // handler. Otherwise a spontaneous stop leaves isRecording stuck
        // true forever (stopRecording() never ran), and if the user then
        // clicks Stop anyway, calling .stop() on an already-inactive
        // recorder fires no second onstop — finalizing (and everything
        // gated on it: Start button, tab switching, the nav-link guard)
        // would be stuck true permanently with no way out.
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setFinalizing(true);
        const wasUserInitiated = userInitiatedStopRef.current;
        userInitiatedStopRef.current = false;
        if (!wasUserInitiated) {
          toast({
            title: "Recording stopped unexpectedly",
            description: "The microphone stream ended on its own (device disconnected, permission revoked, or similar). Finalizing what was captured so far.",
            variant: "destructive",
          });
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());

        if (mode === "local") {
          // Nothing was uploaded during the recording — the whole file goes
          // up now, in one shot, the same way an externally-recorded file
          // does (see uploadExistingFile below).
          setUploadingLocal(true);
          try {
            const sessionId = await uploadCompleteAudio(blob, "local-recording.webm");
            if (sessionId) setLastFinishedSessionId(sessionId);
          } finally {
            setUploadingLocal(false);
          }
          setFinalizing(false);
          return;
        }

        // The final ondataavailable (with whatever was left in the buffer)
        // fires before onstop, so its upload is already in this set — wait
        // for every chunk to actually land before telling the server the
        // session is done and safe to merge (activity 64, T-4).
        await Promise.all(pendingUploadsRef.current);
        const sessionId = ambientSessionIdRef.current;
        if (sessionId) {
          setLastFinishedSessionId(sessionId);
          try {
            // Generous — the server merges synchronously (Buffer.concat +
            // R2 upload of the whole recording), which can genuinely take a
            // while for a long consultation. Timing out here does NOT mean
            // it failed — see the status check below.
            await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}/finish`, {
              method: "POST",
              signal: AbortSignal.timeout(120000),
            });
          } catch {
            // The client gave up waiting, but the server-side merge isn't
            // cancelled by that — check whether it actually went through
            // before telling the therapist it failed.
            let actuallyFailed = true;
            try {
              const statusRes = await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}`);
              const statusData = await statusRes.json();
              // Explicit allow-list, not "anything but RECORDING/ENDED" — the
              // server can also land on FAILED (merge error, or no chunks
              // saved), which is a real failure that must still surface.
              const progressed = ["MERGING", "TRANSCRIBING", "TRANSCRIBED"].includes(statusData.session?.status);
              if (statusRes.ok && progressed) {
                actuallyFailed = false;
              }
            } catch {
              // status check itself failed — fall through, still report the error below
            }
            if (actuallyFailed) {
              toast({
                title: "Couldn't finalize the recording session",
                description: "The audio chunks are safely saved — try finishing again, or check the session in the recordings list.",
                variant: "destructive",
              });
            }
          }
        }
        setFinalizing(false);
      };

      // 30s timeslices — frequent enough that a crash loses very little,
      // infrequent enough not to spend most of the recording on upload overhead.
      mediaRecorder.start(30000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      setLastSavedAt(null);
      setFailedChunkCount(0);
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err: any) {
      const stage = err instanceof StartRecordingError ? err.stage : "session";
      toast({
        title: stage === "mic" ? "Microphone access denied" : "Couldn't start recording session",
        description: err.message,
        variant: "destructive",
      });
      // A session got created server-side but recording never actually
      // started (mic permission denied/no device) — that row would
      // otherwise sit at status=RECORDING, chunkCount=0 forever, since
      // nothing else ever calls finish() for it. Reuse the existing finish
      // endpoint — a 0-chunk session already resolves cleanly to FAILED.
      if (sessionCreated && ambientSessionIdRef.current) {
        const orphanedId = ambientSessionIdRef.current;
        ambientSessionIdRef.current = null;
        fetch(`/api/admin/clinical-scribe/sessions/${orphanedId}/finish`, { method: "POST" }).catch(() => {});
      }
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  const stopRecording = () => {
    // Just requests the stop — onstop (above) is the single place that
    // actually resolves isRecording/finalizing, for both this manual path
    // and a spontaneous track-ended stop. Guarded so clicking Stop when the
    // recorder is already inactive (e.g. it stopped on its own moments
    // earlier) is a harmless no-op instead of a second .stop() call that
    // fires no new onstop and would otherwise strand `finalizing` at true.
    userInitiatedStopRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Optimistic — onstop fires asynchronously; setting this now just
      // makes the button respond instantly instead of waiting a beat.
      // Harmless to set "true" from two places, unlike "false" (only
      // onstop ever does that).
      setFinalizing(true);
      mediaRecorderRef.current.stop();
    }
  };

  // Warn before leaving while anything about the recording is still in
  // flight — recording itself, the final chunks finalizing after Stop, or a
  // standalone file upload (T-8's "Upload audio file" button) in progress.
  // `uploadingFile` was originally left out of this guard (code review
  // finding, activity 64 T-8) — a large standalone upload could be silently
  // abandoned by closing the tab, unlike the equivalent local-mode Stop
  // upload, which already went through `finalizing`.
  useEffect(() => {
    if (!isRecording && !finalizing && !uploadingFile) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRecording, finalizing, uploadingFile]);

  // Same "in flight" window, but for things a beforeunload dialog can't
  // stop: VersionChecker's programmatic reload (components/version-checker.tsx)
  // and switching away from this tab inside ClinicalAIPage (which would
  // unmount this component and orphan the MediaRecorder with no way to
  // finish it). Deliberately NO cleanup that touches mediaRecorderRef here —
  // this effect's cleanup re-runs on every isRecording/finalizing change
  // (React runs the previous effect's cleanup before every re-run, not just
  // on unmount), so a cleanup reading the live mediaRecorderRef would fire
  // right as recording starts (isRecording false→true is itself a deps
  // change) and stop the just-created recorder before a single chunk is
  // captured. Just sync the flag; the mount/unmount-only effect below owns
  // actually stopping the recorder.
  useEffect(() => {
    const active = isRecording || finalizing || uploadingFile;
    setAmbientRecordingActive(active);
    onRecordingStateChange?.(active);
  }, [isRecording, finalizing, uploadingFile, onRecordingStateChange]);

  // Defense in depth, real-unmount-only (empty deps — cleanup runs exactly
  // once, on unmount): the click-guard below should prevent this component
  // from ever unmounting mid-recording, but if it somehow does anyway
  // (browser back/forward, or a future nav path that guard doesn't cover),
  // a genuinely orphaned MediaRecorder still capturing audio with no UI to
  // stop it is worse than losing the in-progress session — stop it for
  // real, and clear the flag so a stale "active" doesn't block reloads.
  useEffect(() => {
    return () => {
      setAmbientRecordingActive(false);
      onRecordingStateChange?.(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // empty: this must only run on real mount/unmount, not track
    // onRecordingStateChange's identity (see the sibling effect above).
  }, []);

  // Blocks the realistic way a therapist would accidentally leave mid-
  // recording: clicking any other nav link (admin sidebar, header, etc.).
  // The 3-way tool switcher above is already guarded on its own onClick;
  // this catches everything else that isn't inside the Ambient Scribe card
  // itself. Known gap, accepted for v1: the browser's own Back/Forward
  // button bypasses this (see plan.md Suposição 2 — no mid-recording
  // recovery is attempted either way, chunks already uploaded stay safe in
  // R2 regardless).
  useEffect(() => {
    if (!isRecording && !finalizing && !uploadingFile) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      e.preventDefault();
      e.stopPropagation();
      toast({
        title: uploadingFile ? "Upload in progress" : "Recording in progress",
        description: uploadingFile
          ? "Wait for the upload to finish before navigating away — leaving this page would lose it."
          : "Stop the current recording before navigating away — leaving this page would lose the session.",
        variant: "destructive",
      });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isRecording, finalizing, uploadingFile, toast]);

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "consultation.webm");
      formData.append("language", language);

      const res = await fetch("/api/admin/clinical-scribe/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTranscript(data.transcript);
      toast({ title: "Transcription complete", description: `Provider: ${data.provider}` });
    } catch (err: any) {
      toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
    } finally {
      setTranscribing(false);
    }
  };

  const generateSOAP = async () => {
    if (!transcript.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/clinical-scribe/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, patientId: patientId || undefined, appointmentType, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSoapNote(data.soap);
      toast({ title: "SOAP note generated!" });
    } catch (err: any) {
      toast({ title: "SOAP generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      <Card className="border-violet-400/30 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-900/30">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Ambient Clinical Scribe</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Record your consultation, get it transcribed, and auto-generate SOAP notes with patient context.
          </p>

          {/* Settings row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-800 dark:text-white">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-800 dark:text-white">Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                  <SelectItem value="initial_assessment">Initial Assessment</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="sports_rehab">Sports Rehabilitation</SelectItem>
                  <SelectItem value="chronic_pain">Chronic Pain</SelectItem>
                  <SelectItem value="post_surgical">Post-Surgical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-800 dark:text-white">Patient ID (optional)</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Paste patient ID for context"
              />
            </div>
          </div>

          {/* T-8: recording mode — "live" is the incremental-upload flow
              above (T-2/T-3). "local" is for a site with no internet at all
              (e.g. a home visit): nothing is uploaded until Stop, when the
              whole file is sent at once. Locked once a recording starts so
              a mode swap can't happen mid-recording. */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-800 dark:text-white">Recording mode</Label>
            <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
              <Button
                type="button"
                variant={recordingMode === "live" ? "default" : "ghost"}
                size="sm"
                disabled={isRecording || finalizing}
                onClick={() => setRecordingMode("live")}
                className="gap-2 text-xs h-7"
              >
                Live recording
              </Button>
              <Button
                type="button"
                variant={recordingMode === "local" ? "default" : "ghost"}
                size="sm"
                disabled={isRecording || finalizing}
                onClick={() => setRecordingMode("local")}
                className="gap-2 text-xs h-7"
              >
                Local recording (no internet)
              </Button>
            </div>
          </div>

          {/* Recording controls */}
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} disabled={finalizing || starting || uploadingFile} className="gap-2 bg-red-600 hover:bg-red-700">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                {starting ? "Starting…" : "Start Recording"}
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse">
                <Square className="h-4 w-4" /> Stop ({formatTime(recordingTime)})
              </Button>
            )}

            {audioBlob && !isRecording && !finalizing && (
              <Button onClick={transcribeAudio} disabled={transcribing} variant="outline" className="gap-2">
                {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {transcribing ? "Transcribing..." : "Transcribe"}
              </Button>
            )}

            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-600">Recording...</span>
              </div>
            )}

            {finalizing && !uploadingLocal && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span className="text-sm font-medium text-amber-600">Saving last chunk — don't close this tab…</span>
              </div>
            )}

            {uploadingLocal && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span className="text-sm font-medium text-amber-600">Uploading the full recording — don't close this tab…</span>
              </div>
            )}
          </div>

          {/* T-3: real-time save confirmation for live mode only — local
              mode has nothing incremental to report on (see below instead).
              Never leave the therapist guessing whether the recording is
              actually backed up. Once a chunk permanently fails, this stays
              red for the rest of the recording even if later chunks
              succeed (a later save doesn't undo an earlier loss). */}
          {recordingMode === "live" && (isRecording || finalizing) && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              failedChunkCount > 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}>
              {failedChunkCount > 0 ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
              {failedChunkCount > 0
                ? `${failedChunkCount} chunk${failedChunkCount > 1 ? "s" : ""} failed to save — part of the recording may be missing. Recording continues.`
                : lastSavedAt !== null
                ? `Safely saved up to ${formatTime(lastSavedAt)}`
                : "Waiting for the first automatic save (every 30s)…"}
            </div>
          )}

          {/* T-8: local mode's equivalent of the indicator above — the
              opposite message on purpose, so it's never mistaken for the
              live-mode guarantee. */}
          {recordingMode === "local" && isRecording && (
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Recording locally — nothing has been uploaded yet. The full recording will upload when you stop.
            </div>
          )}

          {/* T-8: upload an already-recorded file (phone voice memo used as
              backup, or any other source) — independent of the recorder
              above, goes through the same upload route as local mode's
              Stop. */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-800 dark:text-white">Or upload an existing recording</Label>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.opus,.aac,.webm,.flac"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadExistingFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRecording || finalizing || uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {uploadingFile ? "Uploading…" : "Upload audio file"}
              </Button>
            </div>
          </div>

          {/* Once finalized, jump straight to the session's transcript/SOAP
              page (T-6) — the history list (T-7) is the other way to get
              there later. */}
          {!isRecording && !finalizing && lastFinishedSessionId && (
            <Link href={`/admin/clinical-ai/sessions/${lastFinishedSessionId}`}>
              <Button variant="outline" size="sm" className="gap-2">
                View transcript & generate SOAP
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Patient Pre-Recordings */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <Mic className="h-4 w-4 text-amber-500" /> Patient Pre-Recordings
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={async () => {
                setLoadingRecordings(true);
                try {
                  const url = patientId
                    ? `/api/admin/clinical-scribe/recordings?status=transcribed&patientId=${patientId}`
                    : `/api/admin/clinical-scribe/recordings?status=transcribed`;
                  const res = await fetch(url);
                  const data = await res.json();
                  setPatientRecordings(data.recordings || []);
                } catch { /* ignore */ } finally { setLoadingRecordings(false); }
              }}
            >
              {loadingRecordings ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Load Patient Recordings
            </Button>
          </div>

          {patientRecordings.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No pending recordings. Click "Load" to check, or paste a Patient ID above to filter.
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {patientRecordings.map((rec: any) => (
                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{rec.patientName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{rec.chiefComplaint || rec.transcript?.slice(0, 80) || "No transcript"}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(rec.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {rec.duration ? ` • ${Math.floor(rec.duration / 60)}:${(rec.duration % 60).toString().padStart(2, "0")}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white ml-2"
                    onClick={() => {
                      // Use as subjective context
                      const subjectiveText = rec.transcript || rec.chiefComplaint || "";
                      setTranscript((prev: string) => prev ? `[Patient Pre-Recording]\n${subjectiveText}\n\n[Consultation]\n${prev}` : subjectiveText);
                      toast({ title: "Patient recording loaded as Subjective context" });
                    }}
                  >
                    Use as Subjective
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Transcription
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transcript)} className="gap-1 text-xs h-7">
                  <ClipboardCopy className="h-3 w-3" /> Copy
                </Button>
                <Button onClick={generateSOAP} disabled={generating} size="sm" className="gap-1 text-xs h-7 bg-violet-600 hover:bg-violet-700">
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generating ? "Generating..." : "Generate SOAP"}
                </Button>
              </div>
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              className="text-sm"
              placeholder="Transcription will appear here. You can also paste/type manually."
            />
          </CardContent>
        </Card>
      )}

      {/* SOAP Note Output */}
      {soapNote && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" /> Generated SOAP Note
              </h3>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(
                `S: ${soapNote.subjective}\n\nO: ${soapNote.objective}\n\nA: ${soapNote.assessment}\n\nP: ${soapNote.plan}`
              )} className="gap-1 text-xs h-7"><ClipboardCopy className="h-3 w-3" /> Copy All</Button>
            </div>

            {soapNote.summary && (
              <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3">
                <p className="text-sm font-medium text-violet-700 dark:text-violet-400">{soapNote.summary}</p>
              </div>
            )}

            <div className="grid gap-3">
              {[
                { key: "subjective", label: "S — Subjective", color: "blue" },
                { key: "objective", label: "O — Objective", color: "green" },
                { key: "assessment", label: "A — Assessment", color: "amber" },
                { key: "plan", label: "P — Plan", color: "purple" },
              ].map(({ key, label, color }) => (
                <div key={key} className={`border-l-4 border-${color}-500 pl-3 py-1`}>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{label}</p>
                  <p className="text-sm">{soapNote[key]}</p>
                </div>
              ))}
            </div>

            {(soapNote.painLevel !== null || soapNote.rangeOfMotion || soapNote.treatmentNotes) && (
              <div className="flex flex-wrap gap-3 text-xs pt-2 border-t">
                {soapNote.painLevel !== null && <Badge variant="outline">Pain: {soapNote.painLevel}/10</Badge>}
                {soapNote.rangeOfMotion && <Badge variant="outline">ROM: {soapNote.rangeOfMotion}</Badge>}
                {soapNote.treatmentNotes && <Badge variant="outline">Tx: {soapNote.treatmentNotes.slice(0, 60)}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual transcript input when no recording */}
      {!transcript && !audioBlob && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h3 className="font-semibold text-sm">Or paste a transcription manually:</h3>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              placeholder="Paste consultation transcription here to generate SOAP notes..."
            />
            {transcript && (
              <Button onClick={generateSOAP} disabled={generating} size="sm" className="gap-1 bg-violet-600 hover:bg-violet-700">
                <Sparkles className="h-3 w-3" /> Generate SOAP
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AMBIENT SCRIBE — SESSION HISTORY (activity 64, T-7)
// ═══════════════════════════════════════════════════

type HistorySession = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  therapist: { firstName: string; lastName: string };
  patient: { id: string; firstName: string; lastName: string } | null;
};

const HISTORY_STATUS_STYLE: Record<string, string> = {
  RECORDING: "bg-red-500/15 text-red-400 border-red-500/30",
  ENDED: "bg-muted text-muted-foreground border-border",
  MERGING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  TRANSCRIBING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  TRANSCRIBED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDuration(seconds: number | null): string {
  // `seconds === 0` (a genuinely instant recording) must not render the same
  // as "not computed yet" (null) — those mean different things on the list.
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AmbientScribeHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Synchronous re-entrancy guard — `loadingMore` state doesn't actually
  // disable the button until after React's next render, so two clicks (or a
  // held Enter key) landing in the same tick can both pass the `disabled`
  // check and fire loadPage with the same cursor, duplicating a page.
  const loadingMoreRef = useRef(false);

  const loadPage = async (before?: string) => {
    try {
      const url = before
        ? `/api/admin/clinical-scribe/sessions?before=${encodeURIComponent(before)}`
        : "/api/admin/clinical-scribe/sessions";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setSessions((prev) => (before ? [...prev, ...data.sessions] : data.sessions));
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load sessions");
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPage().finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recording sessions</h2>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...
        </div>
      )}

      {error && (
        <Card><CardContent className="pt-4 text-sm text-red-500 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </CardContent></Card>
      )}

      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">No recordings yet.</p>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/admin/clinical-ai/sessions/${s.id}`}>
              <Card className="hover:border-violet-400 transition-colors cursor-pointer">
                <CardContent className="pt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : (
                          <span className="text-muted-foreground italic">Not associated</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()} · {formatDuration(s.durationSeconds)} ·{" "}
                        {s.therapist.firstName} {s.therapist.lastName}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={HISTORY_STATUS_STYLE[s.status] || ""}>
                    {s.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {nextCursor && (
        <Button
          variant="outline"
          size="sm"
          disabled={loadingMore}
          onClick={async () => {
            if (loadingMoreRef.current) return;
            loadingMoreRef.current = true;
            setLoadingMore(true);
            try {
              await loadPage(nextCursor);
            } finally {
              loadingMoreRef.current = false;
              setLoadingMore(false);
            }
          }}
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// EVIDENCE-BASED CLINICAL SEARCH
// ═══════════════════════════════════════════════════

function EvidenceSearch() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [speciality, setSpeciality] = useState("musculoskeletal");
  const [language, setLanguage] = useState("en");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);

  const searchEvidence = async () => {
    if (!question.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/admin/clinical-scribe/evidence-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, speciality, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-emerald-400/30 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-900/30">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Evidence-Based Clinical Search</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Ask clinical questions and get answers grounded in research literature with references.
          </p>

          <div className="space-y-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. What is the optimal shockwave protocol for plantar fasciitis? What evidence supports laser therapy for tendinopathy?"
            />
            <div className="flex items-center gap-3">
              <Select value={speciality} onValueChange={setSpeciality}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="musculoskeletal">Musculoskeletal</SelectItem>
                  <SelectItem value="sports_medicine">Sports Medicine</SelectItem>
                  <SelectItem value="pain_science">Pain Science</SelectItem>
                  <SelectItem value="electrotherapy">Electrotherapy</SelectItem>
                  <SelectItem value="post_surgical">Post-Surgical Rehab</SelectItem>
                  <SelectItem value="biomechanics">Biomechanics</SelectItem>
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={searchEvidence} disabled={searching || !question.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? "Searching..." : "Search Evidence"}
              </Button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {[
              "Best shockwave protocol for calcific tendinitis?",
              "MLS laser vs LLLT for chronic pain?",
              "Dry needling evidence for trigger points?",
              "Return-to-sport criteria post-ACL?",
            ].map((s) => (
              <Button key={s} variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuestion(s)}>
                {s.slice(0, 40)}...
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Evidence Summary
              </h3>
              <Badge variant={
                result.evidenceLevel === "Strong" ? "default" :
                result.evidenceLevel === "Moderate" ? "secondary" : "outline"
              }>
                Evidence: {result.evidenceLevel}
              </Badge>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{result.answer}</p>
            </div>

            {result.keyFindings?.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-3">
                <p className="text-xs font-bold mb-2 text-foreground">KEY FINDINGS:</p>
                <ul className="space-y-1">
                  {result.keyFindings.map((f: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.clinicalApplication && (
              <div className="border-l-4 border-violet-500 pl-3 py-1">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Clinical Application</p>
                <p className="text-sm">{result.clinicalApplication}</p>
              </div>
            )}

            {result.references?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">References:</p>
                <div className="space-y-1">
                  {result.references.map((ref: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      [{i + 1}] {ref.authors} ({ref.year}). <em>{ref.title}</em>. {ref.journal}. Level {ref.level}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.relatedQuestions?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Related:</span>
                {result.relatedQuestions.map((q: string, i: number) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs h-6" onClick={() => setQuestion(q)}>
                    {q.slice(0, 50)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PATIENT INTELLIGENCE
// ═══════════════════════════════════════════════════

function PatientIntelligence() {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState("");
  const [language, setLanguage] = useState("en");
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [patientName, setPatientName] = useState("");
  const [meta, setMeta] = useState<any>(null);

  const analyzePatient = async () => {
    if (!patientId.trim()) {
      toast({ title: "Patient ID required", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/admin/clinical-scribe/patient-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReport(data.report);
      setPatientName(data.patientName);
      setMeta({ notes: data.notesAnalysed, appointments: data.appointmentsAnalysed });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const progressIcon = report?.progress?.status === "improving"
    ? <TrendingUp className="h-4 w-4 text-green-600" />
    : report?.progress?.status === "declining"
    ? <TrendingDown className="h-4 w-4 text-red-600" />
    : <Minus className="h-4 w-4 text-amber-600" />;

  return (
    <div className="space-y-4">
      <Card className="border-blue-400/30 dark:border-blue-400/30 bg-blue-50 dark:bg-blue-900/30">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Patient Intelligence</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Comprehensive AI analysis of a patient's entire clinical history. Identifies patterns, risks, and optimal treatment paths.
          </p>

          <div className="flex items-center gap-3">
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID (from patient profile URL)"
              className="flex-1"
            />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={analyzePatient} disabled={analyzing || !patientId.trim()} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {analyzing ? "Analysing..." : "Analyse Patient"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      {report && (
        <div className="space-y-4">
          {/* Header */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{patientName}</h3>
                    <p className="text-xs text-muted-foreground">{meta?.notes} notes | {meta?.appointments} appointments analysed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {progressIcon}
                  <Badge variant={
                    report.progress?.status === "improving" ? "default" :
                    report.progress?.status === "declining" ? "destructive" : "secondary"
                  }>
                    {report.progress?.status || "unknown"}
                  </Badge>
                </div>
              </div>
              <p className="text-sm mt-3">{report.summary}</p>
            </CardContent>
          </Card>

          {/* Progress */}
          {report.progress && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Progress Analysis
                </h4>
                <p className="text-sm">{report.progress.details}</p>
                {report.progress.painTrend && (
                  <p className="text-xs text-muted-foreground mt-1">Pain Trend: {report.progress.painTrend}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {report.risks?.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" /> Risk Alerts
                </h4>
                <div className="space-y-2">
                  {report.risks.map((risk: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={risk.severity === "high" ? "destructive" : risk.severity === "medium" ? "secondary" : "outline"} className="text-xs shrink-0">
                        {risk.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{risk.flag}</p>
                        <p className="text-xs text-muted-foreground">{risk.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600" /> Recommendations
                </h4>
                <ul className="space-y-1.5">
                  {report.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Metrics */}
          {report.metrics && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-3">Key Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{report.metrics.adherence}</p>
                    <p className="text-xs text-muted-foreground">Adherence</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{report.metrics.painReduction}</p>
                    <p className="text-xs text-muted-foreground">Pain Trend</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{report.metrics.functionalImprovement}</p>
                    <p className="text-xs text-muted-foreground">Function</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{report.metrics.estimatedSessionsRemaining}</p>
                    <p className="text-xs text-muted-foreground">Est. Sessions Left</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Predicted Outcome */}
          {report.predictedOutcome && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2">Predicted Outcome</h4>
                <p className="text-sm">{report.predictedOutcome}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
