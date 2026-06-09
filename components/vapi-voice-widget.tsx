"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

declare global {
  interface Window {
    Vapi?: any;
  }
}

interface VapiVoiceWidgetProps {
  className?: string;
}

export function VapiVoiceWidget({ className = "" }: VapiVoiceWidgetProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [config, setConfig] = useState<{ publicKey: string; assistantId: string } | null>(null);
  const [configError, setConfigError] = useState(false);
  const vapiRef = useRef<any>(null);

  // Load Vapi config from server
  useEffect(() => {
    fetch("/api/vapi/web-token")
      .then((r) => r.json())
      .then((data) => {
        if (data.publicKey && data.assistantId) {
          setConfig(data);
        } else {
          setConfigError(true);
        }
      })
      .catch(() => setConfigError(true));
  }, []);

  // Load Vapi Web SDK dynamically
  useEffect(() => {
    if (!config) return;
    if (typeof window === "undefined") return;
    if (window.Vapi) return;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.iife.js";
    script.async = true;
    document.head.appendChild(script);
  }, [config]);

  const initVapi = useCallback(() => {
    if (!config || !window.Vapi) return null;
    if (vapiRef.current) return vapiRef.current;

    const vapi = new window.Vapi(config.publicKey);

    vapi.on("call-start", () => setStatus("active"));
    vapi.on("call-end", () => {
      setStatus("ended");
      setTimeout(() => setStatus("idle"), 3000);
    });
    vapi.on("error", () => {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    });
    vapi.on("volume-level", (level: number) => setVolumeLevel(level));
    vapi.on("speech-start", () => setVolumeLevel(0.6));
    vapi.on("speech-end", () => setVolumeLevel(0));

    vapiRef.current = vapi;
    return vapi;
  }, [config]);

  const startCall = useCallback(async () => {
    if (!config) return;
    setStatus("connecting");

    try {
      // Wait for SDK to load
      let attempts = 0;
      while (!window.Vapi && attempts < 20) {
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }
      if (!window.Vapi) throw new Error("Vapi SDK not loaded");

      const vapi = initVapi();
      if (!vapi) throw new Error("Failed to initialise Vapi");

      await vapi.start(config.assistantId);
    } catch (err) {
      console.error("[VapiWidget] start error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [config, initVapi]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    setStatus("idle");
    setIsMuted(false);
    setVolumeLevel(0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  if (configError) return null; // Don't render if not configured

  const isActive = status === "active";
  const isConnecting = status === "connecting";
  const ringSize = 40 + volumeLevel * 24;

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Expanded panel */}
      {isExpanded && !isActive && !isConnecting && status === "idle" && (
        <div className="mb-4 bg-card border border-border rounded-2xl shadow-2xl p-5 w-72 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">BPR AI Receptionist</p>
                <p className="text-xs text-muted-foreground">Available 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Speak with our AI assistant to book an appointment, ask about our services, or get advice on your condition — any time of day.
          </p>
          <Button onClick={() => { setIsExpanded(false); startCall(); }} className="w-full" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Start Call
          </Button>
        </div>
      )}

      {/* Active / connecting state */}
      {(isActive || isConnecting) && (
        <div className="mb-4 bg-card border border-primary/30 rounded-2xl shadow-2xl p-5 w-72 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative h-9 w-9 flex items-center justify-center">
                {/* Volume pulse rings */}
                {isActive && volumeLevel > 0.1 && (
                  <span
                    className="absolute rounded-full bg-primary/20 transition-all duration-100"
                    style={{ width: ringSize, height: ringSize, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                  />
                )}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  {isConnecting ? "Connecting…" : "Amy — BPR Receptionist"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnecting ? "Please wait" : "Live call"}
                </p>
              </div>
            </div>
            {isConnecting && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          </div>
          {isActive && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 ${isMuted ? "text-red-500 border-red-500/50" : ""}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={endCall}
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                End Call
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Status messages */}
      {status === "ended" && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 w-64 text-center animate-in fade-in duration-200">
          <p className="text-sm text-green-500 font-medium">Call ended</p>
          <p className="text-xs text-muted-foreground">Thank you for calling BPR!</p>
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 w-64 text-center animate-in fade-in duration-200">
          <p className="text-sm text-red-500 font-medium">Connection failed</p>
          <p className="text-xs text-muted-foreground">Please try again or call us directly.</p>
        </div>
      )}

      {/* Main FAB button */}
      {!isActive && !isConnecting && (
        <button
          onClick={() => isExpanded ? setIsExpanded(false) : setIsExpanded(true)}
          className="relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 bg-primary text-primary-foreground"
          aria-label="Talk to BPR AI Receptionist"
        >
          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-30" />
          <Phone className="h-6 w-6 relative z-10" />
        </button>
      )}
    </div>
  );
}
