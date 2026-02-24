"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, Video, VideoOff, RotateCcw, CheckCircle, AlertCircle,
  Zap, Sun, Focus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analyzeImageQuality,
  quickBlurCheck,
  FOOT_OVERLAY_PATHS,
  type QualityResult,
} from "@/lib/scan-utils";

// ─── Types ───
export type CaptureMode = "photo" | "video";

interface CameraCaptureProps {
  angle: string;
  foot: "left" | "right";
  label: string;
  instruction: string;
  showOverlay: boolean;
  onCapture: (file: File, preview: string, quality: QualityResult) => void;
  onVideoFrames?: (frames: { file: File; preview: string }[]) => void;
  captureMode: CaptureMode;
  className?: string;
}

// ─── Component ───
export default function CameraCapture({
  angle,
  foot,
  label,
  instruction,
  showOverlay,
  onCapture,
  onVideoFrames,
  captureMode,
  className = "",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [qualityIndicator, setQualityIndicator] = useState<{
    blur: boolean; brightness: boolean;
  }>({ blur: true, brightness: true });
  const [processing, setProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const qualityCheckRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Start Camera ───
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Start real-time quality monitoring
      startQualityMonitor();
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : err.name === "NotFoundError"
            ? "No camera found on this device."
            : `Camera error: ${err.message}`
      );
    }
  }, [facingMode]);

  // ─── Stop Camera ───
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (qualityCheckRef.current) {
      clearInterval(qualityCheckRef.current);
    }
    setCameraActive(false);
  }, []);

  // ─── Flip Camera ───
  const flipCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  }, [stopCamera]);

  // Auto-restart camera when facing mode changes
  useEffect(() => {
    if (cameraActive || !cameraError) {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [stopCamera]);

  // ─── Real-time Quality Monitor ───
  const startQualityMonitor = () => {
    if (qualityCheckRef.current) clearInterval(qualityCheckRef.current);

    qualityCheckRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.videoWidth === 0) return;

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);

      const imageData = ctx.getImageData(0, 0, 160, 120);
      const data = imageData.data;

      // Quick brightness
      let sum = 0;
      for (let i = 0; i < data.length; i += 16) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgBrightness = sum / (data.length / 16);
      const brightOk = avgBrightness > 40 && avgBrightness < 220;

      // Quick blur
      const blurOk = quickBlurCheck(canvas, ctx);

      setQualityIndicator({ blur: blurOk, brightness: brightOk });
    }, 500);
  };

  // ─── Capture Photo ───
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture at full resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Quality check
    const quality = analyzeImageQuality(canvas, ctx);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${foot}-${angle}-${Date.now()}.jpg`, { type: "image/jpeg" });
      const preview = URL.createObjectURL(blob);
      onCapture(file, preview, quality);
    }, "image/jpeg", 0.92);
  }, [foot, angle, onCapture]);

  // ─── Video Recording ───
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const options = { mimeType: "video/webm;codecs=vp9" };
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch {
      try {
        recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      } catch {
        recorder = new MediaRecorder(streamRef.current);
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setProcessing(true);
      const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
      await extractFramesFromBlob(videoBlob);
      setProcessing(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // collect in 100ms chunks
    setIsRecording(true);
    setRecordingTime(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 30) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // ─── Extract Frames from Video Blob ───
  const extractFramesFromBlob = async (videoBlob: Blob) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => resolve();
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;

    const duration = video.duration;
    const targetFrames = 8;
    const step = duration / (targetFrames * 2); // oversample
    const allFrames: { file: File; preview: string; blurScore: number }[] = [];

    for (let t = 0.5; t < duration - 0.5; t += step) {
      await new Promise<void>((resolve) => {
        video.currentTime = t;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Quick quality check
          const blurOk = quickBlurCheck(canvas, ctx);
          if (!blurOk) { resolve(); return; }

          // Get blur score for ranking
          const smallCanvas = document.createElement("canvas");
          smallCanvas.width = 200;
          smallCanvas.height = 150;
          const sctx = smallCanvas.getContext("2d")!;
          sctx.drawImage(canvas, 0, 0, 200, 150);
          const imgData = sctx.getImageData(0, 0, 200, 150);
          const gray = new Float32Array(200 * 150);
          for (let i = 0; i < imgData.data.length; i += 4) {
            gray[i / 4] = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
          }
          let lapSum = 0, cnt = 0;
          for (let y = 1; y < 149; y++) {
            for (let x = 1; x < 199; x++) {
              const idx = y * 200 + x;
              const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - 200] + gray[idx + 200];
              lapSum += lap * lap;
              cnt++;
            }
          }
          const blurScore = lapSum / cnt;

          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `${foot}-${angle}-frame-${Math.round(t * 1000)}.jpg`, { type: "image/jpeg" });
              allFrames.push({ file, preview: URL.createObjectURL(blob), blurScore });
            }
            resolve();
          }, "image/jpeg", 0.90);
        };
      });
    }

    URL.revokeObjectURL(video.src);

    // Pick the best frames
    allFrames.sort((a, b) => b.blurScore - a.blurScore);
    const best = allFrames.slice(0, 5).sort((a, b) =>
      parseInt(a.file.name.split("frame-")[1]) - parseInt(b.file.name.split("frame-")[1])
    );

    if (onVideoFrames) {
      onVideoFrames(best.map(f => ({ file: f.file, preview: f.preview })));
    }
  };

  // ─── AR Overlay ───
  const overlayData = FOOT_OVERLAY_PATHS[angle];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Camera viewport */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4]">
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
            <Camera className="h-12 w-12 mb-3" />
            <Button onClick={startCamera} variant="secondary" className="gap-2">
              <Camera className="h-4 w-4" /> Open Camera
            </Button>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-300 text-sm">{cameraError}</p>
            <Button onClick={startCamera} variant="secondary" size="sm" className="mt-3 gap-1">
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: cameraActive ? "block" : "none" }}
        />

        {/* AR Overlay */}
        {cameraActive && showOverlay && overlayData && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox={overlayData.viewBox}
              className="w-3/4 h-3/4 opacity-40"
              style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }}
            >
              <path
                d={overlayData.path}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray="8 4"
              />
            </svg>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/80 text-[10px] bg-black/40 inline-block px-3 py-1 rounded-full">
                {overlayData.guide}
              </p>
            </div>
          </div>
        )}

        {/* Quality indicators */}
        {cameraActive && (
          <div className="absolute top-3 left-3 flex gap-1.5">
            <Badge className={`text-[9px] gap-1 ${qualityIndicator.brightness ? "bg-green-600" : "bg-red-600"}`}>
              <Sun className="h-2.5 w-2.5" /> {qualityIndicator.brightness ? "OK" : "Low"}
            </Badge>
            <Badge className={`text-[9px] gap-1 ${qualityIndicator.blur ? "bg-green-600" : "bg-amber-600"}`}>
              <Focus className="h-2.5 w-2.5" /> {qualityIndicator.blur ? "Sharp" : "Blurry"}
            </Badge>
          </div>
        )}

        {/* Prominent low-light warning */}
        {cameraActive && !qualityIndicator.brightness && (
          <div className="absolute bottom-14 left-2 right-2 z-10 animate-pulse">
            <div className="bg-red-600/90 text-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
              <Sun className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold">Low Light Detected</p>
                <p className="text-[10px] opacity-90">Move to a brighter area or turn on a light for better results.</p>
              </div>
            </div>
          </div>
        )}

        {/* Blurry image warning */}
        {cameraActive && qualityIndicator.brightness && !qualityIndicator.blur && (
          <div className="absolute bottom-14 left-2 right-2 z-10">
            <div className="bg-amber-500/90 text-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
              <Focus className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold">Image is Blurry</p>
                <p className="text-[10px] opacity-90">Hold your phone steady and wait for the image to sharpen.</p>
              </div>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono bg-black/50 px-2 py-0.5 rounded">
              {recordingTime}s / 30s
            </span>
          </div>
        )}

        {/* Flip camera button */}
        {cameraActive && (
          <button
            onClick={flipCamera}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3" />
            <p className="text-sm">Extracting best frames...</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture controls */}
      {cameraActive && !processing && (
        <div className="flex gap-2">
          {captureMode === "photo" ? (
            <Button
              className={`flex-1 gap-2 h-14 text-base ${!qualityIndicator.brightness ? "bg-amber-600 hover:bg-amber-700" : !qualityIndicator.blur ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              onClick={capturePhoto}
            >
              <Camera className="h-5 w-5" />
              {!qualityIndicator.brightness ? "Capture Anyway (Low Light)" :
               !qualityIndicator.blur ? "Capture Anyway (Blurry)" : "Capture Photo"}
            </Button>
          ) : (
            <Button
              className={`flex-1 gap-2 h-14 text-base ${isRecording ? "bg-red-600 hover:bg-red-700" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <><VideoOff className="h-5 w-5" /> Stop Recording</>
              ) : (
                <><Video className="h-5 w-5" /> Start Recording</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Instruction */}
      <p className="text-xs text-muted-foreground text-center">{instruction}</p>
    </div>
  );
}
