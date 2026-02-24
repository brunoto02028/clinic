"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Mic, MicOff, Loader2, Check, X, Send, RotateCcw, MessageSquare } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Step = "idle" | "listening" | "confirm-transcript" | "generating" | "preview" | "error" | "chat";

const VOICE_LANGS = [
  { code: "pt-BR", label: "PT", full: "Português (BR)" },
  { code: "pt-PT", label: "PT", full: "Português (PT)" },
  { code: "en-GB", label: "EN", full: "English (UK)" },
  { code: "en-US", label: "EN", full: "English (US)" },
];

function getStoredLang(): string {
  if (typeof window === "undefined") return "pt-BR";
  return localStorage.getItem("ai_voice_lang") || navigator.language || "pt-BR";
}

function setStoredLang(lang: string) {
  if (typeof window !== "undefined") localStorage.setItem("ai_voice_lang", lang);
}

interface AIFieldHelperProps {
  fieldName: string;
  fieldLabel: string;
  currentValue: string;
  context?: string;
  language?: string;
  onApply: (text: string) => void;
}

export function AIFieldHelper({
  fieldName,
  fieldLabel,
  currentValue,
  context,
  language = "British English",
  onApply,
}: AIFieldHelperProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [chatInstruction, setChatInstruction] = useState("");
  const [voiceLang, setVoiceLang] = useState<string>("pt-BR");
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    setVoiceLang(getStoredLang());
  }, []);

  // Reset when popover closes
  useEffect(() => {
    if (!open) {
      stopListening();
      setStep("idle");
      setTranscript("");
      setEditedTranscript("");
      setPreview("");
      setError("");
      setChatInstruction("");
    }
  }, [open]);

  // ── Voice ──────────────────────────────────────────────
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported. Please use Chrome or Edge.");
      setStep("error");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = voiceLang || getStoredLang();
    transcriptRef.current = "";

    rec.onresult = (e: any) => {
      let interim = "";
      let final = transcriptRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      transcriptRef.current = final;
      setTranscript(final + interim);
    };

    rec.onend = () => {
      const final = transcriptRef.current.trim();
      if (final) {
        setTranscript(final);
        setEditedTranscript(final);
        setStep("confirm-transcript");
      } else {
        setStep("idle");
      }
    };

    rec.onerror = (e: any) => {
      setError(`Microphone error: ${e.error}. Please allow microphone access.`);
      setStep("error");
    };

    recognitionRef.current = rec;
    rec.start();
    setStep("listening");
    setTranscript("");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const handleStopListening = () => {
    stopListening();
    // onend will fire and set step to confirm-transcript
  };

  // ── AI Generate ────────────────────────────────────────
  const generateFromInstruction = async (instruction: string) => {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/admin/settings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldName,
          fieldLabel,
          currentValue,
          context: instruction || context,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setPreview(data.text);
      setStep("preview");
    } catch (err: any) {
      setError(err.message);
      setStep("error");
    }
  };

  const generateFromTranscript = async () => {
    const text = editedTranscript.trim();
    if (!text) return;
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/admin/settings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldName,
          fieldLabel,
          currentValue: text,
          context: `The user dictated the following via voice for the "${fieldLabel}" field of a physiotherapy clinic website. Clean up grammar/spelling, make it professional, and keep the original meaning. Voice transcript: "${text}"`,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setPreview(data.text);
      setStep("preview");
    } catch (err: any) {
      setError(err.message);
      setStep("error");
    }
  };

  const applyPreview = () => {
    onApply(preview);
    setOpen(false);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            title="AI Assistant"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-84 p-0" align="end" style={{ width: 340 }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-purple-50/50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-semibold text-purple-900">AI Assistant</p>
            <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">{fieldLabel}</span>
          </div>

          <div className="p-4 space-y-3">

            {/* IDLE — choose action */}
            {step === "idle" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">How would you like to create content?</p>
                <Button size="sm" className="w-full gap-2" onClick={() => generateFromInstruction(context || "")}>
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={startListening}>
                  <Mic className="h-3.5 w-3.5 text-blue-600" /> Dictate with Voice
                </Button>
                <Button size="sm" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => setStep("chat")}>
                  <MessageSquare className="h-3.5 w-3.5" /> Give AI instructions
                </Button>
                <div className="pt-1 border-t">
                  <p className="text-[10px] text-muted-foreground mb-1">Voice language / Idioma da voz:</p>
                  <div className="flex gap-1 flex-wrap">
                    {VOICE_LANGS.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => { setVoiceLang(l.code); setStoredLang(l.code); }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          voiceLang === l.code
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-muted text-muted-foreground border-border hover:border-blue-400"
                        }`}
                        title={l.full}
                      >
                        {l.full}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LISTENING — live transcript */}
            {step === "listening" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-sm font-medium text-red-600">Listening...</p>
                </div>
                <div className="min-h-[60px] bg-muted/50 rounded-md p-3 text-sm border text-muted-foreground italic">
                  {transcript || "Start speaking..."}
                </div>
                <Button size="sm" variant="destructive" className="w-full gap-2" onClick={handleStopListening}>
                  <MicOff className="h-3.5 w-3.5" /> Stop & Review
                </Button>
              </div>
            )}

            {/* CONFIRM TRANSCRIPT — user reviews/edits what AI heard */}
            {step === "confirm-transcript" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Is this what you said?</p>
                  <p className="text-xs text-muted-foreground">Edit if needed, then confirm.</p>
                </div>
                <textarea
                  className="w-full min-h-[80px] text-sm border rounded-md p-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={generateFromTranscript}>
                    <Check className="h-3.5 w-3.5" /> Yes, Generate
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={startListening}>
                    <RotateCcw className="h-3.5 w-3.5" /> Re-record
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* CHAT — type instructions */}
            {step === "chat" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Tell the AI what you want for <strong>{fieldLabel}</strong>:</p>
                <textarea
                  className="w-full min-h-[80px] text-sm border rounded-md p-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder={`e.g. "Write a professional meta description about physiotherapy in Richmond, focusing on sports injuries"`}
                  value={chatInstruction}
                  onChange={(e) => setChatInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && chatInstruction.trim()) {
                      generateFromInstruction(chatInstruction.trim());
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    disabled={!chatInstruction.trim()}
                    onClick={() => generateFromInstruction(chatInstruction.trim())}
                  >
                    <Send className="h-3.5 w-3.5" /> Generate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Tip: Ctrl+Enter to send</p>
              </div>
            )}

            {/* GENERATING */}
            {step === "generating" && (
              <div className="flex items-center gap-3 py-4 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">AI is writing...</p>
              </div>
            )}

            {/* PREVIEW — show generated text for approval */}
            {step === "preview" && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">AI generated this:</p>
                <div className="bg-purple-50/60 border border-purple-200 rounded-md p-3 text-sm max-h-48 overflow-y-auto">
                  {preview}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={applyPreview}>
                    <Check className="h-3.5 w-3.5" /> Apply
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => generateFromInstruction(context || "")}>
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStep("chat")}>
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {step === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{error}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setStep("idle")}>
                  Try Again
                </Button>
              </div>
            )}

          </div>
        </PopoverContent>
      </Popover>

      {/* Standalone mic button (outside popover, for quick access) */}
      <StandaloneMicButton
        fieldLabel={fieldLabel}
        onTranscriptConfirmed={(text) => {
          setEditedTranscript(text);
          setTranscript(text);
          setStep("confirm-transcript");
          setOpen(true);
        }}
      />
    </div>
  );
}

// Standalone mic button that opens the popover at confirm-transcript step
function StandaloneMicButton({
  fieldLabel,
  onTranscriptConfirmed,
}: {
  fieldLabel: string;
  onTranscriptConfirmed: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported. Please use Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = getStoredLang();
    transcriptRef.current = "";

    rec.onresult = (e: any) => {
      let interim = "";
      let final = transcriptRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      transcriptRef.current = final;
      setLiveText(final + interim);
    };

    rec.onend = () => {
      setListening(false);
      setLiveText("");
      const final = transcriptRef.current.trim();
      if (final) {
        onTranscriptConfirmed(final);
      }
    };

    rec.onerror = () => {
      setListening(false);
      setLiveText("");
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${listening ? "text-red-600 bg-red-50 animate-pulse" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
        onClick={toggle}
        title={listening ? "Stop & review transcript" : `Dictate "${fieldLabel}"`}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </Button>
      {listening && liveText && (
        <div className="absolute right-0 top-8 z-50 w-56 bg-background border rounded-md shadow-lg p-2 text-xs text-muted-foreground">
          {liveText}
        </div>
      )}
    </div>
  );
}
