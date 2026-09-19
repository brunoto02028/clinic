"use client";

// Ambient-recording session detail (activity 64, T-6) — view the diarized
// transcript, fix the Speaker A/B labels (plan.md Suposição 6 — manual,
// never guessed), associate a patient if the recording started without
// one selected, and generate a SOAP note from it. Reuses the existing
// generate-soap endpoint (app/api/admin/clinical-scribe/generate-soap)
// without any change — this page just formats the transcript before
// sending it.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Sparkles,
  ClipboardCopy, Search, UserPlus, Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type UtteranceLine = { speaker: string; text: string };

// The raw transcript is always "Speaker X: text" per line (see
// lib/ambient-recording.ts's formatDiarizedTranscript) — parsed back out
// here so the label swap only touches the speaker prefix, never the text.
function parseTranscript(raw: string): UtteranceLine[] {
  const lines = raw.split("\n").filter((line) => line.trim());
  const result: UtteranceLine[] = [];
  for (const line of lines) {
    const match = line.match(/^Speaker (\w+): (.*)$/);
    if (match) {
      result.push({ speaker: match[1], text: match[2] });
    } else if (result.length > 0) {
      // Not a "Speaker X: ..." line — a continuation of the previous
      // utterance (e.g. AssemblyAI's utterance text contained a literal
      // newline). Append instead of creating a fake empty-speaker line.
      result[result.length - 1].text += ` ${line}`;
    } else {
      // No speaker labels at all — the plain-text fallback used when
      // AssemblyAI returns no utterances (see formatDiarizedTranscript /
      // pollAssemblyAITranscript in lib/ambient-recording.ts).
      result.push({ speaker: "", text: line });
    }
  }
  return result;
}

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  RECORDING: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Recording" },
  ENDED: { cls: "bg-muted text-muted-foreground border-border", label: "Ended" },
  MERGING: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Merging" },
  TRANSCRIBING: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Transcribing" },
  TRANSCRIBED: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Transcribed" },
  FAILED: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Failed" },
};

export default function AmbientSessionDetailPage() {
  const params = useParams();
  const sessionId = params?.id as string;
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Speaker label mapping — display/SOAP-generation only, never persisted.
  // Defaults to identity (shows "Speaker A"/"Speaker B" raw) until the
  // therapist picks who's who.
  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({});

  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [associating, setAssociating] = useState(false);

  const [appointmentType, setAppointmentType] = useState("physiotherapy");
  const [language, setLanguage] = useState("en");
  const [generating, setGenerating] = useState(false);
  const [soapNote, setSoapNote] = useState<any>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        if (data.session?.language) setLanguage(data.session.language);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Poll while the session hasn't reached a resting state yet.
  useEffect(() => {
    if (!session || ["TRANSCRIBED", "FAILED"].includes(session.status)) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [session, load]);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
      if (res.ok) setPatientResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  async function associatePatient(patientId: string) {
    setAssociating(true);
    try {
      const res = await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setPatientSearch("");
        setPatientResults([]);
        toast({ title: "Patient associated" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Couldn't associate patient", description: data.error, variant: "destructive" });
      }
    } finally {
      setAssociating(false);
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/admin/clinical-scribe/sessions/${sessionId}/retry`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        toast({ title: "Queued for another attempt" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Couldn't retry", description: data.error, variant: "destructive" });
      }
    } finally {
      setRetrying(false);
    }
  }

  const utterances = session?.transcript ? parseTranscript(session.transcript) : [];
  const speakers = Array.from(new Set(utterances.map((u) => u.speaker).filter(Boolean)));

  const labeledTranscript = utterances
    .map((u) => (u.speaker ? `${speakerLabels[u.speaker] || `Speaker ${u.speaker}`}: ${u.text}` : u.text))
    .join("\n");

  async function generateSOAP() {
    if (!session?.transcript) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/clinical-scribe/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: labeledTranscript,
          patientId: session.patientId || undefined,
          appointmentType,
          language,
        }),
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
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Session not found.</p>
        <Link href="/admin/clinical-ai"><Button variant="outline" size="sm" className="mt-3">Back to Clinical AI Hub</Button></Link>
      </div>
    );
  }

  const statusStyle = STATUS_STYLE[session.status] || STATUS_STYLE.RECORDING;
  const isProcessing = ["ENDED", "MERGING", "TRANSCRIBING"].includes(session.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clinical-ai"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Mic className="h-5 w-5 text-violet-600" /> Recording Session
        </h1>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusStyle.cls}`}>{statusStyle.label}</span>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Started</p><p>{new Date(session.startedAt).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Duration</p><p>{session.durationSeconds ? `${Math.floor(session.durationSeconds / 60)}:${String(session.durationSeconds % 60).padStart(2, "0")}` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Language</p><p>{session.language === "pt" ? "Portuguese" : "English"}</p></div>
            <div><p className="text-xs text-muted-foreground">Chunks captured</p><p>{session.chunkCount}</p></div>
          </div>

          {session.mergedAudioR2Key && (
            <audio controls className="w-full" src={`/api/admin/clinical-scribe/sessions/${sessionId}/audio`} />
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {session.status === "MERGING" ? "Merging recorded chunks…" : session.status === "TRANSCRIBING" && !session.assemblyaiTranscriptId ? "Preparing transcription…" : "Transcribing — this can take a few minutes for a long recording…"}
            </div>
          )}

          {session.status === "FAILED" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-red-300"><AlertTriangle className="h-4 w-4" /> {session.error || "Processing failed."}</p>
              {session.mergedAudioR2Key && (
                <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={retry} disabled={retrying}>
                  {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Try again
                </Button>
              )}
            </div>
          )}

          {session.error && session.status !== "FAILED" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
              {session.error}
            </div>
          )}

          {/* Patient association */}
          {session.patientId ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Patient associated
            </div>
          ) : (
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Associate a patient</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search patient by name or email…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  disabled={associating}
                />
              </div>
              {patientResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {patientResults.map((p: any) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between gap-2"
                      onClick={() => associatePatient(p.id)}
                      disabled={associating}
                    >
                      <span className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5 text-muted-foreground" />{p.firstName} {p.lastName}</span>
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {session.status === "TRANSCRIBED" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Transcript</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => copyToClipboard(labeledTranscript)}>
                <ClipboardCopy className="h-3 w-3" /> Copy
              </Button>
            </div>

            {speakers.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-muted-foreground">Who's who:</span>
                {speakers.map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="font-mono text-muted-foreground">Speaker {s} =</span>
                    <Input
                      className="h-7 w-32 text-xs"
                      placeholder={`Speaker ${s}`}
                      value={speakerLabels[s] || ""}
                      onChange={(e) => setSpeakerLabels((prev) => ({ ...prev, [s]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-96 overflow-y-auto space-y-1.5 text-sm">
              {utterances.length === 0 ? (
                <p className="text-muted-foreground italic">No speech detected in this recording.</p>
              ) : (
                utterances.map((u, i) => (
                  <p key={i}>
                    {u.speaker && (
                      <span className="font-semibold text-bruno-turquoise">{speakerLabels[u.speaker] || `Speaker ${u.speaker}`}:</span>
                    )}{" "}
                    <span>{u.text}</span>
                  </p>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                  <SelectItem value="initial_assessment">Initial Assessment</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="sports_rehab">Sports Rehabilitation</SelectItem>
                  <SelectItem value="chronic_pain">Chronic Pain</SelectItem>
                  <SelectItem value="post_surgical">Post-Surgical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateSOAP} disabled={generating || utterances.length === 0} className="gap-2 bg-violet-600 hover:bg-violet-700">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating…" : "Generate SOAP"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {soapNote && (
        <Card className="border-green-500/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Generated SOAP Note</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => copyToClipboard(`S: ${soapNote.subjective}\n\nO: ${soapNote.objective}\n\nA: ${soapNote.assessment}\n\nP: ${soapNote.plan}`)}>
                <ClipboardCopy className="h-3 w-3" /> Copy All
              </Button>
            </div>
            {soapNote.summary && <p className="text-sm font-medium text-violet-400 bg-violet-500/10 rounded-lg p-3">{soapNote.summary}</p>}
            <div className="grid gap-3">
              {[
                { key: "subjective", label: "S — Subjective" },
                { key: "objective", label: "O — Objective" },
                { key: "assessment", label: "A — Assessment" },
                { key: "plan", label: "P — Plan" },
              ].map(({ key, label }) => (
                <div key={key} className="border-l-4 border-violet-500/50 pl-3 py-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{label}</p>
                  <p className="text-sm">{soapNote[key]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
