"use client";

import { useState, useEffect, useRef } from "react";
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

type ActiveTool = "scribe" | "evidence" | "intelligence";

export default function ClinicalAIPage() {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<ActiveTool>("scribe");

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
          onClick={() => setActiveTool("scribe")}
          className="gap-2"
        >
          <Mic className="h-4 w-4" /> Ambient Scribe
        </Button>
        <Button
          variant={activeTool === "evidence" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTool("evidence")}
          className="gap-2"
        >
          <Search className="h-4 w-4" /> Evidence Search
        </Button>
        <Button
          variant={activeTool === "intelligence" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTool("intelligence")}
          className="gap-2"
        >
          <Brain className="h-4 w-4" /> Patient Intelligence
        </Button>
      </div>

      {activeTool === "scribe" && <AmbientScribe />}
      {activeTool === "evidence" && <EvidenceSearch />}
      {activeTool === "intelligence" && <PatientIntelligence />}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AMBIENT CLINICAL SCRIBE
// ═══════════════════════════════════════════════════

function AmbientScribe() {
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err: any) {
      toast({ title: "Microphone access denied", description: err.message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

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

          {/* Recording controls */}
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="gap-2 bg-red-600 hover:bg-red-700">
                <Mic className="h-4 w-4" /> Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse">
                <Square className="h-4 w-4" /> Stop ({formatTime(recordingTime)})
              </Button>
            )}

            {audioBlob && !isRecording && (
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
          </div>
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
