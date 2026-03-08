"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VoiceFormFillProps {
  context: "medical_screening" | "soap_note" | "exercise" | "general";
  fields: string[];
  language?: string;
  onFieldsFilled: (data: Record<string, string>) => void;
  compact?: boolean;
}

const LABELS = {
  "en-GB": {
    title: "Voice Fill",
    subtitle: "Speak naturally — AI fills the form for you",
    explanation: "Press the button and describe your medical history out loud. The AI will listen, understand, and automatically fill in the fields below. You can review and edit after.",
    startSpeaking: "Start Speaking",
    stopFill: "Stop & Fill Form",
    stopFillShort: "Stop & Fill",
    recording: "Recording",
    transcribing: "Transcribing...",
    aiProcessing: "AI is transcribing and filling your form...",
    filled: "Form fields filled successfully!",
    filledShort: "Filled!",
    voiceFill: "Voice Fill",
    tooShort: "Recording too short. Please speak for at least a few seconds.",
    micDenied: "Microphone access denied. Please allow microphone permission.",
  },
  "pt-BR": {
    title: "Preenchimento por Voz",
    subtitle: "Fale naturalmente — a IA preenche o formulário para você",
    explanation: "Pressione o botão e descreva seu histórico médico em voz alta. A IA vai ouvir, entender e preencher automaticamente os campos abaixo. Você pode revisar e editar depois.",
    startSpeaking: "Começar a Falar",
    stopFill: "Parar e Preencher",
    stopFillShort: "Parar",
    recording: "Gravando",
    transcribing: "Transcrevendo...",
    aiProcessing: "A IA está transcrevendo e preenchendo seu formulário...",
    filled: "Campos preenchidos com sucesso!",
    filledShort: "Preenchido!",
    voiceFill: "Voz IA",
    tooShort: "Gravação muito curta. Fale por pelo menos alguns segundos.",
    micDenied: "Acesso ao microfone negado. Permita o acesso ao microfone.",
  },
} as const;

export function VoiceFormFill({
  context,
  fields,
  language = "pt-BR",
  onFieldsFilled,
  compact = false,
}: VoiceFormFillProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const L = (language === "pt-BR" ? LABELS["pt-BR"] : LABELS["en-GB"]);

  const startRecording = useCallback(async () => {
    setError(null);
    setSuccess(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(L.micDenied);
      } else {
        setError(err.message || "Failed to start recording");
      }
    }
  }, [L]);

  const stopAndTranscribe = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    clearInterval(timerRef.current);
    setRecording(false);
    setProcessing(true);

    // Stop the recorder and wait for final data
    const recorder = mediaRecorderRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      recorder.stop();
    });

    // Build blob from chunks
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 100) {
      setError(L.tooShort);
      setProcessing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("context", context);
      formData.append("language", language);
      formData.append("fields", JSON.stringify(fields));

      const res = await fetch("/api/patient/voice-transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");

      if (data.data) {
        onFieldsFilled(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Transcription failed");
    } finally {
      setProcessing(false);
    }
  }, [context, language, fields, onFieldsFilled]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {processing ? (
          <div className="flex items-center gap-1 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{L.transcribing}</span>
          </div>
        ) : success ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>{L.filledShort}</span>
          </div>
        ) : recording ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {L.recording} {formatTime(duration)}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={stopAndTranscribe}
            >
              <MicOff className="h-2.5 w-2.5" /> {L.stopFillShort}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={startRecording}
          >
            <Mic className="h-2.5 w-2.5" /> {L.voiceFill}
          </Button>
        )}
        {error && (
          <span className="text-[10px] text-destructive max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{L.title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">AI</Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {L.subtitle}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {L.explanation}
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {recording ? (
          <>
            <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              {L.recording} {formatTime(duration)}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopAndTranscribe}
              className="gap-1.5"
            >
              <MicOff className="h-3.5 w-3.5" /> {L.stopFill}
            </Button>
          </>
        ) : processing ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{L.aiProcessing}</span>
          </div>
        ) : success ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{L.filled}</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={startRecording}
            className="gap-1.5"
          >
            <Mic className="h-3.5 w-3.5" /> {L.startSpeaking}
          </Button>
        )}
      </div>
    </div>
  );
}
