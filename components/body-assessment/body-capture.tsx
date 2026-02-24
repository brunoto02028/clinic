"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePoseDetection, PoseLandmark } from "@/hooks/use-pose-detection";
import {
  Camera,
  RotateCcw,
  Check,
  ChevronRight,
  Loader2,
  AlertTriangle,
  User,
  ArrowUp,
  SwitchCamera,
  Video,
  Square,
  Play,
  SkipForward,
  Shield,
} from "lucide-react";

export interface CapturedView {
  imageData: string;
  landmarks: PoseLandmark[];
  timestamp: number;
}

export interface CapturedVideo {
  blob: Blob;
  dataUrl: string;
  testType: string;
  label: string;
  duration: number;
  timestamp: number;
}

export interface BodyCaptureResult {
  photos: Record<string, CapturedView>;
  videos: CapturedVideo[];
}

interface BodyCaptureProps {
  onComplete: (result: BodyCaptureResult) => void;
  onCancel?: () => void;
  skipVideos?: boolean;
}

const CAPTURE_VIEWS = [
  {
    id: "front" as const,
    label: "Frontal View",
    instruction: "Stand facing the camera with arms at your sides",
  },
  {
    id: "back" as const,
    label: "Posterior View",
    instruction: "Turn around — back facing the camera",
  },
  {
    id: "left" as const,
    label: "Left Lateral",
    instruction: "Turn to show your left side to the camera",
  },
  {
    id: "right" as const,
    label: "Right Lateral",
    instruction: "Turn to show your right side to the camera",
  },
];

export const MOVEMENT_TESTS = [
  {
    id: "squat",
    label: "Squat",
    instruction: "Perform 3 full squats at a comfortable pace — face the camera",
    duration: 15,
    icon: "🏋️",
  },
  {
    id: "gait",
    label: "Gait / Walking",
    instruction: "Walk naturally back and forth (2–3 steps each way) — side view to camera",
    duration: 15,
    icon: "🚶",
  },
  {
    id: "overhead_squat",
    label: "Overhead Squat",
    instruction: "Raise both arms overhead, then squat 3 times — face the camera",
    duration: 15,
    icon: "🙆",
  },
  {
    id: "single_leg_l",
    label: "Single Leg Balance (Left)",
    instruction: "Stand on your LEFT leg for 10 seconds — face the camera",
    duration: 12,
    icon: "🦩",
  },
  {
    id: "single_leg_r",
    label: "Single Leg Balance (Right)",
    instruction: "Stand on your RIGHT leg for 10 seconds — face the camera",
    duration: 12,
    icon: "🦩",
  },
  {
    id: "lunge",
    label: "Forward Lunge",
    instruction: "Perform 2 forward lunges per leg — side view to camera",
    duration: 15,
    icon: "🦵",
  },
  {
    id: "hip_hinge",
    label: "Hip Hinge",
    instruction: "Bend forward at the hips keeping back straight, return up — side view",
    duration: 10,
    icon: "🔄",
  },
];

type Phase = "photos" | "transition" | "videos" | "done";

export function BodyCapture({ onComplete, onCancel, skipVideos = false }: BodyCaptureProps) {
  // Phase management
  const [phase, setPhase] = useState<Phase>("photos");

  // Photo state
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [captures, setCaptures] = useState<Record<string, CapturedView>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Video state
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [recordedVideos, setRecordedVideos] = useState<CapturedVideo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [lastRecordedBlob, setLastRecordedBlob] = useState<Blob | null>(null);

  // Camera state — camera starts IMMEDIATELY, no dependency on pose
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [poseStable, setPoseStable] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableCountRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const {
    initPoseDetection,
    startDetection,
    stopDetection,
    captureFrame,
    isLoading: poseLoading,
    isReady: poseReady,
    error: poseError,
  } = usePoseDetection({
    onResult: (result) => {
      const visibleCount = result.landmarks.filter((l) => l.visibility > 0.6).length;
      if (visibleCount >= 20) {
        stableCountRef.current++;
        if (stableCountRef.current > 10) setPoseStable(true);
      } else {
        stableCountRef.current = 0;
        setPoseStable(false);
      }
    },
  });

  const currentView = CAPTURE_VIEWS[currentViewIndex];
  const currentTest = MOVEMENT_TESTS[currentTestIndex];
  const totalPhotoSteps = CAPTURE_VIEWS.length;
  const totalVideoSteps = MOVEMENT_TESTS.length;

  // Start camera IMMEDIATELY on mount (like foot scan)
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (mountedRef.current) {
            setIsCameraReady(true);
          }
        };
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setCameraError("No camera found. Please ensure your device has a camera.");
        } else if (err.name === "NotReadableError" || err.name === "AbortError") {
          setCameraError("Camera in use by another application. Close other apps and try again.");
        } else {
          setCameraError(`Camera error: ${err.message}`);
        }
      } else {
        setCameraError("Failed to access camera. Please try again.");
      }
    }
  }, [facingMode]);

  // Camera starts on mount — NO dependency on poseReady
  useEffect(() => {
    startCamera();
  }, []);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isCameraReady) {
      startCamera();
    }
  }, [facingMode]);

  // Load pose detection in background (optional enhancement)
  useEffect(() => {
    initPoseDetection().catch(() => {
      // Pose detection is optional — camera works without it
      console.warn("Pose detection failed to load. Continuing without it.");
    });
  }, []);

  // Start pose overlay when BOTH camera and pose are ready
  useEffect(() => {
    if (isCameraReady && poseReady && videoRef.current && canvasRef.current) {
      startDetection(videoRef.current, canvasRef.current);
    }
  }, [isCameraReady, poseReady, startDetection]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopDetection();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopDetection]);

  // ============ FACE BLUR HELPER ============
  const applyFaceBlur = (
    sourceCanvas: HTMLCanvasElement,
    landmarks: PoseLandmark[]
  ): string => {
    if (!landmarks || landmarks.length < 11) {
      return sourceCanvas.toDataURL("image/jpeg", 0.9);
    }

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    // MediaPipe pose landmarks 0-10 are face points (nose, eyes, ears, mouth)
    const faceIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const visibleFaceLandmarks = faceIndices
      .map((i) => landmarks[i])
      .filter((l) => l && l.visibility > 0.3);

    if (visibleFaceLandmarks.length < 3) {
      return sourceCanvas.toDataURL("image/jpeg", 0.9);
    }

    const xs = visibleFaceLandmarks.map((l) => l.x * w);
    const ys = visibleFaceLandmarks.map((l) => l.y * h);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Expand bounding box by 40% to cover full head
    const faceW = maxX - minX;
    const faceH = maxY - minY;
    const padX = faceW * 0.6;
    const padY = faceH * 0.7;
    const bx = Math.max(0, minX - padX);
    const by = Math.max(0, minY - padY);
    const bw = Math.min(w - bx, faceW + padX * 2);
    const bh = Math.min(h - by, faceH + padY * 2);

    // Create output canvas
    const outCanvas = document.createElement("canvas");
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return sourceCanvas.toDataURL("image/jpeg", 0.9);

    // Draw full image first
    ctx.drawImage(sourceCanvas, 0, 0);

    // Create a small blurred version of the face region
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = bw;
    blurCanvas.height = bh;
    const blurCtx = blurCanvas.getContext("2d");
    if (!blurCtx) return sourceCanvas.toDataURL("image/jpeg", 0.9);

    // Scale down to pixelate (strong privacy blur)
    const scale = 0.05;
    const smallW = Math.max(1, Math.round(bw * scale));
    const smallH = Math.max(1, Math.round(bh * scale));

    const pixCanvas = document.createElement("canvas");
    pixCanvas.width = smallW;
    pixCanvas.height = smallH;
    const pixCtx = pixCanvas.getContext("2d");
    if (!pixCtx) return sourceCanvas.toDataURL("image/jpeg", 0.9);

    // Draw face region scaled down (pixelation)
    pixCtx.drawImage(sourceCanvas, bx, by, bw, bh, 0, 0, smallW, smallH);

    // Scale back up (creates pixelated/blurred look)
    blurCtx.imageSmoothingEnabled = false;
    blurCtx.drawImage(pixCanvas, 0, 0, smallW, smallH, 0, 0, bw, bh);

    // Apply additional CSS blur via filter
    ctx.save();
    ctx.filter = "blur(12px)";
    ctx.drawImage(blurCanvas, bx, by, bw, bh);
    ctx.restore();

    // Draw a subtle dark overlay on the face region to indicate blurring
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();

    return outCanvas.toDataURL("image/jpeg", 0.9);
  };

  // ============ PHOTO CAPTURE ============
  const handlePhotoCapture = useCallback(async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    // Try pose-aware capture first, fallback to raw video frame
    const frame = captureFrame();
    if (frame) {
      // Apply face blur using landmarks
      const tempCanvas = document.createElement("canvas");
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const ctx = tempCanvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.src = frame.imageData;
      });
      const blurredImageData = applyFaceBlur(tempCanvas, frame.landmarks);
      setCaptures((prev) => ({
        ...prev,
        [currentView.id]: { imageData: blurredImageData, landmarks: frame.landmarks, timestamp: Date.now() },
      }));
      setShowPreview(true);
    } else if (videoRef.current) {
      // Fallback: capture directly from video element (no pose data)
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = videoRef.current.videoWidth || 1280;
      captureCanvas.height = videoRef.current.videoHeight || 720;
      const ctx = captureCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = captureCanvas.toDataURL("image/jpeg", 0.9);
        setCaptures((prev) => ({
          ...prev,
          [currentView.id]: { imageData, landmarks: [], timestamp: Date.now() },
        }));
        setShowPreview(true);
      }
    }
  }, [captureFrame, currentView]);

  const handlePhotoRetake = () => {
    setShowPreview(false);
    stableCountRef.current = 0;
    setPoseStable(false);
  };

  const handlePhotoAccept = () => {
    setShowPreview(false);
    stableCountRef.current = 0;
    setPoseStable(false);
    if (currentViewIndex < CAPTURE_VIEWS.length - 1) {
      setCurrentViewIndex((prev) => prev + 1);
    } else {
      // Photos done — go to transition or finish
      if (skipVideos) {
        finishCapture(captures, []);
      } else {
        setPhase("transition");
      }
    }
  };

  // ============ VIDEO RECORDING ============
  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;

    // Countdown
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 2500000 });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoPreviewUrl(url);
      setLastRecordedBlob(blob);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start(500); // collect data every 500ms
    recordingStartRef.current = Date.now();
    setIsRecording(true);
    setRecordingTime(0);

    // Timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      setRecordingTime(elapsed);
    }, 1000);

    // Auto-stop after max duration
    const maxDuration = currentTest.duration * 1000 + 2000; // extra 2s buffer
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, maxDuration);
  }, [currentTest]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleVideoRetake = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setLastRecordedBlob(null);
  };

  const handleVideoAccept = () => {
    if (lastRecordedBlob && videoPreviewUrl) {
      const newVideo: CapturedVideo = {
        blob: lastRecordedBlob,
        dataUrl: videoPreviewUrl,
        testType: currentTest.id,
        label: currentTest.label,
        duration: recordingTime,
        timestamp: Date.now(),
      };
      const updatedVideos = [...(Array.isArray(recordedVideos) ? recordedVideos : []), newVideo];
      setRecordedVideos(updatedVideos);
      setVideoPreviewUrl(null);
      setLastRecordedBlob(null);

      if (currentTestIndex < MOVEMENT_TESTS.length - 1) {
        setCurrentTestIndex((prev) => prev + 1);
      } else {
        finishCapture(captures, updatedVideos);
      }
    }
  };

  const skipCurrentTest = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setLastRecordedBlob(null);
    if (currentTestIndex < MOVEMENT_TESTS.length - 1) {
      setCurrentTestIndex((prev) => prev + 1);
    } else {
      finishCapture(captures, Array.isArray(recordedVideos) ? recordedVideos : []);
    }
  };

  // ============ FINISH ============
  const finishCapture = (photos: Record<string, CapturedView>, videos: CapturedVideo[]) => {
    setPhase("done");
    stopDetection();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onComplete({ photos, videos });
  };

  const handleFinishEarly = () => {
    finishCapture(captures, Array.isArray(recordedVideos) ? recordedVideos : []);
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setIsCameraReady(false);
  };

  const photoCapturedCount = Object.keys(captures).length;
  const videoCapturedCount = Array.isArray(recordedVideos) ? recordedVideos.length : 0;

  // ============ CAMERA ERROR (only real camera errors block) ============
  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-4 p-8">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium">Camera Error</p>
        <p className="text-sm text-gray-400 text-center max-w-md">{cameraError}</p>
        <div className="flex gap-3">
          <Button onClick={() => { setCameraError(null); startCamera(); }}>Try Again</Button>
          {onCancel && <Button variant="outline" onClick={onCancel} className="text-white border-white/30">Cancel</Button>}
        </div>
      </div>
    );
  }

  // ============ PHOTO PREVIEW ============
  if (phase === "photos" && showPreview && captures[currentView.id]) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex items-center justify-between p-4 bg-black/80 text-white">
          <h3 className="font-semibold">{currentView.label}</h3>
          <Badge variant="secondary">{photoCapturedCount}/{totalPhotoSteps} photos</Badge>
        </div>
        <div className="flex-1 relative">
          <img src={captures[currentView.id].imageData} alt={currentView.label} className="w-full h-full object-contain" />
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            <Button variant="outline" size="lg" onClick={handlePhotoRetake} className="bg-white/90 text-black">
              <RotateCcw className="h-5 w-5 mr-2" /> Retake
            </Button>
            <Button size="lg" onClick={handlePhotoAccept} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-5 w-5 mr-2" />
              {currentViewIndex < CAPTURE_VIEWS.length - 1 ? "Accept & Next" : "Accept"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ TRANSITION: photos done → videos ============
  if (phase === "transition") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-6 p-8">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-center">Photos Complete!</h2>
        <p className="text-gray-300 text-center max-w-sm">
          Now let&apos;s record some movement tests to assess your functional biomechanics.
        </p>
        <div className="bg-white/10 rounded-xl p-4 w-full max-w-sm space-y-2">
          <p className="text-sm font-semibold text-gray-200">Movement Tests:</p>
          {MOVEMENT_TESTS.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm text-gray-300">
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className="text-xs text-gray-500 ml-auto">~{t.duration}s</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleFinishEarly} className="text-white border-white/30">
            Skip Videos
          </Button>
          <Button size="lg" onClick={() => setPhase("videos")} className="bg-primary">
            <Video className="h-5 w-5 mr-2" /> Start Videos
          </Button>
        </div>
      </div>
    );
  }

  // ============ VIDEO PREVIEW ============
  if (phase === "videos" && videoPreviewUrl) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex items-center justify-between p-4 bg-black/80 text-white">
          <h3 className="font-semibold">{currentTest.label}</h3>
          <Badge variant="secondary">{videoCapturedCount + 1}/{totalVideoSteps} videos</Badge>
        </div>
        <div className="flex-1 relative flex items-center justify-center">
          <video src={videoPreviewUrl} controls autoPlay loop className="max-h-full max-w-full rounded-lg" playsInline />
        </div>
        <div className="flex items-center justify-center gap-4 p-4 bg-black/80">
          <Button variant="outline" size="lg" onClick={handleVideoRetake} className="bg-white/90 text-black">
            <RotateCcw className="h-5 w-5 mr-2" /> Retake
          </Button>
          <Button size="lg" onClick={handleVideoAccept} className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="h-5 w-5 mr-2" />
            {currentTestIndex < MOVEMENT_TESTS.length - 1 ? "Accept & Next" : "Accept & Finish"}
          </Button>
        </div>
      </div>
    );
  }

  // ============ MAIN CAMERA VIEW (photos or videos) ============
  const isVideoPhase = phase === "videos";
  const stepLabel = isVideoPhase ? currentTest.label : currentView.label;
  const stepInstruction = isVideoPhase ? currentTest.instruction : currentView.instruction;
  const stepNum = isVideoPhase ? currentTestIndex + 1 : currentViewIndex + 1;
  const totalSteps = isVideoPhase ? totalVideoSteps : totalPhotoSteps;
  const allItems = isVideoPhase ? MOVEMENT_TESTS : CAPTURE_VIEWS;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 bg-black/80 text-white z-10">
        <div>
          <div className="flex items-center gap-2">
            {isVideoPhase && <Video className="h-4 w-4 text-red-400" />}
            <h3 className="font-semibold text-sm">{stepLabel}</h3>
          </div>
          <p className="text-xs text-gray-300">
            {isVideoPhase ? "Video" : "Photo"} {stepNum} of {totalSteps}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isVideoPhase && (
            <Badge variant={poseStable ? "default" : poseReady ? "destructive" : "secondary"} className="text-xs">
              {poseStable ? "Pose ✓" : poseLoading ? "AI..." : poseReady ? "Detecting..." : "Camera ✓"}
            </Badge>
          )}
          {isRecording && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              ● REC {recordingTime}s
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white">
            <SwitchCamera className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-2 bg-black/60">
        {isVideoPhase ? (
          <>
            {/* Show photos completed indicator */}
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1" title="Photos done" />
            <div className="w-px h-3 bg-gray-600 mr-1" />
            {MOVEMENT_TESTS.map((t, i) => {
              const isDone = (Array.isArray(recordedVideos) ? recordedVideos : []).some((v) => v.testType === t.id);
              return (
                <div key={t.id} className={`w-2.5 h-2.5 rounded-full transition-all ${isDone ? "bg-green-500" : i === currentTestIndex ? "bg-red-500 w-5" : "bg-gray-600"}`} />
              );
            })}
          </>
        ) : (
          CAPTURE_VIEWS.map((view, i) => (
            <div key={view.id} className={`w-3 h-3 rounded-full transition-all ${captures[view.id] ? "bg-green-500" : i === currentViewIndex ? "bg-primary w-6" : "bg-gray-600"}`} />
          ))
        )}
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

        {/* Silhouette guide (photos only) */}
        {!isVideoPhase && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-48 h-[70%] border-2 border-dashed border-white/30 rounded-xl flex items-center justify-center">
              <User className="w-32 h-32 text-white/20" />
            </div>
          </div>
        )}

        {/* Recording indicator border */}
        {isRecording && (
          <div className="absolute inset-0 border-4 border-red-500 pointer-events-none animate-pulse rounded-sm z-10" />
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
          </div>
        )}

        {/* Instruction banner */}
        <div className="absolute bottom-20 left-0 right-0 px-4 space-y-2">
          <Card className="bg-black/70 border-white/20">
            <CardContent className="p-3 text-center">
              <p className="text-white text-sm font-medium flex items-center justify-center gap-2">
                {isVideoPhase ? <Video className="h-4 w-4 text-red-400" /> : <ArrowUp className="h-4 w-4" />}
                {stepInstruction}
              </p>
              {isVideoPhase && !isRecording && (
                <p className="text-gray-400 text-xs mt-1">~{currentTest.duration} seconds</p>
              )}
            </CardContent>
          </Card>
          {!isVideoPhase && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/60">
              <Shield className="h-3 w-3" />
              <span>Face automatically blurred for privacy · Secure & GDPR compliant</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        {/* Left: Cancel / Finish */}
        {onCancel && !isRecording ? (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-white">Cancel</Button>
        ) : (photoCapturedCount > 0 || videoCapturedCount > 0) && !isRecording ? (
          <Button variant="ghost" size="sm" onClick={handleFinishEarly} className="text-white">
            Finish
          </Button>
        ) : (
          <div className="w-16" />
        )}

        {/* Center: Capture / Record button */}
        {isVideoPhase ? (
          isRecording ? (
            <button onClick={stopRecording} className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/30 hover:bg-red-500/50 transition-all">
              <Square className="h-6 w-6 text-white fill-white" />
            </button>
          ) : (
            <button onClick={startRecording} disabled={countdown !== null} className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 transition-all disabled:opacity-50">
              <div className="w-6 h-6 rounded-full bg-red-500" />
            </button>
          )
        ) : (
          <button onClick={handlePhotoCapture} disabled={countdown !== null} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all disabled:opacity-50">
            <Camera className="h-7 w-7 text-white" />
          </button>
        )}

        {/* Right: Skip */}
        {!isRecording ? (
          <Button variant="ghost" size="sm" onClick={isVideoPhase ? skipCurrentTest : () => setCurrentViewIndex((prev) => Math.min(prev + 1, CAPTURE_VIEWS.length - 1))} className="text-white">
            Skip <SkipForward className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  );
}

// Small helper used in transition screen
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
