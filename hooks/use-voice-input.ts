"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type VoiceStatus = "idle" | "listening" | "processing" | "done" | "error";

interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
  onTranscript?: (transcript: string) => void;
}

interface UseVoiceInputReturn {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language = "pt-BR", continuous = true, onTranscript } = options;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const isSupported = typeof window !== "undefined" && !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const start = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      setStatus("error");
      return;
    }

    // Clean up any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current = final.trim();
        setTranscript(final.trim());
        onTranscript?.(final.trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are not real errors
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.error("[SpeechRecognition] Error:", event.error);
      setError(
        event.error === "not-allowed"
          ? "Microphone access denied. Please allow microphone permission."
          : `Voice recognition error: ${event.error}`
      );
      setStatus("error");
    };

    recognition.onend = () => {
      // If we still have a final transcript, mark as done
      if (finalTranscriptRef.current) {
        setStatus("done");
      } else if (status !== "error") {
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }, [isSupported, language, continuous, onTranscript, status]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript("");
    if (finalTranscriptRef.current) {
      setTranscript(finalTranscriptRef.current);
      setStatus("done");
    } else {
      setStatus("idle");
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setStatus("idle");
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    finalTranscriptRef.current = "";
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return {
    status,
    transcript,
    interimTranscript,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}
