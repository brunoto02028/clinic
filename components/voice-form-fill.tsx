"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowRight, PenLine, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Step = "idle" | "recording" | "processing" | "review";

interface VoiceFormFillProps {
  context: "medical_screening" | "soap_note" | "exercise" | "general";
  fields: string[];
  language?: string;
  onFieldsFilled: (data: Record<string, string>) => void;
  compact?: boolean;
  currentValues?: Record<string, string>;
  fieldLabels?: Record<string, string>;
  smartReview?: boolean;
}

export function VoiceFormFill({
  context,
  fields,
  language = "pt-BR",
  onFieldsFilled,
  compact = false,
  currentValues = {},
  fieldLabels = {},
  smartReview = false,
}: VoiceFormFillProps) {
  const isPt = language === "pt-BR";
  const [step, setStep] = useState<Step>("idle");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [pendingData, setPendingData] = useState<Record<string, string>>({});
  const [filledKeys, setFilledKeys] = useState<string[]>([]);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const appliedSoFarRef = useRef<Record<string, string>>({});

  const getLabel = (key: string) => fieldLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  // Safely convert any value to string (handles arrays, numbers, null, undefined)
  const safeStr = (v: any): string => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  };

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
      setStep("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(isPt ? "Acesso ao microfone negado. Permita o acesso nas configura\u00e7\u00f5es." : "Microphone access denied. Please allow microphone permission.");
      } else {
        setError(err.message || (isPt ? "Falha ao iniciar grava\u00e7\u00e3o" : "Failed to start recording"));
      }
    }
  }, [isPt]);

  const stopAndTranscribe = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    clearInterval(timerRef.current);
    setStep("processing");

    const recorder = mediaRecorderRef.current;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 100) {
      setError(isPt ? "Grava\u00e7\u00e3o muito curta. Fale por pelo menos alguns segundos." : "Recording too short. Please speak for at least a few seconds.");
      setStep("idle");
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
      if (!res.ok) throw new Error(data.error || (isPt ? "Falha na transcri\u00e7\u00e3o" : "Transcription failed"));

      if (data.data && smartReview) {
        try {
          // Merge with previously applied data
          const merged = { ...appliedSoFarRef.current, ...data.data };
          setPendingData(merged);

          // Determine which fields were filled vs still missing
          const allValues = { ...currentValues, ...appliedSoFarRef.current, ...data.data };
          const filled: string[] = [];
          const missing: string[] = [];
          for (const f of fields) {
            const mergedVal = safeStr(merged[f]);
            const allVal = safeStr(allValues[f]);
            if (mergedVal.trim()) {
              filled.push(f);
            } else if (!allVal.trim()) {
              missing.push(f);
            }
          }
          setFilledKeys(filled);
          setMissingKeys(missing);
          setStep("review");
        } catch (reviewErr: any) {
          // If review logic fails, still apply the data so patient doesn't lose it
          console.error("Review error, auto-applying data:", reviewErr);
          onFieldsFilled(data.data);
          setSuccess(true);
          setStep("idle");
          setTimeout(() => setSuccess(false), 4000);
        }
      } else if (data.data) {
        // Legacy: no review, apply directly
        onFieldsFilled(data.data);
        setSuccess(true);
        setStep("idle");
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err: any) {
      // If we already had accumulated data, auto-apply it so the patient doesn't lose progress
      const accumulated = appliedSoFarRef.current;
      if (accumulated && Object.keys(accumulated).length > 0) {
        onFieldsFilled(accumulated);
        setError(isPt
          ? "Houve um erro, mas os dados j\u00e1 preenchidos foram salvos. Voc\u00ea pode continuar."
          : "There was an error, but previously filled data was saved. You can continue.");
      } else {
        setError(err.message || (isPt ? "Falha na transcri\u00e7\u00e3o. Tente novamente." : "Transcription failed. Please try again."));
      }
      setStep("idle");
    }
  }, [context, language, fields, onFieldsFilled, smartReview, currentValues, isPt]);

  const applyAndContinue = useCallback(() => {
    onFieldsFilled(pendingData);
    appliedSoFarRef.current = { ...appliedSoFarRef.current, ...pendingData };
    setPendingData({});
    // Keep missingKeys visible so patient sees them during next recording
    setStep("idle");
    setTimeout(() => startRecording(), 300);
  }, [pendingData, onFieldsFilled, startRecording]);

  const applyAndClose = useCallback(() => {
    onFieldsFilled(pendingData);
    appliedSoFarRef.current = {};
    setPendingData({});
    setSuccess(true);
    setStep("idle");
    setTimeout(() => setSuccess(false), 4000);
  }, [pendingData, onFieldsFilled]);

  const discard = useCallback(() => {
    setPendingData({});
    appliedSoFarRef.current = {};
    setStep("idle");
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {step === "processing" ? (
          <div className="flex items-center gap-1 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{isPt ? "Transcrevendo..." : "Transcribing..."}</span>
          </div>
        ) : success ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>{isPt ? "Preenchido!" : "Filled!"}</span>
          </div>
        ) : step === "recording" ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatTime(duration)}
            </span>
            <Button type="button" variant="destructive" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={stopAndTranscribe}>
              <MicOff className="h-2.5 w-2.5" /> {isPt ? "Parar" : "Stop"}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={startRecording}>
            <Mic className="h-2.5 w-2.5" /> {isPt ? "Voz" : "Voice"}
          </Button>
        )}
        {error && <span className="text-[10px] text-destructive max-w-[200px] truncate" title={error}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{isPt ? "Preenchimento por Voz" : "Voice Fill"}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">AI</Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {isPt ? "Fale naturalmente \u2014 a IA preenche o formul\u00e1rio para voc\u00ea" : "Speak naturally \u2014 AI fills the form for you"}
        </span>
      </div>

      {!smartReview && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isPt
            ? "Pressione o bot\u00e3o e descreva seu hist\u00f3rico m\u00e9dico em voz alta. A IA vai ouvir, entender e preencher automaticamente os campos abaixo. Voc\u00ea pode revisar e editar depois."
            : "Press the button and describe your medical history out loud. The AI will listen, understand, and automatically fill in the fields below. You can review and edit afterwards."}
        </p>
      )}

      {smartReview && step === "idle" && !success && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isPt
            ? "Pressione o bot\u00e3o e fale sobre seu hist\u00f3rico. Ap\u00f3s ouvir, a IA vai mostrar o que entendeu e quais campos ainda faltam. Voc\u00ea decide se quer continuar falando ou preencher manualmente."
            : "Press the button and talk about your history. After listening, the AI will show what it understood and which fields are still missing. You decide whether to keep talking or fill in manually."}
        </p>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </div>
      )}

      {/* Review Mode */}
      {step === "review" && (
        <div className="space-y-3">
          {/* Filled fields */}
          {filledKeys.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                {isPt ? "A IA entendeu:" : "AI understood:"}
              </p>
              <div className="space-y-1">
                {filledKeys.map((k) => (
                  <div key={k} className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-xs">
                    <span className="font-medium text-emerald-300">{getLabel(k)}:</span>{" "}
                    <span className="text-foreground/80">{pendingData[k]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing fields */}
          {missingKeys.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-amber-400">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {isPt ? `Ainda faltam ${missingKeys.length} campo(s):` : `Still missing ${missingKeys.length} field(s):`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeys.map((k) => (
                  <span key={k} className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full px-2.5 py-0.5 text-[11px]">
                    {getLabel(k)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {missingKeys.length > 0 && (
              <Button type="button" size="sm" onClick={applyAndContinue} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Mic className="h-3.5 w-3.5" />
                {isPt ? "Aplicar e Continuar Falando" : "Apply & Keep Talking"}
              </Button>
            )}
            <Button type="button" size="sm" variant="default" onClick={applyAndClose} className="gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              {missingKeys.length > 0
                ? (isPt ? "Aplicar e Preencher Manualmente" : "Apply & Fill Manually")
                : (isPt ? "Aplicar Tudo" : "Apply All")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={discard} className="gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              {isPt ? "Descartar" : "Discard"}
            </Button>
          </div>
        </div>
      )}

      {/* Recording / Processing / Idle */}
      {step !== "review" && (
        <div className="space-y-3">
          {/* Show missing fields during recording/processing so patient knows what to talk about */}
          {(step === "recording" || step === "processing") && missingKeys.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-amber-400">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {isPt ? `Fale sobre estes campos (${missingKeys.length}):` : `Talk about these fields (${missingKeys.length}):`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeys.map((k) => (
                  <span key={k} className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full px-2.5 py-0.5 text-[11px]">
                    {getLabel(k)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {step === "recording" ? (
              <>
                <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  {isPt ? "Gravando" : "Recording"} {formatTime(duration)}
                </span>
                <Button type="button" variant="destructive" size="sm" onClick={stopAndTranscribe} className="gap-1.5">
                  <MicOff className="h-3.5 w-3.5" /> {isPt ? "Parar e Analisar" : "Stop & Analyze"}
                </Button>
              </>
            ) : step === "processing" ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isPt ? "A IA est\u00e1 analisando o que voc\u00ea disse..." : "AI is analyzing what you said..."}</span>
              </div>
            ) : success ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isPt ? "Campos preenchidos com sucesso!" : "Form fields filled successfully!"}</span>
              </div>
            ) : (
              <Button type="button" variant="default" size="sm" onClick={startRecording} className="gap-1.5">
                <Mic className="h-3.5 w-3.5" /> {isPt ? "Come\u00e7ar a Falar" : "Start Speaking"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
